const jwt = require('jsonwebtoken');

// Create a JWT token with user info
// Expires in 7 days
function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

// Verify and decode a token
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null; // Invalid or expired token
  }
}

module.exports = { generateToken, verifyToken };