/**
 * Image Generation Worker Startup Script
 * Starts a BullMQ worker to process image generation jobs
 *
 * Usage:
 *   npm run worker:start
 *   or
 *   tsx scripts/start-worker.ts
 */

import { startWorker, stopWorker } from '../src/lib/queue/worker';
import { testRedisConnection } from '../src/lib/queue/connection';

async function main() {
  console.log('========================================');
  console.log('Image Generation Worker');
  console.log('========================================\n');

  // Test Redis connection first
  console.log('[Worker] Testing Redis connection...');
  const redisConnected = await testRedisConnection();

  if (!redisConnected) {
    console.error(
      '\n❌ Redis connection failed. Please ensure Redis is running:\n'
    );
    console.error('  docker-compose up redis\n');
    process.exit(1);
  }

  console.log('✅ Redis connection successful\n');

  // Start the worker
  console.log('[Worker] Starting worker...\n');
  const worker = startWorker();

  console.log('========================================');
  console.log('✅ Worker is running');
  console.log('Press Ctrl+C to stop');
  console.log('========================================\n');

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[Worker] Received ${signal}, shutting down gracefully...`);

    try {
      await stopWorker();
      console.log('[Worker] Worker stopped successfully');
      process.exit(0);
    } catch (error) {
      console.error('[Worker] Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle uncaught errors
  process.on('unhandledRejection', (error) => {
    console.error('[Worker] Unhandled rejection:', error);
  });

  process.on('uncaughtException', (error) => {
    console.error('[Worker] Uncaught exception:', error);
    process.exit(1);
  });
}

// Run the worker
main().catch((error) => {
  console.error('[Worker] Fatal error:', error);
  process.exit(1);
});
