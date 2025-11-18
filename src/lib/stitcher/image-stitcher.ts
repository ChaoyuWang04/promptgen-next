/**
 * Image Stitcher
 * Stitches main and diff images side-by-side with multi-language text overlay
 */

import fs from 'fs/promises';
import sharp from 'sharp';
import { TextOverlay } from './text-overlay';

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
}

/**
 * Image Stitcher Class
 * Handles horizontal stitching of main and diff images with text overlay
 */
export class ImageStitcher {
  private textOverlay: TextOverlay;

  // Standard image dimensions for 9:16 aspect ratio
  // ByteDance: 1440x2560, Gemini: 9:16 ratio
  private readonly SINGLE_IMAGE_WIDTH = 1440;
  private readonly SINGLE_IMAGE_HEIGHT = 2560;
  private readonly STITCHED_WIDTH = 2880; // 1440 * 2
  private readonly STITCHED_HEIGHT = 2560;

  constructor() {
    this.textOverlay = new TextOverlay();
  }

  /**
   * Stitch main and diff images side-by-side with text overlay
   */
  async stitch(options: StitchOptions): Promise<string> {
    const { mainImagePath, diffImagePath, outputPath, languageId } = options;

    console.log(
      `[ImageStitcher] Stitching ${mainImagePath} + ${diffImagePath} → ${outputPath}`
    );

    try {
      // Load both images
      const [mainImageBuffer, diffImageBuffer] = await Promise.all([
        fs.readFile(mainImagePath),
        fs.readFile(diffImagePath),
      ]);

      // Verify and resize images to standard size if needed
      const [mainResized, diffResized] = await Promise.all([
        this.ensureImageSize(mainImageBuffer, 'main'),
        this.ensureImageSize(diffImageBuffer, 'diff'),
      ]);

      // Create base canvas
      const canvas = await sharp({
        create: {
          width: this.STITCHED_WIDTH,
          height: this.STITCHED_HEIGHT,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .png()
        .toBuffer();

      // Composite both images side-by-side
      const stitchedWithoutText = await sharp(canvas)
        .composite([
          {
            input: mainResized,
            left: 0,
            top: 0,
          },
          {
            input: diffResized,
            left: this.SINGLE_IMAGE_WIDTH,
            top: 0,
          },
        ])
        .png()
        .toBuffer();

      // Add text overlay
      const finalImage = await this.textOverlay.addTextOverlay({
        imageBuffer: stitchedWithoutText,
        width: this.STITCHED_WIDTH,
        height: this.STITCHED_HEIGHT,
        languageId,
      });

      // Save final image
      await fs.writeFile(outputPath, finalImage);

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
   * Ensure image is the correct size (1440x2560, 9:16 aspect ratio)
   * Resize if necessary to match old system behavior
   */
  private async ensureImageSize(
    imageBuffer: Buffer,
    label: string
  ): Promise<Buffer> {
    try {
      const metadata = await sharp(imageBuffer).metadata();

      if (
        metadata.width === this.SINGLE_IMAGE_WIDTH &&
        metadata.height === this.SINGLE_IMAGE_HEIGHT
      ) {
        // Already correct size
        return imageBuffer;
      }

      console.log(
        `[ImageStitcher] Resizing ${label} image from ${metadata.width}x${metadata.height} to ${this.SINGLE_IMAGE_WIDTH}x${this.SINGLE_IMAGE_HEIGHT}`
      );

      // Resize to standard 9:16 size
      return sharp(imageBuffer)
        .resize(this.SINGLE_IMAGE_WIDTH, this.SINGLE_IMAGE_HEIGHT, {
          fit: 'cover',
          position: 'center',
        })
        .png()
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to process ${label} image: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Stitch images without text overlay (utility method)
   */
  async stitchWithoutText(
    mainImagePath: string,
    diffImagePath: string,
    outputPath: string
  ): Promise<string> {
    console.log(
      `[ImageStitcher] Stitching without text: ${mainImagePath} + ${diffImagePath}`
    );

    try {
      // Load both images
      const [mainImageBuffer, diffImageBuffer] = await Promise.all([
        fs.readFile(mainImagePath),
        fs.readFile(diffImagePath),
      ]);

      // Verify and resize images
      const [mainResized, diffResized] = await Promise.all([
        this.ensureImageSize(mainImageBuffer, 'main'),
        this.ensureImageSize(diffImageBuffer, 'diff'),
      ]);

      // Create base canvas
      const canvas = await sharp({
        create: {
          width: this.STITCHED_WIDTH,
          height: this.STITCHED_HEIGHT,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .png()
        .toBuffer();

      // Composite both images
      const stitched = await sharp(canvas)
        .composite([
          {
            input: mainResized,
            left: 0,
            top: 0,
          },
          {
            input: diffResized,
            left: this.SINGLE_IMAGE_WIDTH,
            top: 0,
          },
        ])
        .png()
        .toFile(outputPath);

      console.log(`[ImageStitcher] ✅ Stitching complete (no text): ${outputPath}`);

      return outputPath;
    } catch (error) {
      console.error('[ImageStitcher] Stitching failed:', error);
      throw new Error(
        `Failed to stitch images: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get stitched image dimensions
   */
  getDimensions(): { width: number; height: number } {
    return {
      width: this.STITCHED_WIDTH,
      height: this.STITCHED_HEIGHT,
    };
  }
}
