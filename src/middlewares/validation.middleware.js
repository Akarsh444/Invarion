const { validationResult } = require('express-validator');

// Runs after validation rules, checks if any failed
// If failed, returns 400 with all error messages
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
}

module.exports = validate;