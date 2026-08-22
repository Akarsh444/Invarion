const prisma = require('../config/db');
const { updateOrderStatus } = require('./order.service');

// How long a PENDING order may hold reserved stock before being auto-cancelled.
// Real systems do this (BookMyShow's countdown, Amazon's cart holds) because
// otherwise an abandoned or malicious order holds inventory forever.
const RESERVATION_TTL_MINUTES = Number(process.env.RESERVATION_TTL_MINUTES) || 15;
const SWEEP_INTERVAL_MS = Number(process.env.SWEEP_INTERVAL_MS) || 60_000;

// Finds expired PENDING orders and cancels them, releasing their reserved stock.
// Reuses updateOrderStatus so the state machine and inventory side effects
// stay in exactly one place rather than being duplicated here.
async function sweepExpiredReservations() {
  const cutoff = new Date(Date.now() - RESERVATION_TTL_MINUTES * 60 * 1000);

  try {
    const expired = await prisma.order.findMany({
      where: { status: 'PENDING', createdAt: { lt: cutoff } },
      select: { id: true },
    });

    if (expired.length === 0) return;

    console.log(`Sweeper: cancelling ${expired.length} expired reservation(s)`);

    for (const { id } of expired) {
      try {
        await updateOrderStatus(id, 'CANCELLED');
      } catch (err) {
        // One bad order shouldn't stop the rest of the sweep
        console.error(`Sweeper: failed to cancel order ${id}:`, err.message);
      }
    }
  } catch (error) {
    console.error('Sweeper error:', error);
  }
}

function startReservationSweeper() {
  console.log(
    `Reservation sweeper active (TTL ${RESERVATION_TTL_MINUTES}m, interval ${SWEEP_INTERVAL_MS}ms)`
  );
  // Run once on boot to clean anything left over from a previous run
  sweepExpiredReservations();
  setInterval(sweepExpiredReservations, SWEEP_INTERVAL_MS);
}

module.exports = { startReservationSweeper, sweepExpiredReservations };