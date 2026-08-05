const express = require('express');
const { create, getOrderById, getMyOrders, updateStatus } = require('../controllers/order.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const { createOrderValidation, updateOrderStatusValidation } = require('../middlewares/validators');

const router = express.Router();

/**
 * @openapi
 * /orders:
 *   post:
 *     summary: Create an order (reserves stock via distributed lock, idempotent)
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idempotencyKey, items]
 *             properties:
 *               idempotencyKey: { type: string, example: order-attempt-abc123 }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId: { type: string }
 *                     quantity: { type: integer, example: 1 }
 *     responses:
 *       201: { description: Order created, stock reserved (status PENDING) }
 *       200: { description: Duplicate idempotency key, existing order returned }
 *       409: { description: Insufficient stock or lock timeout }
 *       404: { description: Product not found }
 */
router.post('/', authenticate, createOrderValidation, validate, create);

/**
 * @openapi
 * /orders/my:
 *   get:
 *     summary: List the authenticated user's own orders
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Array of the user's orders }
 */
router.get('/my', authenticate, getMyOrders);

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     summary: Get a single order (owner or ADMIN only)
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Order with items }
 *       403: { description: Not authorized to view this order }
 *       404: { description: Order not found }
 */
router.get('/:id', authenticate, getOrderById);

/**
 * @openapi
 * /orders/{id}/status:
 *   patch:
 *     summary: Advance order status (ADMIN only, state-machine enforced)
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [CONFIRMED, SHIPPED, DELIVERED, CANCELLED] }
 *     responses:
 *       200: { description: Order status updated }
 *       400: { description: Invalid status transition }
 *       404: { description: Order not found }
 */
router.patch('/:id/status', authenticate, requireAdmin, updateOrderStatusValidation, validate, updateStatus);

module.exports = router;