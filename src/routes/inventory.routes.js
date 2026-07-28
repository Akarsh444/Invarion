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

router.get('/product/:productId', getInventory);
router.put('/product/:productId', authenticate, requireAdmin, updateStockValidation, validate, updateStock);
router.post('/product/:productId/add', authenticate, requireAdmin, addStockValidation, validate, addStock);
router.get('/low-stock', authenticate, requireAdmin, getLowStock);

module.exports = router;