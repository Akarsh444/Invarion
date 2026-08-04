const { createClient } = require('redis');

const redisUrl = process.env.REDIS_URL;

// Upstash (and any hosted Redis) uses rediss:// which requires TLS.
// Local Redis uses plain redis:// with no TLS.
// This detects which one and configures the socket accordingly, so the
// SAME code works both locally and in production without edits.
const useTLS = redisUrl.startsWith('rediss://');

const redisClient = createClient({
  url: redisUrl,
  socket: {
    tls: useTLS,                                    // enable TLS only for rediss:// URLs
    reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
    connectTimeout: 10000,
    keepAlive: 5000,
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