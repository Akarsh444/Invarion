const { body } = require('express-validator');

// Rules for user registration
const registerValidation = [
  body('email')
    .isEmail().withMessage('Must be a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/\d/).withMessage('Password must contain a number')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter'),
  body('role')
    .optional()
    .isIn(['ADMIN', 'CUSTOMER']).withMessage('Role must be ADMIN or CUSTOMER'),
  body('adminSecret').optional().isString(),
];

// Rules for login
const loginValidation = [
  body('email').isEmail().withMessage('Must be a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Rules for creating a product
const createProductValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('Name must be 1-200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 }).withMessage('Description too long'),
  body('price')
    .isFloat({ min: 0.01 }).withMessage('Price must be a positive number'),
  body('initialStock')
    .optional()
    .isInt({ min: 0 }).withMessage('Initial stock must be a non-negative integer'),
];

// Rules for updating a product (all fields optional since it's a partial update)
const updateProductValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('Name must be 1-200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 }).withMessage('Description too long'),
  body('price')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Price must be a positive number'),
];

// Rules for stock updates
const updateStockValidation = [
  body('quantity')
    .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
];

const addStockValidation = [
  body('amount')
    .isInt({ min: 1 }).withMessage('Amount must be a positive integer'),
];

const createOrderValidation = [
  body('idempotencyKey')
    .isString().withMessage('idempotencyKey is required')
    .isLength({ min: 10 }).withMessage('idempotencyKey must be a reasonably unique string'),
  body('items')
    .isArray({ min: 1 }).withMessage('items must be a non-empty array'),
  body('items.*.productId')
    .isString().withMessage('Each item needs a productId'),
  body('items.*.quantity')
    .isInt({ min: 1 }).withMessage('Each item quantity must be a positive integer'),
];

const updateOrderStatusValidation = [
  body('status')
    .isIn(['CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
    .withMessage('Invalid status value'),
];

module.exports = {
  registerValidation,
  loginValidation,
  createProductValidation,
  updateProductValidation,
  updateStockValidation,
  addStockValidation,
  createOrderValidation,
  updateOrderStatusValidation,
};