const express = require('express');
const {
  getInventory,
  updateStock,
  addStock,
  getLowStock,
} = require('../controllers/inventory.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const { updateStockValidation, addStockValidation } = require('../middlewares/validators');

const router = express.Router();

/**
 * @openapi
 * /inventory/product/{productId}:
 *   get:
 *     summary: Get inventory for a product (public)
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Inventory with calculated available stock }
 *       404: { description: Inventory not found }
 */
router.get('/product/:productId', getInventory);

/**
 * @openapi
 * /inventory/product/{productId}:
 *   put:
 *     summary: Set stock to an absolute value (ADMIN only)
 *     tags: [Inventory]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity: { type: integer, example: 50 }
 *     responses:
 *       200: { description: Stock updated }
 */
router.put('/product/:productId', authenticate, requireAdmin, updateStockValidation, validate, updateStock);

/**
 * @openapi
 * /inventory/product/{productId}/add:
 *   post:
 *     summary: Increment existing stock (ADMIN only)
 *     tags: [Inventory]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: integer, example: 20 }
 *     responses:
 *       200: { description: Stock added }
 */
router.post('/product/:productId/add', authenticate, requireAdmin, addStockValidation, validate, addStock);

/**
 * @openapi
 * /inventory/low-stock:
 *   get:
 *     summary: List products below a stock threshold (ADMIN only)
 *     tags: [Inventory]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema: { type: integer, example: 10 }
 *     responses:
 *       200: { description: Array of low-stock inventories }
 */
router.get('/low-stock', authenticate, requireAdmin, getLowStock);

module.exports = router;