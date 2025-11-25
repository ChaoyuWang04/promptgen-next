/**
 * Variant Generation API
 * POST /api/combinations/[id]/generate - Generate a new variant for a combination
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
  ensureCombinationDirectory,
  getVariantPaths,
  getNextVariantNumber,
} from '@/lib/utils/file-manager';
import { generateImageId } from '@/lib/utils/image-id';
import fs from 'fs/promises';
import path from 'path';

// Import providers and stitcher
import { ProviderManager } from '@/lib/providers';
import { PythonStitcher } from '@/lib/stitcher/python-stitcher';
import { generateMainPrompt } from '@/lib/generators/main-prompt-generator';
import { generateDiffPrompt } from '@/lib/generators/diff-prompt-generator';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/combinations/[id]/generate
 * Generate a new variant for a combination
 *
 * This creates:
 * - Main image (v{n}_main.png)
 * - Diff image (v{n}_diff.png)
 * - Final image in English (v{n}_final_en.png)
 *
 * Other language versions can be generated on demand
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Find the combination with template info
    const combination = await prisma.combination.findUnique({
      where: { id },
      include: {
        records: {
          orderBy: { variantNumber: 'desc' },
          take: 1,
        },
        mainTemplate: {
          select: { id: true, name: true, category: true },
        },
        diffTemplate: {
          select: { id: true, name: true, category: true },
        },
      },
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

    const startTime = Date.now();
    const libraryIds = combination.libraryIds as Record<string, string>;

    // Determine next variant number
    const nextVariantNumber =
      combination.records.length > 0
        ? combination.records[0].variantNumber + 1
        : 1;

    // Generate unique image ID for this variant
    const imageId = await generateImageId(libraryIds as any);

    // Create the record in database
    const record = await prisma.record.create({
      data: {
        imageId,
        combinationId: combination.id,
        variantNumber: nextVariantNumber,
        libraryIds,
        outfitMinorState: [],
        usedDecorations: { from_theme: [], from_scene: [] },
        providerAttempts: [],
      },
    });

    try {
      // Step 1: Generate prompts
      console.log(`[Variant Generation] Generating prompts for ${imageId}...`);

      // Determine template names from combination or fallback to defaults
      const mainTemplateName = combination.mainTemplate?.name ?? 'template_default_v1';
      const diffTemplateName = combination.diffTemplate?.name ?? 'diff_template_default_v1';

      console.log(`[Variant Generation] Using templates - Main: ${mainTemplateName}, Diff: ${diffTemplateName}`);

      // Generate main prompt using the associated template
      const mainPromptResult = await generateMainPrompt(
        libraryIds as any,
        mainTemplateName,
        false // Don't save to database - record already created above
      );

      // Update record with outfit state and mark promptGenerated=true
      // This is required BEFORE calling generateDiffPrompt
      await prisma.record.update({
        where: { id: record.id },
        data: {
          outfitMinorState: mainPromptResult.outfit_minor_state || [],
          usedDecorations: mainPromptResult.used_decorations || {
            from_theme: [],
            from_scene: [],
          },
          promptGenerated: true,
        },
      });

      // Generate diff prompt using the associated template
      const diffPromptResult = await generateDiffPrompt(
        imageId,
        diffTemplateName,
        false // Don't save to database
      );

      // Save prompts to database
      // Note: prompt_en is currently same as prompt_cn since no translation service yet
      await prisma.prompt.createMany({
        data: [
          {
            recordId: record.id,
            type: 'MAIN',
            promptCn: mainPromptResult.prompt_cn || '',
            promptEn: mainPromptResult.prompt_cn || '', // TODO: Add translation
          },
          {
            recordId: record.id,
            type: 'DIFF',
            promptCn: diffPromptResult.prompt_cn || '',
            promptEn: diffPromptResult.prompt_cn || '', // TODO: Add translation
          },
        ],
      });

      // Step 2: Generate images
      console.log(`[Variant Generation] Generating images for ${imageId}...`);

      // Ensure directory exists
      const directory = await ensureCombinationDirectory(
        combination.combinationKey
      );

      const paths = getVariantPaths(
        combination.combinationKey,
        nextVariantNumber,
        ['en']
      );

      // Initialize provider manager and stitcher
      const providerConfig = {
        providers: process.env.IMAGE_PROVIDERS || 'gemini',
        gemini: process.env.GEMINI_API_KEY
          ? {
              apiKey: process.env.GEMINI_API_KEY,
              model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-image',
            }
          : undefined,
        bytedance: process.env.BYTEDANCE_API_KEY
          ? {
              apiKey: process.env.BYTEDANCE_API_KEY,
              model:
                process.env.BYTEDANCE_MODEL || 'doubao-seedream-4-0-250828',
            }
          : undefined,
      };
      const providerManager = new ProviderManager(providerConfig);
      const stitcher = new PythonStitcher();

      // Round 1: Generate main image
      // Note: Using Chinese prompt directly since Gemini can handle it
      // TODO: Add translation service for proper English prompts
      const mainPrompt = mainPromptResult.prompt_cn || '';
      console.log(`[Variant Generation] Round 1: Main image with prompt (first 200 chars): ${mainPrompt.substring(0, 200)}...`);
      const mainResult = await providerManager.generateWithFallback(mainPrompt);

      await fs.writeFile(paths.mainImage, mainResult.image);

      // Round 2: Generate diff image with same provider
      // Note: Using Chinese prompt directly since Gemini can handle it
      const diffPrompt = diffPromptResult.prompt_cn || '';
      console.log(
        `[Variant Generation] Round 2: Diff image with ${mainResult.provider}, prompt (first 200 chars): ${diffPrompt.substring(0, 200)}...`
      );
      const diffImage = await providerManager.generateWithProvider(
        mainResult.provider,
        diffPrompt,
        mainResult.image
      );

      await fs.writeFile(paths.diffImage, diffImage);

      // Round 3: Stitch final image (English only)
      console.log(`[Variant Generation] Round 3: Stitching final image...`);
      const finalPath = path.join(
        directory,
        `v${nextVariantNumber}_final_en.png`
      );

      await stitcher.stitch({
        mainImagePath: paths.mainImage,
        diffImagePath: paths.diffImage,
        outputPath: finalPath,
        languageId: 1, // English
      });

      // Create image variant record
      const imageVariant = await prisma.imageVariant.create({
        data: {
          recordId: record.id,
          version: nextVariantNumber,
          imageMainPath: paths.mainImage,
          imageDiffPath: paths.diffImage,
          finalImages: {
            en: `/images/combinations/${combination.combinationKey}/v${nextVariantNumber}_final_en.png`,
          },
        },
      });

      // Update record as image generated
      await prisma.record.update({
        where: { id: record.id },
        data: {
          imageGenerated: true,
          providerUsed: mainResult.provider,
          providerAttempts: [
            {
              provider: mainResult.provider,
              success: true,
              attemptedAt: new Date().toISOString(),
              round: 'main',
            },
            {
              provider: mainResult.provider,
              success: true,
              attemptedAt: new Date().toISOString(),
              round: 'diff',
            },
          ],
        },
      });

      const totalTimeMs = Date.now() - startTime;
      console.log(
        `[Variant Generation] Complete for ${imageId} (${totalTimeMs}ms)`
      );

      return NextResponse.json({
        success: true,
        data: {
          record: {
            id: record.id,
            imageId,
            variantNumber: nextVariantNumber,
          },
          variant: imageVariant,
          provider: mainResult.provider,
          totalTimeMs,
        },
        message: `Variant v${nextVariantNumber} generated successfully`,
      });
    } catch (error) {
      // Clean up on failure
      console.error(`[Variant Generation] Failed for ${imageId}:`, error);

      // Delete the record if image generation failed
      await prisma.record.delete({
        where: { id: record.id },
      });

      throw error;
    }
  } catch (error) {
    console.error(
      `[API] POST /api/combinations/${(await params).id}/generate error:`,
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate variant',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
