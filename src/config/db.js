// Prisma client — this is how we talk to the database
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

// Create the adapter with your database URL
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

// Pass the adapter to PrismaClient
const prisma = new PrismaClient({
  adapter, // This tells Prisma to use PostgreSQL via the adapter
  log: ['query', 'error'], // Log queries in dev mode
});

module.exports = prisma;