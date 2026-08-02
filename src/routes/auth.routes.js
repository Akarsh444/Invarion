const express = require('express');
const { register, login } = require('../controllers/auth.controller');
const validate = require('../middlewares/validation.middleware');
const { registerValidation, loginValidation } = require('../middlewares/validators');
const { authLimiter } = require('../middlewares/rateLimit.middleware');
const router = express.Router();

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);

module.exports = router;