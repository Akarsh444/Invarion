const express = require('express');
const prisma = require('../config/db');
const router = express.Router();

// Test endpoint — counts how many users exist
router.get('/db-test', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    res.json({ 
      message: 'Database connected', 
      userCount 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Database connection failed', 
      details: error.message 
    });
  }
});

module.exports = router;