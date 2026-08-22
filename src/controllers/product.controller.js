const prisma = require('../config/db');
const { invalidateCache, getCached, setCached } = require('../middlewares/cache.middleware');


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
    await invalidateCache('catalog:*');
    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
}

// Get all products with their inventory
// Catalog data (name, description, price) changes rarely — safe to cache for a while.
// Stock changes constantly — never cached, always read fresh from the database.
// This split is deliberate: caching stock would serve stale availability, which is
// unacceptable for an inventory system. Real systems cache the catalog, not the count.
const CATALOG_TTL_SECONDS = 300;

async function getAllProducts(req, res) {
  try {
    // 1. Catalog from cache if available
    let catalog = await getCached('catalog:products');

    if (!catalog) {
      catalog = await prisma.product.findMany({
        orderBy: { createdAt: 'desc' },
      });
      await setCached('catalog:products', catalog, CATALOG_TTL_SECONDS);
      console.log('Catalog cache MISS');
    } else {
      console.log('Catalog cache HIT');
    }

    // 2. Stock ALWAYS fresh — never cached
    const inventories = await prisma.inventory.findMany({
      where: { productId: { in: catalog.map((p) => p.id) } },
    });
    const invMap = new Map(inventories.map((i) => [i.productId, i]));

    // 3. Merge cached catalog with live stock
    const result = catalog.map((p) => {
      const inv = invMap.get(p.id) || null;
      return {
        ...p,
        inventory: inv,
        available: inv ? inv.quantity - inv.reserved : 0,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}

async function getProductById(req, res) {
  try {
    const { id } = req.params;

    let product = await getCached(`catalog:product:${id}`);

    if (!product) {
      product = await prisma.product.findUnique({ where: { id } });
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      await setCached(`catalog:product:${id}`, product, CATALOG_TTL_SECONDS);
    }

    // Stock always fresh
    const inv = await prisma.inventory.findUnique({ where: { productId: id } });

    res.json({
      ...product,
      inventory: inv,
      available: inv ? inv.quantity - inv.reserved : 0,
    });
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
    await invalidateCache('catalog:*');
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
    await invalidateCache('catalog:*');
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