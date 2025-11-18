/**
 * Image Generation Queue
 * Manages job queueing and processing for image generation
 */

import { Queue, QueueEvents } from 'bullmq';
import { getRedisConnection } from './connection';
import {
  QueueName,
  ImageGenerationJobData,
  ImageGenerationJobResult,
} from './types';

// Singleton queue instance
let imageGenerationQueue: Queue<
  ImageGenerationJobData,
  ImageGenerationJobResult
> | null = null;

/**
 * Get or create the image generation queue
 */
export function getImageGenerationQueue(): Queue<
  ImageGenerationJobData,
  ImageGenerationJobResult
> {
  if (!imageGenerationQueue) {
    imageGenerationQueue = new Queue<
      ImageGenerationJobData,
      ImageGenerationJobResult
    >(QueueName.IMAGE_GENERATION, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3, // Retry failed jobs up to 3 times
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5 second delay
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    });

    console.log('[Queue] Image generation queue initialized');
  }

  return imageGenerationQueue;
}

/**
 * Add a single image generation job to the queue
 */
export async function addImageGenerationJob(
  data: ImageGenerationJobData
): Promise<string> {
  const queue = getImageGenerationQueue();

  const job = await queue.add(
    'generate-image',
    data,
    {
      jobId: `img-${data.imageId}-${Date.now()}`, // Unique job ID
      priority: data.batchId ? 10 : 1, // Batch jobs have lower priority
    }
  );

  console.log(
    `[Queue] Added job ${job.id} for imageId: ${data.imageId}${data.batchId ? ` (batch: ${data.batchId})` : ''}`
  );

  return job.id!;
}

/**
 * Add multiple image generation jobs as a batch
 */
export async function addBatchImageGenerationJobs(
  batchId: string,
  imageIds: string[],
  languageIds: number[]
): Promise<string[]> {
  const queue = getImageGenerationQueue();

  // Create job data for each image
  const jobsData = imageIds.map((imageId) => ({
    name: 'generate-image',
    data: {
      imageId,
      languageIds: languageIds as any[],
      batchId,
    },
    opts: {
      jobId: `batch-${batchId}-${imageId}`,
      priority: 10, // Lower priority for batch jobs
    },
  }));

  // Add all jobs at once (more efficient)
  const jobs = await queue.addBulk(jobsData);

  console.log(
    `[Queue] Added ${jobs.length} jobs for batch ${batchId}`
  );

  return jobs.map((job) => job.id!);
}

/**
 * Get job by ID
 */
export async function getJob(jobId: string) {
  const queue = getImageGenerationQueue();
  return queue.getJob(jobId);
}

/**
 * Get all jobs for a batch
 */
export async function getBatchJobs(batchId: string) {
  const queue = getImageGenerationQueue();

  // Get all jobs in various states
  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaiting(),
    queue.getActive(),
    queue.getCompleted(),
    queue.getFailed(),
  ]);

  // Filter jobs by batch ID
  const allJobs = [...waiting, ...active, ...completed, ...failed];
  return allJobs.filter((job) => job.data.batchId === batchId);
}

/**
 * Create queue events listener
 */
export function createQueueEvents(): QueueEvents {
  return new QueueEvents(QueueName.IMAGE_GENERATION, {
    connection: getRedisConnection(),
  });
}

/**
 * Get queue stats
 */
export async function getQueueStats() {
  const queue = getImageGenerationQueue();

  const [waitingCount, activeCount, completedCount, failedCount] =
    await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

  return {
    waiting: waitingCount,
    active: activeCount,
    completed: completedCount,
    failed: failedCount,
    total: waitingCount + activeCount + completedCount + failedCount,
  };
}

/**
 * Clean up old jobs
 */
export async function cleanQueue(
  grace: number = 24 * 3600 * 1000
): Promise<void> {
  const queue = getImageGenerationQueue();

  // Clean completed jobs older than grace period
  await queue.clean(grace, 1000, 'completed');

  // Clean failed jobs older than 7 days
  await queue.clean(7 * 24 * 3600 * 1000, 1000, 'failed');

  console.log('[Queue] Cleaned old jobs');
}

/**
 * Close queue connection
 */
export async function closeQueue(): Promise<void> {
  if (imageGenerationQueue) {
    await imageGenerationQueue.close();
    imageGenerationQueue = null;
    console.log('[Queue] Closed image generation queue');
  }
}
