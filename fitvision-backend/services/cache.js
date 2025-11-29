// services/cache.js
// Redis caching service

import Redis from 'ioredis';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let redisClient = null;

export function initRedis() {
  // Don't initialize if already initialized
  if (redisClient) {
    return redisClient;
  }

  // Skip Redis in development if not explicitly configured
  if (config.server.nodeEnv === 'development' && !process.env.REDIS_REQUIRED) {
    logger.info('Redis skipped in development mode (set REDIS_REQUIRED=1 to enable)');
    return null;
  }

  if (!config.redis.url) {
    logger.info('Redis URL not configured, caching disabled');
    return null;
  }

  try {
    redisClient = new Redis(config.redis.url, {
      retryStrategy: (times) => {
        // Stop retrying after 5 attempts
        if (times > 5) {
          logger.warn('Redis connection failed after multiple attempts, disabling cache');
          return null; // Stop retrying
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true, // Don't connect immediately
      enableOfflineQueue: false, // Don't queue commands when disconnected
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });

    redisClient.on('error', (err) => {
      // Only log error once, not repeatedly
      if (!redisClient._errorLogged) {
        logger.warn('Redis connection error (cache will be disabled)', { error: err.message });
        redisClient._errorLogged = true;
      }
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
      redisClient._errorLogged = false;
    });

    // Try to connect, but don't fail if it doesn't work
    redisClient.connect().catch(() => {
      // Connection failed, but we'll continue without Redis
      logger.warn('Redis connection failed, continuing without cache');
    });

    return redisClient;
  } catch (err) {
    logger.warn('Failed to initialize Redis, continuing without cache', { error: err.message });
    return null;
  }
}

export async function get(key) {
  if (!redisClient || redisClient.status !== 'ready') return null;
  
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    // Silently fail - cache is optional
    return null;
  }
}

export async function set(key, value, ttlSeconds = 3600) {
  if (!redisClient || redisClient.status !== 'ready') return false;
  
  try {
    const serialized = JSON.stringify(value);
    await redisClient.setex(key, ttlSeconds, serialized);
    return true;
  } catch (err) {
    // Silently fail - cache is optional
    return false;
  }
}

export async function del(key) {
  if (!redisClient || redisClient.status !== 'ready') return false;
  
  try {
    await redisClient.del(key);
    return true;
  } catch (err) {
    // Silently fail - cache is optional
    return false;
  }
}

export async function exists(key) {
  if (!redisClient || redisClient.status !== 'ready') return false;
  
  try {
    const result = await redisClient.exists(key);
    return result === 1;
  } catch (err) {
    // Silently fail - cache is optional
    return false;
  }
}

// Cache key generators
export const cacheKeys = {
  exercises: (muscle, level) => `exercises:${muscle || 'all'}:${level || 'all'}`,
  exercise: (slug) => `exercise:${slug}`,
  userProfile: (userId) => `profile:${userId}`,
  scanStats: (userId) => `scan:stats:${userId}`,
  scanHistory: (userId, limit) => `scan:history:${userId}:${limit || 20}`,
};

export default redisClient;


