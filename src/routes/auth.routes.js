const express = require('express');
const { register, login } = require('../controllers/auth.controller');
const validate = require('../middlewares/validation.middleware');
const { registerValidation, loginValidation } = require('../middlewares/validators');
const { authLimiter } = require('../middlewares/rateLimit.middleware');
const router = express.Router();


/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: user@example.com }
 *               password: { type: string, example: SecurePass123 }
 *               role: { type: string, enum: [ADMIN, CUSTOMER], example: CUSTOMER }
 *     responses:
 *       201: { description: User created, returns user object and JWT token }
 *       400: { description: Validation failed or email already registered }
 */
router.post('/register', registerValidation, validate, register);


/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in an existing user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: admin@example.com }
 *               password: { type: string, example: admin123 }
 *     responses:
 *       200: { description: Login successful, returns user object and JWT token }
 *       401: { description: Invalid credentials }
 */
router.post('/login', loginValidation, validate, login);

module.exports = router;