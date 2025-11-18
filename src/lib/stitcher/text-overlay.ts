/**
 * Text Overlay System
 * Adds multi-language text labels to stitched images using SVG
 */

import sharp from 'sharp';
import { getLanguageConfig } from './languages';

/**
 * Text overlay options
 */
export interface TextOverlayOptions {
  /**
   * Image buffer to add text to
   */
  imageBuffer: Buffer;

  /**
   * Image width in pixels
   */
  width: number;

  /**
   * Image height in pixels
   */
  height: number;

  /**
   * Language ID (1-7)
   */
  languageId: number;
}

/**
 * Text Overlay Class
 * Handles adding text labels to images using SVG compositing
 */
export class TextOverlay {
  /**
   * Add text overlay to image
   */
  async addTextOverlay(options: TextOverlayOptions): Promise<Buffer> {
    const { imageBuffer, width, height, languageId } = options;

    // Get language configuration
    const langConfig = getLanguageConfig(languageId);

    console.log(
      `[TextOverlay] Adding ${langConfig.name} text overlay (${langConfig.beforeText}/${langConfig.afterText})`
    );

    // Create SVG with text labels
    const svg = this.createTextSVG(width, height, langConfig);

    try {
      // Composite SVG onto image
      const result = await sharp(imageBuffer)
        .composite([
          {
            input: Buffer.from(svg),
            top: 0,
            left: 0,
          },
        ])
        .png()
        .toBuffer();

      console.log(`[TextOverlay] Text overlay complete`);
      return result;
    } catch (error) {
      console.error('[TextOverlay] Failed to add text overlay:', error);
      throw new Error(
        `Failed to add text overlay: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create SVG with text labels
   */
  private createTextSVG(
    width: number,
    height: number,
    langConfig: ReturnType<typeof getLanguageConfig>
  ): string {
    const halfWidth = width / 2;

    // Positions for text (centered above each half)
    const leftTextX = halfWidth / 2;
    const rightTextX = halfWidth + halfWidth / 2;
    const textY = 40; // 40px from top

    // Create SVG with text labels
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&family=Noto+Sans+KR:wght@700&family=Noto+Sans+SC:wght@700&display=swap');
          </style>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
            <feOffset dx="2" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.5"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- Background semi-transparent bars for better text readability -->
        <rect x="0" y="0" width="${halfWidth}" height="80" fill="rgba(0,0,0,0.5)"/>
        <rect x="${halfWidth}" y="0" width="${halfWidth}" height="80" fill="rgba(0,0,0,0.5)"/>

        <!-- "Before" text (left side) -->
        <text
          x="${leftTextX}"
          y="${textY}"
          font-family="${langConfig.fontFamily}"
          font-size="${langConfig.fontSize}"
          font-weight="${langConfig.fontWeight}"
          fill="${langConfig.color}"
          text-anchor="middle"
          dominant-baseline="middle"
          filter="url(#shadow)"
        >${this.escapeXml(langConfig.beforeText)}</text>

        <!-- "After" text (right side) -->
        <text
          x="${rightTextX}"
          y="${textY}"
          font-family="${langConfig.fontFamily}"
          font-size="${langConfig.fontSize}"
          font-weight="${langConfig.fontWeight}"
          fill="${langConfig.color}"
          text-anchor="middle"
          dominant-baseline="middle"
          filter="url(#shadow)"
        >${this.escapeXml(langConfig.afterText)}</text>
      </svg>
    `.trim();

    return svg;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
