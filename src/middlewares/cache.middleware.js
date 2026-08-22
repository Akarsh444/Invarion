const redisClient = require('../config/redis');

// Generic cache middleware - caches GET responses
// ttlSeconds: how long to keep cached data before it expires
function cacheMiddleware(ttlSeconds = 300) {
  return async (req, res, next) => {
    // Use the full URL as cache key (includes query params)
    const cacheKey = `cache:${req.originalUrl}`;

    try {
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        // Cache hit - return cached data immediately, skip database
        console.log(`Cache HIT: ${cacheKey}`);
        return res.json(JSON.parse(cachedData));
      }

      console.log(`Cache MISS: ${cacheKey}`);

      // Cache miss - intercept res.json to cache the response before sending
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        // Store in Redis with expiration
        redisClient.setEx(cacheKey, ttlSeconds, JSON.stringify(data));
        return originalJson(data);
      };

      next();
    } catch (error) {
      // If Redis fails, don't break the app - just skip caching
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

// Invalidate cache for a specific pattern (used after create/update/delete)
// Takes a full key pattern (e.g. 'catalog:*') and deletes every match.
// No prefix is added — callers pass the exact pattern they use for keys.
async function invalidateCache(pattern) {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`Invalidated ${keys.length} cache keys matching: ${pattern}`);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}

// Direct cache read — returns parsed value or null on miss/error
async function getCached(key) {
  try {
    const raw = await redisClient.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Cache read error:', error);
    return null; // treat cache failure as a miss, never break the request
  }
}

// Direct cache write with TTL
async function setCached(key, value, ttlSeconds) {
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('Cache write error:', error);
  }
}


module.exports = { cacheMiddleware, invalidateCache, getCached, setCached };