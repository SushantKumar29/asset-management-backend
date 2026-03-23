import { redisClient } from '../config/redis';
import logger from './logger';

export const cache = {
  // Get data from cache
  async get(key: string) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  },

  // Set data in cache with expiration
  async set(key: string, data: unknown, ttlSeconds: number = 300) {
    try {
      await redisClient.setex(key, ttlSeconds, JSON.stringify(data));
    } catch (error) {
      logger.error('Cache set error:', error);
      return null;
    }
  },

  // Clear specific cache key
  async clear(key: string) {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error('Cache clear error:', error);
      return null;
    }
  },

  // Generate cache key for metadata
  key: {
    metadata: (userId: string, assetId: string) => `metadata:${userId}:${assetId}`,
    tags: (userId: string, assetId: string) => `tags:${userId}:${assetId}`,
  },
};
