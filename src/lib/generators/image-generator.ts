/**
 * Image Generator
 * Implements the 3-round image generation flow:
 * Round 1: Generate main image from main prompt
 * Round 2: Generate diff image from diff prompt + main image (same provider)
 * Round 3: Stitch final images with text overlay for 7 languages
 */

import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db/prisma';
import { ProviderManager, ProviderAttempt } from '@/lib/providers';
import { ImageStitcher } from '@/lib/stitcher/image-stitcher';

/**
 * Language IDs for final image generation
 * 1 = en, 2 = fr, 3 = ja, 4 = ko, 5 = de, 6 = es, 7 = zh
 */
export const LANGUAGE_IDS = [1, 2, 3, 4, 5, 6, 7] as const;
export type LanguageId = (typeof LANGUAGE_IDS)[number];

/**
 * Options for image generation
 */
export interface ImageGenerationOptions {
  /**
   * Language IDs to generate final images for
   * Default: all 7 languages
   */
  languageIds?: LanguageId[];

  /**
   * Whether to overwrite existing images
   * Default: false
   */
  overwrite?: boolean;
}

/**
 * Result of image generation
 */
export interface ImageGenerationResult {
  /**
   * Image ID that was generated
   */
  imageId: string;

  /**
   * Version number created
   */
  version: number;

  /**
   * Provider used for generation
   */
  provider: string;

  /**
   * Paths to generated images
   */
  paths: {
    mainImage: string;
    diffImage: string;
    finalImages: Record<string, string>; // { en: "path", fr: "path", ... }
  };

  /**
   * Total generation time in milliseconds
   */
  totalTimeMs: number;
}

/**
 * Image Generator - orchestrates 3-round generation flow
 */
export class ImageGenerator {
  private providerManager: ProviderManager;
  private stitcher: ImageStitcher;

  constructor(providerManager: ProviderManager) {
    this.providerManager = providerManager;
    this.stitcher = new ImageStitcher();
  }

  /**
   * Generate images for a record using the 3-round flow
   */
  async generateThreeRounds(
    imageId: string,
    options: ImageGenerationOptions = {}
  ): Promise<ImageGenerationResult> {
    const startTime = Date.now();
    const languageIds = options.languageIds || [...LANGUAGE_IDS];

    console.log(
      `[ImageGenerator] Starting 3-round generation for ${imageId}`
    );

    // Load record with prompts
    const record = await this.loadRecord(imageId);

    // Check if prompts exist
    const mainPrompt = record.prompts.find((p) => p.type === 'MAIN');
    const diffPrompt = record.prompts.find((p) => p.type === 'DIFF');

    if (!mainPrompt || !diffPrompt) {
      throw new Error(
        `Prompts not generated for ${imageId}. Please generate prompts first.`
      );
    }

    // Determine version number
    const version = (record.variants?.length || 0) + 1;

    // Create image directory
    const imageDir = path.join(
      process.cwd(),
      'public',
      'images',
      imageId
    );
    await fs.mkdir(imageDir, { recursive: true });

    // Track provider attempts
    const providerAttempts: ProviderAttempt[] = [];

    try {
      // ===== ROUND 1: Generate Main Image =====
      console.log(`[ImageGenerator] Round 1: Generating main image...`);
      const round1Start = Date.now();

      const mainResult = await this.providerManager.generateWithFallback(
        mainPrompt.promptEn
      );

      // Track provider attempts from Round 1
      // Note: ProviderManager's generateWithFallback tracks attempts internally
      // We'll record these in the database at the end

      // Save main image
      const mainPath = path.join(imageDir, `v${version}_main.png`);
      await fs.writeFile(mainPath, mainResult.image);

      providerAttempts.push({
        provider: mainResult.provider,
        success: true,
        attemptedAt: new Date(),
        responseTimeMs: mainResult.generationTimeMs,
      });

      console.log(
        `[ImageGenerator] ✅ Round 1 complete (${Date.now() - round1Start}ms): ${mainPath}`
      );

      // ===== ROUND 2: Generate Diff Image (same provider) =====
      console.log(
        `[ImageGenerator] Round 2: Generating diff image with ${mainResult.provider}...`
      );
      const round2Start = Date.now();

      const round2StartTime = Date.now();
      const diffImage = await this.providerManager.generateWithProvider(
        mainResult.provider, // Force same provider as Round 1
        diffPrompt.promptEn,
        mainResult.image // Pass main image as context
      );

      // Save diff image
      const diffPath = path.join(imageDir, `v${version}_diff.png`);
      await fs.writeFile(diffPath, diffImage);

      providerAttempts.push({
        provider: mainResult.provider,
        success: true,
        attemptedAt: new Date(),
        responseTimeMs: Date.now() - round2StartTime,
      });

      console.log(
        `[ImageGenerator] ✅ Round 2 complete (${Date.now() - round2Start}ms): ${diffPath}`
      );

      // ===== ROUND 3: Stitch Final Images (7 languages) =====
      console.log(
        `[ImageGenerator] Round 3: Stitching ${languageIds.length} language variant(s)...`
      );
      const round3Start = Date.now();

      const finalImages: Record<string, string> = {};

      for (const langId of languageIds) {
        const langCode = this.getLangCode(langId);
        const outputPath = path.join(
          imageDir,
          `v${version}_final_${langCode}.png`
        );

        await this.stitcher.stitch({
          mainImagePath: mainPath,
          diffImagePath: diffPath,
          outputPath,
          languageId: langId,
        });

        // Store relative path from public directory
        const relativePath = path.relative(
          path.join(process.cwd(), 'public'),
          outputPath
        );
        finalImages[langCode] = `/${relativePath.replace(/\\/g, '/')}`;

        console.log(
          `[ImageGenerator]   ✅ ${langCode}: ${relativePath}`
        );
      }

      console.log(
        `[ImageGenerator] ✅ Round 3 complete (${Date.now() - round3Start}ms)`
      );

      // ===== Update Database =====
      await this.updateDatabase(
        record.id,
        version,
        mainPath,
        diffPath,
        finalImages,
        mainResult.provider,
        providerAttempts
      );

      const totalTimeMs = Date.now() - startTime;
      console.log(
        `[ImageGenerator] 🎉 3-round generation complete for ${imageId} (${totalTimeMs}ms total)`
      );

      return {
        imageId,
        version,
        provider: mainResult.provider,
        paths: {
          mainImage: mainPath,
          diffImage: diffPath,
          finalImages,
        },
        totalTimeMs,
      };
    } catch (error) {
      // Record failure in database
      await this.recordFailure(record.id, error, providerAttempts);

      console.error(
        `[ImageGenerator] ❌ Generation failed for ${imageId}:`,
        error
      );

      throw error;
    }
  }

  /**
   * Load record from database with prompts
   */
  private async loadRecord(imageId: string) {
    const record = await prisma.record.findUnique({
      where: { imageId },
      include: {
        prompts: true,
        variants: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!record) {
      throw new Error(`Record not found: ${imageId}`);
    }

    return record;
  }

  /**
   * Update database with generation results
   */
  private async updateDatabase(
    recordId: string,
    version: number,
    mainPath: string,
    diffPath: string,
    finalImages: Record<string, string>,
    provider: string,
    attempts: ProviderAttempt[]
  ) {
    // Create image variant
    await prisma.imageVariant.create({
      data: {
        recordId,
        version,
        imageMainPath: mainPath,
        imageDiffPath: diffPath,
        finalImages,
      },
    });

    // Update record
    await prisma.record.update({
      where: { id: recordId },
      data: {
        imageGenerated: true,
        providerUsed: provider,
        providerAttempts: attempts as any,
      },
    });

    console.log(
      `[ImageGenerator] Database updated: ImageVariant v${version} created`
    );
  }

  /**
   * Record failure in database
   */
  private async recordFailure(
    recordId: string,
    error: unknown,
    attempts: ProviderAttempt[]
  ) {
    try {
      await prisma.record.update({
        where: { id: recordId },
        data: {
          providerAttempts: attempts as any,
        },
      });
    } catch (dbError) {
      console.error(
        '[ImageGenerator] Failed to record failure in database:',
        dbError
      );
    }
  }

  /**
   * Get language code from language ID
   */
  private getLangCode(langId: LanguageId): string {
    const codes: Record<LanguageId, string> = {
      1: 'en',
      2: 'fr',
      3: 'ja',
      4: 'ko',
      5: 'de',
      6: 'es',
      7: 'zh',
    };
    return codes[langId];
  }
}
