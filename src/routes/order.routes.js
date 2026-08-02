const express = require('express');
const { create, getOrderById, getMyOrders, updateStatus } = require('../controllers/order.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const { createOrderValidation, updateOrderStatusValidation } = require('../middlewares/validators');

const router = express.Router();

router.post('/', authenticate, createOrderValidation, validate, create);
router.get('/my', authenticate, getMyOrders);
router.get('/:id', authenticate, getOrderById);
router.patch('/:id/status', authenticate, requireAdmin, updateOrderStatusValidation, validate, updateStatus);

module.exports = router;