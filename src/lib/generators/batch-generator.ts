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
import { generateMainPrompt } from './main-prompt-generator';
import { generateDiffPrompt } from './diff-prompt-generator';
import { type LibrarySelection } from '../engines/types';

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
      },
    });

    console.log(`[BatchGenerator] Created batch ${batch.id}`);

    try {
      // Ensure Records and Prompts exist for all imageIds before queuing jobs
      for (const imageId of imageIds) {
        try {
          // Get Combination to retrieve libraryIds
          const combination = await prisma.combination.findUnique({
            where: { combinationKey: imageId },
            select: { id: true, libraryIds: true },
          });

          if (!combination) {
            console.warn(`[BatchGenerator] No combination found for ${imageId}, skipping`);
            continue;
          }

          const libraryIds = combination.libraryIds as unknown as LibrarySelection;

          // Check existing Record and Prompts
          let record = await prisma.record.findUnique({
            where: { imageId },
            include: { prompts: true },
          });

          // Step 1: Ensure Record and MAIN Prompt exist
          if (!record) {
            // No record exists - generate main prompt (creates record + MAIN prompt)
            console.log(`[BatchGenerator] Generating main prompt for ${imageId}`);
            await generateMainPrompt(libraryIds, 'template_default_v1', true);

            // Reload record to get the created one
            record = await prisma.record.findUniqueOrThrow({
              where: { imageId },
              include: { prompts: true },
            });

            console.log(`[BatchGenerator] Created Record and MAIN prompt for ${imageId}`);
          } else {
            // Record exists - check if MAIN prompt exists
            const hasMainPrompt = record.prompts.some((p) => p.type === 'MAIN');

            if (!hasMainPrompt) {
              console.log(
                `[BatchGenerator] Generating MAIN prompt for existing record ${imageId}`
              );
              const mainResult = await generateMainPrompt(
                libraryIds,
                'template_default_v1',
                false
              );

              await prisma.prompt.create({
                data: {
                  recordId: record.id,
                  type: 'MAIN',
                  promptCn: mainResult.prompt_cn,
                  promptEn: '',
                },
              });

              // Reload prompts
              record = await prisma.record.findUniqueOrThrow({
                where: { imageId },
                include: { prompts: true },
              });

              console.log(`[BatchGenerator] Created MAIN prompt for ${imageId}`);
            }
          }

          // Step 2: Ensure DIFF Prompt exists
          const hasDiffPrompt = record.prompts.some((p) => p.type === 'DIFF');

          if (!hasDiffPrompt) {
            console.log(`[BatchGenerator] Generating DIFF prompt for ${imageId}`);
            const diffResult = await generateDiffPrompt(
              imageId,
              'diff_template_default_v1',
              false
            );

            await prisma.prompt.create({
              data: {
                recordId: record.id,
                type: 'DIFF',
                promptCn: diffResult.prompt_cn,
                promptEn: '',
              },
            });

            console.log(`[BatchGenerator] Created DIFF prompt for ${imageId}`);
          }

          console.log(`[BatchGenerator] Prompts ready for ${imageId}`);
        } catch (error) {
          console.error(
            `[BatchGenerator] Failed to prepare prompts for ${imageId}:`,
            error
          );
          // Continue with next image
        }
      }

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
        },
      });

      console.error(`[BatchGenerator] Failed to queue batch ${batch.id}:`, error);
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
      completed: batch.completed,
      failed: batch.failed,
      status: batch.status,
      queueStatus,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
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
