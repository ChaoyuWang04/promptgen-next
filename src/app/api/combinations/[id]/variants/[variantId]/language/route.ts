/**
 * Language Version Generation API
 * POST /api/combinations/[id]/variants/[variantId]/language - Generate a language version of final image
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { GenerateLanguageRequestSchema } from '@/schemas/combination.schema';
import { ImageStitcher } from '@/lib/stitcher/image-stitcher';
import path from 'path';

interface RouteParams {
  params: Promise<{
    id: string;
    variantId: string;
  }>;
}

/**
 * Language ID mapping
 */
const LANGUAGE_ID_MAP: Record<string, number> = {
  en: 1,
  fr: 2,
  ja: 3,
  ko: 4,
  de: 5,
  es: 6,
  zh: 7,
};

/**
 * POST /api/combinations/[id]/variants/[variantId]/language
 * Generate a specific language version of the final image
 *
 * Body: { language: "ja" }
 * This will stitch the main and diff images with Japanese text overlay
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, variantId } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = GenerateLanguageRequestSchema.safeParse({
      ...body,
      variantId,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request',
            details: validationResult.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { language } = validationResult.data;

    // Find the combination
    const combination = await prisma.combination.findUnique({
      where: { id },
      select: { combinationKey: true },
    });

    if (!combination) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Combination not found: ${id}`,
          },
        },
        { status: 404 }
      );
    }

    // Find the image variant
    const imageVariant = await prisma.imageVariant.findUnique({
      where: { id: variantId },
      include: {
        record: {
          select: {
            combinationId: true,
          },
        },
      },
    });

    if (!imageVariant) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Variant not found: ${variantId}`,
          },
        },
        { status: 404 }
      );
    }

    // Verify the variant belongs to this combination
    if (imageVariant.record.combinationId !== id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Variant does not belong to this combination',
          },
        },
        { status: 400 }
      );
    }

    // Check if main and diff images exist
    if (!imageVariant.imageMainPath || !imageVariant.imageDiffPath) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATE',
            message: 'Main and diff images must exist before generating language versions',
          },
        },
        { status: 400 }
      );
    }

    // Check if language version already exists
    const currentFinalImages = (imageVariant.finalImages as Record<string, string>) || {};
    if (currentFinalImages[language]) {
      return NextResponse.json({
        success: true,
        data: {
          language,
          path: currentFinalImages[language],
          cached: true,
        },
        message: `Language version already exists: ${language}`,
      });
    }

    // Generate the language version
    const stitcher = new ImageStitcher();
    const version = imageVariant.version;

    const outputPath = path.join(
      process.cwd(),
      'public',
      'images',
      'combinations',
      combination.combinationKey,
      `v${version}_final_${language}.png`
    );

    const languageId = LANGUAGE_ID_MAP[language];

    await stitcher.stitch({
      mainImagePath: imageVariant.imageMainPath,
      diffImagePath: imageVariant.imageDiffPath,
      outputPath,
      languageId,
    });

    // Update the finalImages in database
    const relativePath = `/images/combinations/${combination.combinationKey}/v${version}_final_${language}.png`;
    const updatedFinalImages = {
      ...currentFinalImages,
      [language]: relativePath,
    };

    await prisma.imageVariant.update({
      where: { id: variantId },
      data: {
        finalImages: updatedFinalImages,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        language,
        path: relativePath,
        cached: false,
      },
      message: `Language version generated: ${language}`,
    });
  } catch (error) {
    const { id, variantId } = await params;
    console.error(
      `[API] POST /api/combinations/${id}/variants/${variantId}/language error:`,
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate language version',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
