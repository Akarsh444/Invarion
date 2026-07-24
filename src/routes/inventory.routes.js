const express = require('express');
const {
  getInventory,
  updateStock,
  addStock,
  getLowStock,
} = require('../controllers/inventory.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public route - anyone can check stock
router.get('/product/:productId', getInventory);

// ADMIN only routes
router.put('/product/:productId', authenticate, requireAdmin, updateStock);
router.post('/product/:productId/add', authenticate, requireAdmin, addStock);
router.get('/low-stock', authenticate, requireAdmin, getLowStock);

module.exports = router;