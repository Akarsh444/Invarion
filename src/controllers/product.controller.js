const prisma = require('../config/db');
const { invalidateCache } = require('../middlewares/cache.middleware'); // Add this line


// Create a new product (ADMIN only)
async function createProduct(req, res) {
  try {
    const { name, description, price, initialStock } = req.body;

    // Validate price is positive
    if (price <= 0) {
      return res.status(400).json({ error: 'Price must be greater than 0' });
    }

    // Create product and inventory in a transaction (both succeed or both fail)
    const product = await prisma.$transaction(async (tx) => {
      // Create the product
      const newProduct = await tx.product.create({
        data: {
          name,
          description,
          price,
        },
      });

      // Create inventory record linked to this product
      await tx.inventory.create({
        data: {
          productId: newProduct.id,
          quantity: initialStock || 0, // Default to 0 if not provided
          reserved: 0,
        },
      });

      return newProduct;
    });
    await invalidateCache('/api/v1/products*');
    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
}

// Get all products with their inventory
async function getAllProducts(req, res) {
  try {
    const products = await prisma.product.findMany({
      include: {
        inventory: true, // Include related inventory data
      },
      orderBy: {
        createdAt: 'desc', // Newest first
      },
    });

    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}

// Get single product by ID
async function getProductById(req, res) {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        inventory: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
}

// Update product (ADMIN only)
async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, description, price } = req.body;

    // Build update object (only include fields that were provided)
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) {
      if (price <= 0) {
        return res.status(400).json({ error: 'Price must be greater than 0' });
      }
      updateData.price = price;
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        inventory: true,
      },
    });
    await invalidateCache('/api/v1/products*');
    res.json(product);
  } catch (error) {
    if (error.code === 'P2025') {
      // Prisma error code for "record not found"
      return res.status(404).json({ error: 'Product not found' });
    }
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
}

// Delete product (ADMIN only)
async function deleteProduct(req, res) {
  try {
    const { id } = req.params;

    // Delete in transaction (delete inventory first due to foreign key)
    await prisma.$transaction(async (tx) => {
      // Delete inventory record
      await tx.inventory.delete({
        where: { productId: id },
      });

      // Delete product
      await tx.product.delete({
        where: { id },
      });
    });
    await invalidateCache('/api/v1/products*');
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
}

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};