/**
 * Batch Image Generation API
 * POST /api/images/generate/batch
 * Generates images for multiple records with progress tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BatchGenerator } from '@/lib/generators/batch-generator';
import { ComboManager } from '@/lib/generators/combo-manager';
import { createProviderManagerFromEnv } from '@/lib/providers';

/**
 * Library filter schema
 */
const LibraryFilterSchema = z.object({
  character: z.array(z.string()).optional(),
  pose: z.array(z.string()).optional(),
  scene: z.array(z.string()).optional(),
  theme: z.array(z.string()).optional(),
  style: z.array(z.string()).optional(),
});

/**
 * Batch generation request schema
 * Supports two modes:
 * 1. Direct mode: Provide imageIds array
 * 2. Filter mode: Provide libraryFilter to enumerate combinations
 */
const BatchGenerationRequestSchema = z
  .object({
    // Direct mode: Specify image IDs explicitly
    imageIds: z.array(z.string().min(1)).optional(),

    // Filter mode: Use library filters to enumerate combinations
    libraryFilter: LibraryFilterSchema.optional(),

    // For filter mode: Which combinations to generate
    mode: z
      .enum(['all', 'ungenerated', 'unimaged'])
      .optional()
      .default('ungenerated'),

    // Generation options
    languageIds: z
      .array(z.number().min(1).max(7))
      .optional()
      .default([1, 2, 3, 4, 5, 6, 7]),

    concurrency: z.number().min(1).max(5).optional().default(1),

    continueOnError: z.boolean().optional().default(true),
  })
  .refine(
    (data) => data.imageIds || data.libraryFilter,
    'Either imageIds or libraryFilter must be provided'
  );

export type BatchGenerationRequest = z.infer<
  typeof BatchGenerationRequestSchema
>;

/**
 * POST /api/images/generate/batch
 * Start batch image generation
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = BatchGenerationRequestSchema.parse(body);

    console.log('[API] Batch generation request:', {
      mode: validatedData.imageIds ? 'direct' : 'filter',
      imageIdsCount: validatedData.imageIds?.length,
      filter: validatedData.libraryFilter,
      filterMode: validatedData.mode,
    });

    // Determine image IDs to generate
    let imageIds: string[];

    if (validatedData.imageIds) {
      // Direct mode: Use provided image IDs
      imageIds = validatedData.imageIds;
      console.log(`[API] Direct mode: ${imageIds.length} image(s) specified`);
    } else if (validatedData.libraryFilter) {
      // Filter mode: Enumerate combinations
      const comboManager = new ComboManager();

      let combinations;
      switch (validatedData.mode) {
        case 'all':
          combinations = await comboManager.enumerateCombinations(
            validatedData.libraryFilter
          );
          break;

        case 'ungenerated':
          combinations = await comboManager.getUngeneratedCombinations(
            validatedData.libraryFilter
          );
          break;

        case 'unimaged':
          combinations = await comboManager.getUnimagedCombinations(
            validatedData.libraryFilter
          );
          break;
      }

      imageIds = combinations.map((c) => c.imageId);

      console.log(
        `[API] Filter mode (${validatedData.mode}): ${imageIds.length} combination(s) found`
      );
    } else {
      // Should never reach here due to schema validation
      throw new Error('Invalid request: No imageIds or libraryFilter provided');
    }

    // Validate we have images to generate
    if (imageIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_IMAGES',
            message: 'No images to generate with the provided criteria',
          },
        },
        { status: 400 }
      );
    }

    // Create batch generator and queue jobs
    const batchGenerator = new BatchGenerator();

    // Start batch generation (jobs are queued and processed asynchronously by workers)
    const result = await batchGenerator.generateBatch(imageIds, {
      languageIds: validatedData.languageIds as (1 | 2 | 3 | 4 | 5 | 6 | 7)[],
      overwrite: false,
    });

    console.log(
      `[API] Batch generation started: ${result.batchId} (${result.queuedJobs} jobs queued)`
    );

    return NextResponse.json({
      success: true,
      data: {
        batchId: result.batchId,
        totalImages: result.totalImages,
        status: result.status,
        queuedJobs: result.queuedJobs,
      },
      message: `Batch generation started: ${result.totalImages} image(s) queued for processing`,
    });
  } catch (error) {
    console.error('[API] Batch generation error:', error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BATCH_GENERATION_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 }
    );
  }
}
