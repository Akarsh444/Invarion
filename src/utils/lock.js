const redisClient = require('../config/redis');
const crypto = require('crypto');

// Lua script for safe release - only deletes if the value matches our token
// Prevents releasing a lock that isn't ours anymore (e.g. after it expired and someone else grabbed it)
const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`;

// Tries to acquire a lock, retrying briefly if it's currently held by someone else
// Returns a unique token (needed to release) or null if it couldn't acquire within the retry window
async function acquireLock(key, ttlMs = 5000, retries = 20, retryDelayMs = 100) {
  const token = crypto.randomUUID();

  for (let attempt = 0; attempt < retries; attempt++) {
    const result = await redisClient.set(key, token, { NX: true, PX: ttlMs });
    if (result === 'OK') return token; // lock acquired
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs)); // wait and retry
  }

  return null; // gave up after retries
}

// Releases a lock only if we still own it (token matches)
async function releaseLock(key, token) {
  if (!token) return;
  await redisClient.eval(RELEASE_SCRIPT, { keys: [key], arguments: [token] });
}

module.exports = { acquireLock, releaseLock };