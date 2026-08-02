const prisma = require('../config/db');
const { createOrder, updateOrderStatus } = require('../services/order.service');

async function create(req, res) {
  try {
    const { items, idempotencyKey } = req.body;
    const userId = req.user.userId;

    const { order, isNew } = await createOrder({ userId, items, idempotencyKey });
    res.status(isNew ? 201 : 200).json(order); // 200 if it was an idempotent replay
  } catch (error) {
    const msg = error.message || '';
    if (msg.startsWith('LOCK_TIMEOUT')) {
      return res.status(409).json({ error: 'System busy, please try again', details: msg });
    }
    if (msg.startsWith('PRODUCT_NOT_FOUND')) {
      return res.status(404).json({ error: 'Product not found', details: msg });
    }
    if (msg.startsWith('INSUFFICIENT_STOCK')) {
      return res.status(409).json({ error: 'Insufficient stock', details: msg });
    }
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
}

async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Owner or ADMIN only
    if (order.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized to view this order' });
    }
    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
}

async function getMyOrders(req, res) {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
}

async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await updateOrderStatus(id, status);
    res.json(order);
  } catch (error) {
    const msg = error.message || '';
    if (msg === 'ORDER_NOT_FOUND') return res.status(404).json({ error: 'Order not found' });
    if (msg.startsWith('INVALID_TRANSITION')) {
      return res.status(400).json({ error: 'Invalid status transition', details: msg });
    }
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
}

module.exports = { create, getOrderById, getMyOrders, updateStatus };