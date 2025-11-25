/**
 * Manual Image Stitching API
 * POST /api/images/stitch
 * Manually stitch existing main and diff images
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PythonStitcher } from '@/lib/stitcher/python-stitcher';
import path from 'path';
import fs from 'fs/promises';

/**
 * Stitch request schema
 */
const StitchRequestSchema = z.object({
  imageId: z.string().min(1, 'Image ID is required'),
  version: z.string().regex(/^v\d+$/, 'Version must be in format "v1", "v2", etc.').default('v1'),
  languageIds: z
    .array(z.number().min(1).max(7))
    .optional()
    .default([1, 2, 3, 4, 5, 6, 7]),
});

export type StitchRequest = z.infer<typeof StitchRequestSchema>;

/**
 * POST /api/images/stitch
 * Manually stitch main and diff images
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = StitchRequestSchema.parse(body);

    console.log(
      `[API] Manual stitch request for ${validatedData.imageId} ${validatedData.version}`
    );

    // Construct paths
    const baseDir = path.join(
      process.cwd(),
      'public',
      'images',
      validatedData.imageId,
      validatedData.version
    );

    const mainPath = path.join(baseDir, 'main.png');
    const diffPath = path.join(baseDir, 'diff.png');

    // Verify main and diff images exist
    try {
      await Promise.all([
        fs.access(mainPath),
        fs.access(diffPath),
      ]);
    } catch (error) {
      console.error('[API] Main or diff image not found:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'IMAGES_NOT_FOUND',
            message: `Main or diff image not found for ${validatedData.imageId} ${validatedData.version}. Please generate images first.`,
          },
        },
        { status: 404 }
      );
    }

    // Create stitcher
    const stitcher = new PythonStitcher();

    // Stitch for each language
    const stitchedPaths: Record<string, string> = {};
    const languageCodes = ['en', 'fr', 'ja', 'ko', 'de', 'es', 'zh'];

    for (const langId of validatedData.languageIds) {
      const langCode = languageCodes[langId - 1];
      const outputPath = path.join(baseDir, `final_${langCode}.png`);

      console.log(
        `[API] Stitching language ${langId} (${langCode}) for ${validatedData.imageId}`
      );

      await stitcher.stitch({
        mainImagePath: mainPath,
        diffImagePath: diffPath,
        outputPath,
        languageId: langId,
      });

      // Store relative path for response
      const relativePath = `/images/${validatedData.imageId}/${validatedData.version}/final_${langCode}.png`;
      stitchedPaths[langCode] = relativePath;
    }

    console.log(
      `[API] Manual stitch complete for ${validatedData.imageId} ${validatedData.version}: ${validatedData.languageIds.length} language(s)`
    );

    return NextResponse.json({
      success: true,
      data: {
        imageId: validatedData.imageId,
        version: validatedData.version,
        paths: stitchedPaths,
        languagesGenerated: validatedData.languageIds.length,
      },
      message: `Successfully stitched ${validatedData.languageIds.length} language variant(s) for ${validatedData.imageId} ${validatedData.version}`,
    });
  } catch (error) {
    console.error('[API] Manual stitch error:', error);

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
          code: 'STITCH_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 }
    );
  }
}
