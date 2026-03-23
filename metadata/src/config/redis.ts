/* Here, ioredis is used because of:
  1. Better Performance & Features (supports pipelining and clustering)
  2. Better Error Handling & Retry (It has retryStrategy functionality)
  3. Promise Support by Default
*/

import Redis from 'ioredis';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

export const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: Number(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3, // This option prevents the app from hanging trying to execute commands on a dead Redis connection
  enableReadyCheck: true, // THis option waits for Redis to be fully ready before allowing commands
  lazyConnect: true, // This option delays the Redis connection
});

redisClient.on('connect', () => {
  logger.info('✅ Gateway Redis connected');
});

redisClient.on('error', (err: Error) => {
  logger.error('❌ Gateway Redis error:', err.message);
});

export default redisClient;
