/**
 * Redis Connection Configuration
 * Provides Redis connection options for BullMQ
 */

import { ConnectionOptions } from 'bullmq';
import { QueueConfig } from './types';

/**
 * Get queue configuration from environment variables
 */
export function getQueueConfig(): QueueConfig {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    concurrency: parseInt(process.env.BULLMQ_CONCURRENCY || '3', 10),
    maxRetries: parseInt(process.env.BULLMQ_MAX_RETRIES || '2', 10),
  };
}

/**
 * Get Redis connection options for BullMQ
 */
export function getRedisConnection(): ConnectionOptions {
  const config = getQueueConfig();

  return {
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db,
    // Retry strategy for connection failures
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      console.log(`[Redis] Connection retry #${times} in ${delay}ms`);
      return delay;
    },
    // Enable keep-alive to detect broken connections
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
  };
}

/**
 * Test Redis connection
 */
export async function testRedisConnection(): Promise<boolean> {
  try {
    const { default: IORedis } = await import('ioredis');
    const connection = getRedisConnection();

    const redis = new IORedis(connection);

    // Test ping
    const pong = await redis.ping();
    await redis.quit();

    if (pong === 'PONG') {
      console.log('[Redis] Connection test successful');
      return true;
    }

    return false;
  } catch (error) {
    console.error('[Redis] Connection test failed:', error);
    return false;
  }
}
