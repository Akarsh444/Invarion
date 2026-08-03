const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
    connectTimeout: 10000,
    keepAlive: 5000, // sends TCP keepalive packets, prevents idle connection drops in Docker networking
  },
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('reconnecting', () => console.log('Redis reconnecting...'));
redisClient.on('ready', () => console.log('Redis ready'));
redisClient.on('connect', () => console.log('Redis connected'));

(async () => {
  await redisClient.connect();
})();

module.exports = redisClient;