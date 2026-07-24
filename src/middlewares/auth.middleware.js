const { verifyToken } = require('../utils/jwt');

// Middleware to verify JWT token and attach user info to request
function authenticate(req, res, next) {
  try {
    // Extract token from Authorization header
    // Format: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Remove "Bearer " prefix to get the actual token
    const token = authHeader.substring(7);

    // Verify token and decode payload
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach user info to request object so controllers can access it
    req.user = decoded; // { userId, email, role }

    next(); // Pass control to the next middleware/controller
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

// Middleware to check if user has ADMIN role
function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { authenticate, requireAdmin };