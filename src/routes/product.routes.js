const express = require('express');
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require('../controllers/product.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const { createProductValidation, updateProductValidation } = require('../middlewares/validators');
const { cacheMiddleware } = require('../middlewares/cache.middleware');

const router = express.Router();

/**
 * @openapi
 * /products:
 *   get:
 *     summary: List all products (public, cached)
 *     tags: [Products]
 *     responses:
 *       200: { description: Array of products with inventory }
 */
router.get('/', cacheMiddleware(300), getAllProducts);

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     summary: Get a single product by ID (public, cached)
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Product with inventory }
 *       404: { description: Product not found }
 */
router.get('/:id', cacheMiddleware(300), getProductById);

/**
 * @openapi
 * /products:
 *   post:
 *     summary: Create a product (ADMIN only)
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price]
 *             properties:
 *               name: { type: string, example: Laptop }
 *               description: { type: string, example: High-performance laptop }
 *               price: { type: number, example: 75000 }
 *               initialStock: { type: integer, example: 10 }
 *     responses:
 *       201: { description: Product created }
 *       401: { description: No token provided }
 *       403: { description: Admin access required }
 */
router.post('/', authenticate, requireAdmin, createProductValidation, validate, createProduct);

/**
 * @openapi
 * /products/{id}:
 *   put:
 *     summary: Update a product (ADMIN only)
 *     tags: [Products]
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
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               price: { type: number, example: 72000 }
 *     responses:
 *       200: { description: Product updated }
 *       404: { description: Product not found }
 */
router.put('/:id', authenticate, requireAdmin, updateProductValidation, validate, updateProduct);

/**
 * @openapi
 * /products/{id}:
 *   delete:
 *     summary: Delete a product (ADMIN only)
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Product deleted }
 *       404: { description: Product not found }
 */
router.delete('/:id', authenticate, requireAdmin, deleteProduct);

module.exports = router;