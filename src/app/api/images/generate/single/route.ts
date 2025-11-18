/**
 * Single Image Generation API
 * POST /api/images/generate/single
 * Generates images for a single record using the 3-round flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ImageGenerator } from '@/lib/generators/image-generator';
import { createProviderManagerFromEnv } from '@/lib/providers';

/**
 * Request schema
 */
const SingleGenerationRequestSchema = z.object({
  imageId: z.string().min(1, 'Image ID is required'),
  languageIds: z
    .array(z.number().min(1).max(7))
    .optional()
    .default([1, 2, 3, 4, 5, 6, 7]),
  overwrite: z.boolean().optional().default(false),
});

export type SingleGenerationRequest = z.infer<
  typeof SingleGenerationRequestSchema
>;

/**
 * POST /api/images/generate/single
 * Generate images for a single record
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = SingleGenerationRequestSchema.parse(body);

    console.log(
      `[API] Single generation request for ${validatedData.imageId}`
    );

    // Create provider manager and image generator
    const providerManager = createProviderManagerFromEnv();
    const imageGenerator = new ImageGenerator(providerManager);

    // Start generation (this runs synchronously but could be made async)
    const result = await imageGenerator.generateThreeRounds(
      validatedData.imageId,
      {
        languageIds: validatedData.languageIds as (1 | 2 | 3 | 4 | 5 | 6 | 7)[],
        overwrite: validatedData.overwrite,
      }
    );

    console.log(
      `[API] Single generation complete for ${validatedData.imageId}`
    );

    return NextResponse.json({
      success: true,
      data: {
        imageId: result.imageId,
        version: result.version,
        provider: result.provider,
        paths: result.paths,
        totalTimeMs: result.totalTimeMs,
        languagesGenerated: validatedData.languageIds.length,
      },
      message: `Successfully generated ${validatedData.languageIds.length} language variant(s) for ${result.imageId}`,
    });
  } catch (error) {
    console.error('[API] Single generation error:', error);

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
          code: 'GENERATION_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 }
    );
  }
}
