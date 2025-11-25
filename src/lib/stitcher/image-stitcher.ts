/**
 * Image Stitcher
 * Complete replication of Python stitch_generator.py algorithm
 * Stitches main and diff images side-by-side with multi-language game narrative text
 */

import fs from 'fs/promises';
import sharp from 'sharp';
import { createCanvas, Image, loadImage } from 'canvas';
import {
  getLanguageTemplate,
  getLanguageFontSize,
  isValidLanguageId,
} from './languages';
import { loadFont } from './font-loader';
import {
  drawTwoLineCenteredText,
  getLineHeight,
} from './canvas-renderer';
import { StitchConfig, StitchResult, DEFAULT_STITCH_CONFIG } from './types';

/**
 * Stitch options
 */
export interface StitchOptions {
  /**
   * Path to the main image (left side)
   */
  mainImagePath: string;

  /**
   * Path to the diff image (right side)
   */
  diffImagePath: string;

  /**
   * Output path for the stitched image
   */
  outputPath: string;

  /**
   * Language ID for text overlay (1-7)
   */
  languageId: number;

  /**
   * Optional configuration overrides
   */
  config?: Partial<StitchConfig>;
}

/**
 * Image Stitcher Class
 * Matches Python's stitch_generator.py logic exactly
 */
export class ImageStitcher {
  private config: StitchConfig;

  constructor(config?: Partial<StitchConfig>) {
    this.config = { ...DEFAULT_STITCH_CONFIG, ...config };
  }

  /**
   * Stitch main and diff images with game narrative text
   * Main entry point - matches Python's generate() function
   */
  async stitch(options: StitchOptions): Promise<string> {
    const { mainImagePath, diffImagePath, outputPath, languageId } = options;

    console.log(
      `[ImageStitcher] Stitching ${mainImagePath} + ${diffImagePath} → ${outputPath}`
    );
    console.log(`[ImageStitcher] Language ID: ${languageId}`);

    try {
      // Validate language ID
      if (!isValidLanguageId(languageId)) {
        throw new Error(`Invalid language ID: ${languageId}. Must be 1-7.`);
      }

      // Get language configuration
      const template = getLanguageTemplate(languageId);
      const fontSize = getLanguageFontSize(languageId);

      console.log(`[ImageStitcher] Language: ${template.name}, Font size: ${fontSize}px`);

      // Load font
      const fontFamily = loadFont(languageId);
      console.log(`[ImageStitcher] Using font family: "${fontFamily}"`);

      // Generate tries number (use fixed value if configured, otherwise random)
      const tries = this.config.fixedTries ?? this.randomInt(this.config.triesMin, this.config.triesMax);
      const diffs = this.randomInt(this.config.diffsMin, this.config.diffsMax);

      console.log(`[ImageStitcher] Values: tries=${tries}${this.config.fixedTries ? ' (fixed)' : ''}, diffs=${diffs}`);

      // Substitute template variables
      const line1 = this.substituteVariables(template.line1, { tries, diffs });
      const line2 = this.substituteVariables(template.line2, { tries, diffs });

      console.log(`[ImageStitcher] Line 1: ${line1}`);
      console.log(`[ImageStitcher] Line 2: ${line2}`);

      // Load images
      const [mainImage, diffImage] = await Promise.all([
        loadImage(mainImagePath),
        loadImage(diffImagePath),
      ]);

      console.log(
        `[ImageStitcher] Loaded images: main=${mainImage.width}x${mainImage.height}, diff=${diffImage.width}x${diffImage.height}`
      );

      // Resize images to same height (preserving aspect ratios)
      const { leftImage, rightImage, targetHeight } = await this.resizeImagesSameHeight(
        mainImage,
        diffImage
      );

      console.log(
        `[ImageStitcher] Resized to same height: ${targetHeight}px (left=${leftImage.width}x${leftImage.height}, right=${rightImage.width}x${rightImage.height})`
      );

      // Create temporary canvas for line height measurement
      const tempCanvas = createCanvas(100, 100);
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.font = `${fontSize}px ${fontFamily}`;

      // Calculate line height
      const lineHeight = getLineHeight(tempCtx, fontSize);

      // Calculate header height (2 lines + padding)
      const headerHeight = Math.ceil(lineHeight * 2 + this.config.pad);

      // Calculate canvas dimensions (dynamic width based on image sizes - Python style)
      // Formula: pad + leftWidth + gap + rightWidth + pad
      const canvasWidth = this.config.pad + leftImage.width + this.config.gap + rightImage.width + this.config.pad;
      const canvasHeight = headerHeight + targetHeight + this.config.pad;

      console.log(
        `[ImageStitcher] Canvas dimensions: ${canvasWidth}x${canvasHeight} (header=${headerHeight}px, images=${targetHeight}px, dynamic width)`
      );

      // Create final canvas
      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext('2d');

      // Fill background (ensure it's opaque white)
      ctx.fillStyle = this.config.bgColor;
      ctx.globalAlpha = 1.0;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      console.log(`[ImageStitcher] Background filled: ${this.config.bgColor}, alpha=1.0`);

      // Calculate image positions (side-by-side with gap - Python style)
      const leftImageX = this.config.pad;
      const rightImageX = this.config.pad + leftImage.width + this.config.gap;
      const imageY = headerHeight;

      // Draw images
      ctx.drawImage(leftImage, leftImageX, imageY, leftImage.width, leftImage.height);
      ctx.drawImage(rightImage, rightImageX, imageY, rightImage.width, rightImage.height);

      console.log(
        `[ImageStitcher] Images placed side-by-side: left=(${leftImageX}, ${imageY}), right=(${rightImageX}, ${imageY}), gap=${this.config.gap}px`
      );

      // Draw text overlay (centered on entire canvas top - Python style, shown once only)
      const textX = canvasWidth / 2;
      const textY = this.config.pad;

      // Confirm font setting before rendering text
      // Use full font specification: [style] [variant] [weight] [size] [family]
      ctx.font = `normal normal normal ${fontSize}px ${fontFamily}`;
      console.log(`[ImageStitcher] Font before text render: "${ctx.font}"`);

      drawTwoLineCenteredText(
        canvas,
        ctx,
        line1,
        line2,
        textX,
        textY,
        fontSize,
        fontFamily,
        '#000000'
      );

      console.log(`[ImageStitcher] Text overlay rendered (centered at x=${textX})`);

      // Convert canvas to buffer
      const buffer = canvas.toBuffer('image/png');

      // Save final image
      await fs.writeFile(outputPath, buffer);

      console.log(`[ImageStitcher] ✅ Stitching complete: ${outputPath}`);

      return outputPath;
    } catch (error) {
      console.error('[ImageStitcher] Stitching failed:', error);
      throw new Error(
        `Failed to stitch images: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Resize images to same height while preserving aspect ratios
   * Matches Python's resize_images_same_height function
   *
   * Algorithm:
   * 1. Calculate target height = min(leftHeight, rightHeight)
   * 2. Calculate new widths based on target height (preserving aspect ratios)
   * 3. Resize both images to target height
   *
   * @param leftImage Left image (main)
   * @param rightImage Right image (diff)
   * @returns Resized images and target height
   */
  private async resizeImagesSameHeight(
    leftImage: Image,
    rightImage: Image
  ): Promise<{
    leftImage: Image;
    rightImage: Image;
    targetHeight: number;
  }> {
    const leftWidth = leftImage.width;
    const leftHeight = leftImage.height;
    const rightWidth = rightImage.width;
    const rightHeight = rightImage.height;

    // Calculate target height (minimum of both heights)
    const targetHeight = Math.min(leftHeight, rightHeight);

    // Calculate new widths (preserving aspect ratios)
    const leftAspectRatio = leftWidth / leftHeight;
    const rightAspectRatio = rightWidth / rightHeight;

    const newLeftWidth = Math.round(targetHeight * leftAspectRatio);
    const newRightWidth = Math.round(targetHeight * rightAspectRatio);

    console.log(
      `[ImageStitcher] Resizing to target height ${targetHeight}px: left=${newLeftWidth}x${targetHeight}, right=${newRightWidth}x${targetHeight}`
    );

    // Resize left image
    const leftBuffer = await sharp(leftImage.src as Buffer)
      .resize(newLeftWidth, targetHeight, {
        fit: 'fill',
        kernel: sharp.kernel.lanczos3,
      })
      .png()
      .toBuffer();

    // Resize right image
    const rightBuffer = await sharp(rightImage.src as Buffer)
      .resize(newRightWidth, targetHeight, {
        fit: 'fill',
        kernel: sharp.kernel.lanczos3,
      })
      .png()
      .toBuffer();

    // Load resized images
    const resizedLeft = await loadImage(leftBuffer);
    const resizedRight = await loadImage(rightBuffer);

    return {
      leftImage: resizedLeft,
      rightImage: resizedRight,
      targetHeight,
    };
  }

  /**
   * Generate random integer between min and max (inclusive)
   * Matches Python's random.randint(a, b)
   */
  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Substitute template variables in text
   *
   * Variables:
   * - {tries}: Random number of attempts (300-999)
   * - {diffs}: Random number of differences (10-20)
   *
   * @param text Text with variables
   * @param variables Variable values
   * @returns Text with variables replaced
   */
  private substituteVariables(
    text: string,
    variables: { tries: number; diffs: number }
  ): string {
    return text
      .replace(/\{tries\}/g, String(variables.tries))
      .replace(/\{diffs\}/g, String(variables.diffs));
  }

  /**
   * Stitch images with detailed result information
   * Useful for testing and debugging
   */
  async stitchWithResult(options: StitchOptions): Promise<StitchResult> {
    try {
      const { languageId } = options;
      const template = getLanguageTemplate(languageId);

      // Generate random values
      const tries = this.randomInt(this.config.triesMin, this.config.triesMax);
      const diffs = this.randomInt(this.config.diffsMin, this.config.diffsMax);

      // Perform stitching
      const outputPath = await this.stitch(options);

      // Get dimensions
      const metadata = await sharp(outputPath).metadata();

      return {
        success: true,
        outputPath,
        language: template.name,
        tries,
        diffs,
        dimensions: {
          width: metadata.width || 0,
          height: metadata.height || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stage: 'stitch',
      };
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): StitchConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<StitchConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
