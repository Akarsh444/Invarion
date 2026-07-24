const bcrypt = require('bcryptjs');

// Hash a plain password before storing in DB
// The '10' is the salt rounds — higher = more secure but slower
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// Compare login password with stored hash
async function comparePassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

module.exports = { hashPassword, comparePassword };