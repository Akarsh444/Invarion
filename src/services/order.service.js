const prisma = require('../config/db');
const { acquireLock, releaseLock } = require('../utils/lock');

// The order state machine - defines which transitions are legal
const ALLOWED_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

// Creates an order with stock reservation, safe against concurrent overselling
async function createOrder({ userId, items, idempotencyKey }) {
  // 1. Idempotency check FIRST, before any locking or writes.
  // If this exact request was already processed, just return that same order.
  const existingOrder = await prisma.order.findUnique({
    where: { idempotencyKey },
    include: { items: true },
  });
  if (existingOrder) {
    return { order: existingOrder, isNew: false };
  }

  // 2. Sort productIds before locking - prevents deadlocks.
  // If two orders lock [A, B] and [B, A] simultaneously they can wait on each other forever.
  // Always locking in the same sorted order eliminates that.
  const sortedProductIds = [...new Set(items.map((i) => i.productId))].sort();
  const locks = [];

  try {
    // 3. Acquire a lock for every product involved
    for (const productId of sortedProductIds) {
      const lockKey = `lock:product:${productId}`;
      const token = await acquireLock(lockKey);
      if (!token) throw new Error(`LOCK_TIMEOUT:${productId}`);
      locks.push({ key: lockKey, token });
    }

    // 4. Now that we hold every lock, re-read FRESH inventory and validate stock
    const inventories = await prisma.inventory.findMany({
      where: { productId: { in: sortedProductIds } },
      include: { product: true },
    });
    const inventoryMap = new Map(inventories.map((inv) => [inv.productId, inv]));

    for (const item of items) {
      const inv = inventoryMap.get(item.productId);
      if (!inv) throw new Error(`PRODUCT_NOT_FOUND:${item.productId}`);
      const available = inv.quantity - inv.reserved;
      if (available < item.quantity) {
        throw new Error(`INSUFFICIENT_STOCK:${item.productId}:${available}`);
      }
    }

    // 5. All checks passed - create order + reserve stock atomically
    const total = items.reduce((sum, item) => {
      const inv = inventoryMap.get(item.productId);
      return sum + Number(inv.product.price) * item.quantity;
    }, 0);

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          idempotencyKey,
          status: 'PENDING',
          total,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: inventoryMap.get(item.productId).product.price,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of items) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            reserved: { increment: item.quantity }, // lock stock, don't deduct yet
            version: { increment: 1 },
          },
        });
      }

      return newOrder;
    });

    return { order, isNew: true };
  } finally {
    // 6. ALWAYS release every lock we grabbed, success or failure
    for (const lock of locks) {
      await releaseLock(lock.key, lock.token);
    }
  }
}

// Moves an order to a new status, applying the correct inventory side effects
async function updateOrderStatus(orderId, newStatus) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new Error('ORDER_NOT_FOUND');

  const allowed = ALLOWED_TRANSITIONS[order.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`INVALID_TRANSITION:${order.status}:${newStatus}`);
  }

  return prisma.$transaction(async (tx) => {
    // CONFIRMED: stock is actually deducted now (reserved becomes permanent)
    if (newStatus === 'CONFIRMED') {
      for (const item of order.items) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            quantity: { decrement: item.quantity },
            reserved: { decrement: item.quantity },
            version: { increment: 1 },
          },
        });
      }
    }

    // CANCELLED from PENDING: release the reservation, nothing was deducted yet
    if (newStatus === 'CANCELLED' && order.status === 'PENDING') {
      for (const item of order.items) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            reserved: { decrement: item.quantity },
            version: { increment: 1 },
          },
        });
      }
    }

    return tx.order.update({
      where: { id: orderId },
      data: { status: newStatus },
      include: { items: true },
    });
  });
}

module.exports = { createOrder, updateOrderStatus, ALLOWED_TRANSITIONS };