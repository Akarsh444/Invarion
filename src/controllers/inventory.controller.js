const prisma = require('../config/db');

// Get inventory for a product
async function getInventory(req, res) {
  try {
    const { productId } = req.params;

    const inventory = await prisma.inventory.findUnique({
      where: { productId },
      include: {
        product: true, // Include product details
      },
    });

    if (!inventory) {
      return res.status(404).json({ error: 'Inventory not found' });
    }

    // Calculate available stock (total - reserved)
    const available = inventory.quantity - inventory.reserved;

    res.json({
      ...inventory,
      available, // Add calculated field
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
}

// Update stock quantity (ADMIN only)
async function updateStock(req, res) {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    // Validate quantity is non-negative
    if (quantity < 0) {
      return res.status(400).json({ error: 'Quantity cannot be negative' });
    }

    const inventory = await prisma.inventory.update({
      where: { productId },
      data: {
        quantity,
        // Version increment for optimistic locking (we'll use this in Phase 3)
        version: { increment: 1 },
      },
      include: {
        product: true,
      },
    });

    const available = inventory.quantity - inventory.reserved;

    res.json({
      ...inventory,
      available,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Inventory not found' });
    }
    console.error('Update stock error:', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
}

// Add stock (ADMIN only) - increments existing quantity
async function addStock(req, res) {
  try {
    const { productId } = req.params;
    const { amount } = req.body;

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const inventory = await prisma.inventory.update({
      where: { productId },
      data: {
        quantity: { increment: amount }, // Add to existing quantity
        version: { increment: 1 },
      },
      include: {
        product: true,
      },
    });

    const available = inventory.quantity - inventory.reserved;

    res.json({
      ...inventory,
      available,
      message: `Added ${amount} units to stock`,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Inventory not found' });
    }
    console.error('Add stock error:', error);
    res.status(500).json({ error: 'Failed to add stock' });
  }
}

// Get low stock products (ADMIN only) - products with available < threshold
async function getLowStock(req, res) {
  try {
    const { threshold = 5 } = req.query; // Default threshold is 5

    const inventories = await prisma.inventory.findMany({
      include: {
        product: true,
      },
    });

    // Filter where available (quantity - reserved) is below threshold
    const lowStock = inventories
      .map((inv) => ({
        ...inv,
        available: inv.quantity - inv.reserved,
      }))
      .filter((inv) => inv.available < parseInt(threshold));

    res.json(lowStock);
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({ error: 'Failed to fetch low stock items' });
  }
}

module.exports = {
  getInventory,
  updateStock,
  addStock,
  getLowStock,
};