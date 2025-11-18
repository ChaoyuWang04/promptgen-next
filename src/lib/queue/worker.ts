/**
 * Image Generation Worker
 * Processes image generation jobs from the BullMQ queue
 */

import { Worker, Job } from 'bullmq';
import { getRedisConnection, getQueueConfig } from './connection';
import { createProviderManagerFromEnv } from '../providers/provider-manager';
import { ImageGenerator } from '../generators/image-generator';
import { prisma } from '../db/prisma';
import {
  QueueName,
  ImageGenerationJobData,
  ImageGenerationJobResult,
  ImageGenerationJobFailure,
} from './types';

// Singleton worker instance
let imageGenerationWorker: Worker | null = null;

/**
 * Process a single image generation job
 */
async function processImageGenerationJob(
  job: Job<ImageGenerationJobData>
): Promise<ImageGenerationJobResult> {
  const { imageId, languageIds, batchId, overwrite } = job.data;

  console.log(
    `[Worker] Processing job ${job.id}: imageId=${imageId}${batchId ? `, batch=${batchId}` : ''}`
  );

  try {
    // Update job progress
    await job.updateProgress(10);

    // Create provider manager and image generator
    const providerManager = createProviderManagerFromEnv();
    const generator = new ImageGenerator(providerManager);

    await job.updateProgress(20);

    // Generate images
    const result = await generator.generateThreeRounds(imageId, {
      languageIds,
      overwrite,
    });

    await job.updateProgress(90);

    // If part of a batch, update batch progress
    if (batchId) {
      await updateBatchProgress(batchId);
    }

    await job.updateProgress(100);

    console.log(
      `[Worker] ✅ Job ${job.id} completed: ${imageId} v${result.version}`
    );

    return result;
  } catch (error) {
    console.error(`[Worker] ❌ Job ${job.id} failed:`, error);

    // If part of a batch, record failure
    if (batchId) {
      await recordBatchFailure(batchId, imageId, error);
    }

    throw error;
  }
}

/**
 * Update batch progress in database
 */
async function updateBatchProgress(batchId: string): Promise<void> {
  try {
    // Get batch
    const batch = await prisma.imageBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      console.error(`[Worker] Batch not found: ${batchId}`);
      return;
    }

    // Count completed images
    const completedCount = batch.completedImageIds?.length || 0;
    const failedCount = batch.failedImageIds?.length || 0;
    const processedCount = completedCount + failedCount;

    // Update progress percentage
    const progress = Math.round((processedCount / batch.totalImages) * 100);

    // Determine status
    let status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' = 'IN_PROGRESS';
    if (processedCount === batch.totalImages) {
      status = failedCount === batch.totalImages ? 'FAILED' : 'COMPLETED';
    }

    // Update batch
    await prisma.imageBatch.update({
      where: { id: batchId },
      data: {
        progress,
        status,
        completedAt: status !== 'IN_PROGRESS' ? new Date() : null,
      },
    });

    console.log(
      `[Worker] Updated batch ${batchId}: ${processedCount}/${batch.totalImages} (${progress}%)`
    );
  } catch (error) {
    console.error(`[Worker] Failed to update batch progress:`, error);
  }
}

/**
 * Record batch failure in database
 */
async function recordBatchFailure(
  batchId: string,
  imageId: string,
  error: unknown
): Promise<void> {
  try {
    await prisma.imageBatch.update({
      where: { id: batchId },
      data: {
        failedImageIds: {
          push: imageId,
        },
        errors: {
          push: {
            imageId,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          },
        },
      },
    });
  } catch (dbError) {
    console.error(
      `[Worker] Failed to record batch failure:`,
      dbError
    );
  }
}

/**
 * Start the image generation worker
 */
export function startWorker(): Worker {
  if (imageGenerationWorker) {
    console.log('[Worker] Worker already running');
    return imageGenerationWorker;
  }

  const config = getQueueConfig();

  imageGenerationWorker = new Worker<
    ImageGenerationJobData,
    ImageGenerationJobResult,
    string
  >(
    QueueName.IMAGE_GENERATION,
    processImageGenerationJob,
    {
      connection: getRedisConnection(),
      concurrency: config.concurrency,
      limiter: {
        max: 10, // Max 10 jobs per duration
        duration: 1000, // 1 second
      },
    }
  );

  // Event handlers
  imageGenerationWorker.on('completed', (job, result) => {
    console.log(
      `[Worker] Job ${job.id} completed successfully: ${result.imageId}`
    );
  });

  imageGenerationWorker.on('failed', (job, error) => {
    console.error(
      `[Worker] Job ${job?.id} failed:`,
      error.message
    );
  });

  imageGenerationWorker.on('error', (error) => {
    console.error('[Worker] Worker error:', error);
  });

  imageGenerationWorker.on('stalled', (jobId) => {
    console.warn(`[Worker] Job ${jobId} stalled`);
  });

  console.log(
    `[Worker] Started with concurrency: ${config.concurrency}`
  );

  return imageGenerationWorker;
}

/**
 * Stop the worker gracefully
 */
export async function stopWorker(): Promise<void> {
  if (imageGenerationWorker) {
    console.log('[Worker] Stopping worker...');
    await imageGenerationWorker.close();
    imageGenerationWorker = null;
    console.log('[Worker] Worker stopped');
  }
}

/**
 * Get worker instance (if running)
 */
export function getWorker(): Worker | null {
  return imageGenerationWorker;
}
