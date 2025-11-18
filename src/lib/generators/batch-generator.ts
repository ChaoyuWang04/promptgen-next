/**
 * Batch Generator
 * Coordinates batch image generation with BullMQ queue
 */

import { prisma } from '@/lib/db/prisma';
import { LANGUAGE_IDS } from './image-generator';
import {
  addBatchImageGenerationJobs,
  getBatchJobs,
  getQueueStats,
} from '../queue/image-generation-queue';

/**
 * Batch generation options
 */
export interface BatchGenerationOptions {
  /**
   * Language IDs to generate
   * Default: all 7 languages
   */
  languageIds?: number[];

  /**
   * Whether to overwrite existing images
   * Default: false
   */
  overwrite?: boolean;
}

/**
 * Batch generation result (immediate response)
 */
export interface BatchGenerationResult {
  /**
   * Batch ID for tracking
   */
  batchId: string;

  /**
   * Total images in batch
   */
  totalImages: number;

  /**
   * Batch status
   */
  status: string;

  /**
   * Number of jobs queued
   */
  queuedJobs: number;
}

/**
 * Batch Generator - coordinates batch image generation using BullMQ
 */
export class BatchGenerator {
  /**
   * Start batch generation using BullMQ queue
   * Jobs are processed asynchronously by workers
   */
  async generateBatch(
    imageIds: string[],
    options: BatchGenerationOptions = {}
  ): Promise<BatchGenerationResult> {
    const languageIds = options.languageIds || [...LANGUAGE_IDS];

    console.log(
      `[BatchGenerator] Starting batch generation for ${imageIds.length} image(s)`
    );

    // Create batch record
    const batch = await prisma.imageBatch.create({
      data: {
        imageIds,
        totalImages: imageIds.length,
        status: 'PENDING',
        progress: 0,
        completedImageIds: [],
        failedImageIds: [],
        errors: [],
      },
    });

    console.log(`[BatchGenerator] Created batch ${batch.id}`);

    try {
      // Add all jobs to the queue
      const jobIds = await addBatchImageGenerationJobs(
        batch.id,
        imageIds,
        languageIds
      );

      // Update batch status to IN_PROGRESS
      await prisma.imageBatch.update({
        where: { id: batch.id },
        data: {
          status: 'IN_PROGRESS',
          jobIds,
        },
      });

      console.log(
        `[BatchGenerator] Added ${jobIds.length} jobs to queue for batch ${batch.id}`
      );

      return {
        batchId: batch.id,
        totalImages: imageIds.length,
        status: 'IN_PROGRESS',
        queuedJobs: jobIds.length,
      };
    } catch (error) {
      // If failed to queue jobs, mark batch as failed
      await prisma.imageBatch.update({
        where: { id: batch.id },
        data: {
          status: 'FAILED',
          errors: [
            {
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString(),
            },
          ],
        },
      });

      throw error;
    }
  }

  /**
   * Get batch status and progress from database and queue
   */
  async getBatchStatus(batchId: string) {
    const batch = await prisma.imageBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`);
    }

    // Get real-time job status from queue
    let queueStatus: Record<string, number> = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
    };

    try {
      const jobs = await getBatchJobs(batchId);

      for (const job of jobs) {
        const state = await job.getState();
        queueStatus[state] = (queueStatus[state] || 0) + 1;
      }
    } catch (error) {
      console.error('[BatchGenerator] Failed to get queue status:', error);
    }

    return {
      batchId: batch.id,
      totalImages: batch.totalImages,
      completedImageIds: batch.completedImageIds || [],
      failedImageIds: batch.failedImageIds || [],
      completed: (batch.completedImageIds || []).length,
      failed: (batch.failedImageIds || []).length,
      status: batch.status,
      progress: batch.progress,
      queueStatus,
      errors: batch.errors || [],
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
      completedAt: batch.completedAt,
    };
  }

  /**
   * Cancel a running batch
   * Note: This only marks the batch as failed, ongoing operations may still complete
   */
  async cancelBatch(batchId: string) {
    await prisma.imageBatch.update({
      where: { id: batchId },
      data: {
        status: 'FAILED',
      },
    });

    console.log(`[BatchGenerator] Batch ${batchId} cancelled`);
  }

  /**
   * Get all batches with pagination
   */
  async listBatches(options: { skip?: number; take?: number } = {}) {
    const { skip = 0, take = 20 } = options;

    const [batches, total] = await Promise.all([
      prisma.imageBatch.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.imageBatch.count(),
    ]);

    return {
      batches,
      total,
      hasMore: skip + take < total,
    };
  }

  /**
   * Get overall queue statistics
   */
  async getQueueStats() {
    return getQueueStats();
  }
}
