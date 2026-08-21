// Seeds demo data so the deployed app isn't empty.
// Safe to run repeatedly — uses upserts and skips existing records.
// Run with: node scripts/seed.js
require('dotenv').config();
const prisma = require('../src/config/db');
const { hashPassword } = require('../src/utils/password');

const DEMO_ADMIN = { email: 'admin@invarion.demo', password: 'DemoAdmin123', role: 'ADMIN' };
const DEMO_CUSTOMER = { email: 'customer@invarion.demo', password: 'DemoUser123', role: 'CUSTOMER' };

// Varied stock levels so the UI shows in-stock, low-stock, and sold-out states
const PRODUCTS = [
  { name: 'Mechanical Keyboard', description: 'Hot-swappable, 75% layout', price: 8999, stock: 24 },
  { name: 'Noise Cancelling Headphones', description: 'Over-ear, 40h battery', price: 24999, stock: 12 },
  { name: '4K Monitor 27"', description: 'IPS panel, 144Hz, USB-C', price: 42999, stock: 5 },
  { name: 'Ergonomic Chair', description: 'Lumbar support, mesh back', price: 18499, stock: 3 },
  { name: 'Limited Edition Mousepad', description: 'Deliberately scarce — try ordering the last one', price: 1499, stock: 1 },
  { name: 'Standing Desk', description: 'Electric height adjustment', price: 34999, stock: 0 },
];

async function seedUser({ email, password, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`  user exists: ${email}`);
    return existing;
  }
  const user = await prisma.user.create({
    data: { email, password: await hashPassword(password), role },
  });
  console.log(`  created user: ${email} (${role})`);
  return user;
}

async function seedProduct({ name, description, price, stock }) {
  const existing = await prisma.product.findFirst({ where: { name } });
  if (existing) {
    console.log(`  product exists: ${name}`);
    return existing;
  }
  const product = await prisma.$transaction(async (tx) => {
    const p = await tx.product.create({ data: { name, description, price } });
    await tx.inventory.create({
      data: { productId: p.id, quantity: stock, reserved: 0 },
    });
    return p;
  });
  console.log(`  created product: ${name} (stock ${stock})`);
  return product;
}

async function main() {
  console.log('Seeding demo data...');

  console.log('Users:');
  const admin = await seedUser(DEMO_ADMIN);
  const customer = await seedUser(DEMO_CUSTOMER);

  console.log('Products:');
  const products = [];
  for (const p of PRODUCTS) {
    products.push(await seedProduct(p));
  }

  // A couple of historical orders so the orders panel isn't empty,
  // shown in different states to demonstrate the state machine
  console.log('Orders:');
  const existingOrders = await prisma.order.count({ where: { userId: customer.id } });
  if (existingOrders > 0) {
    console.log('  demo orders already exist');
  } else {
    const keyboard = products[0];
    const headphones = products[1];

    // A delivered order — stock already deducted at confirmation
    await prisma.$transaction(async (tx) => {
      await tx.order.create({
        data: {
          userId: customer.id,
          idempotencyKey: `seed-delivered-${Date.now()}`,
          status: 'DELIVERED',
          total: Number(keyboard.price),
          items: { create: [{ productId: keyboard.id, quantity: 1, price: keyboard.price }] },
        },
      });
      await tx.inventory.update({
        where: { productId: keyboard.id },
        data: { quantity: { decrement: 1 }, version: { increment: 1 } },
      });
    });
    console.log('  created DELIVERED order');

    // A pending order — stock reserved but not yet deducted
    await prisma.$transaction(async (tx) => {
      await tx.order.create({
        data: {
          userId: customer.id,
          idempotencyKey: `seed-pending-${Date.now()}`,
          status: 'PENDING',
          total: Number(headphones.price),
          items: { create: [{ productId: headphones.id, quantity: 1, price: headphones.price }] },
        },
      });
      await tx.inventory.update({
        where: { productId: headphones.id },
        data: { reserved: { increment: 1 }, version: { increment: 1 } },
      });
    });
    console.log('  created PENDING order (stock reserved, not deducted)');
  }

  console.log('\nDone. Demo credentials:');
  console.log(`  admin:    ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password}`);
  console.log(`  customer: ${DEMO_CUSTOMER.email} / ${DEMO_CUSTOMER.password}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});