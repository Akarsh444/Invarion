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

// Public routes - cached for 5 minutes (300 seconds)
router.get('/', cacheMiddleware(300), getAllProducts);
router.get('/:id', cacheMiddleware(300), getProductById);

// Protected routes - no caching needed (writes)
router.post('/', authenticate, requireAdmin, createProductValidation, validate, createProduct);
router.put('/:id', authenticate, requireAdmin, updateProductValidation, validate, updateProduct);
router.delete('/:id', authenticate, requireAdmin, deleteProduct);

module.exports = router;