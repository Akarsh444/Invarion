const { createClient } = require('redis');

// Create Redis client using URL from .env
const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis connected');
});

// Connect immediately when this file is loaded
(async () => {
  await redisClient.connect();
})();

module.exports = redisClient;