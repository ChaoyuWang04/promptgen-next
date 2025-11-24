/**
 * Canvas Renderer
 * Multi-color text rendering with node-canvas
 * Matches Python's draw_multicolor_centered_text function
 */

import { createCanvas, Canvas, CanvasRenderingContext2D } from 'canvas';
import { parseColoredSpans, ColorSpan } from './color-parser';
import { loadFont } from './font-loader';

/**
 * Text rendering options
 */
export interface TextRenderOptions {
  /**
   * Text to render (with color tags)
   */
  text: string;

  /**
   * Canvas to draw on
   */
  canvas: Canvas;

  /**
   * Canvas 2D context
   */
  ctx: CanvasRenderingContext2D;

  /**
   * X position (horizontal center)
   */
  x: number;

  /**
   * Y position (baseline)
   */
  y: number;

  /**
   * Font size in pixels
   */
  fontSize: number;

  /**
   * Font family name
   */
  fontFamily: string;

  /**
   * Default text color (for untagged text)
   */
  defaultColor?: string;
}

/**
 * Calculate line height based on font metrics
 * Matches Python's logic: ascent + descent + extra spacing
 *
 * @param ctx Canvas 2D context
 * @param fontSize Font size in pixels
 * @returns Line height in pixels
 */
export function getLineHeight(ctx: CanvasRenderingContext2D, fontSize: number): number {
  // Get font metrics
  const metrics = ctx.measureText('M');

  // Calculate line height from metrics
  // Python uses: ascent + descent + (ascent * 0.2)
  const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
  const descent = metrics.actualBoundingBoxDescent || fontSize * 0.2;
  const extraSpacing = ascent * 0.2;

  const lineHeight = Math.ceil(ascent + descent + extraSpacing);

  return lineHeight;
}

/**
 * Draw multi-color centered text
 * Matches Python's draw_multicolor_centered_text function
 *
 * This function:
 * 1. Parses color tags in text
 * 2. Measures total text width
 * 3. Calculates starting X position for centering
 * 4. Draws each color span sequentially
 *
 * @param options Text rendering options
 * @returns Total text width in pixels
 *
 * @example
 * drawMulticolorCenteredText({
 *   text: "I've tried <c:#ff1a1a>542</c> times",
 *   canvas,
 *   ctx,
 *   x: 720,  // Center of left half (1440/2)
 *   y: 100,
 *   fontSize: 110,
 *   fontFamily: 'Font_Lang1',
 * });
 */
export function drawMulticolorCenteredText(options: TextRenderOptions): number {
  const { text, ctx, x, y, fontSize, fontFamily, defaultColor = '#000000' } = options;

  // Parse colored spans
  const spans = parseColoredSpans(text, defaultColor);

  if (spans.length === 0) {
    return 0;
  }

  // Set font for measurements
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'alphabetic';

  // Measure total width
  let totalWidth = 0;
  const spanWidths: number[] = [];

  for (const span of spans) {
    const width = ctx.measureText(span.text).width;
    spanWidths.push(width);
    totalWidth += width;
  }

  // Calculate starting X position (centered)
  let currentX = x - totalWidth / 2;

  // Draw each span with its color
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    const spanWidth = spanWidths[i];

    // Set color for this span
    ctx.fillStyle = span.color;

    // Draw text
    ctx.fillText(span.text, currentX, y);

    // Move to next position
    currentX += spanWidth;
  }

  return totalWidth;
}

/**
 * Draw two-line centered text block
 * Used for game narrative templates (line1 + line2)
 *
 * @param canvas Canvas to draw on
 * @param ctx Canvas 2D context
 * @param line1 First line text (with color tags)
 * @param line2 Second line text (with color tags)
 * @param x X position (horizontal center)
 * @param y Y position (top of text block)
 * @param fontSize Font size in pixels
 * @param fontFamily Font family name
 * @param defaultColor Default text color
 * @returns Total height of text block in pixels
 */
export function drawTwoLineCenteredText(
  canvas: Canvas,
  ctx: CanvasRenderingContext2D,
  line1: string,
  line2: string,
  x: number,
  y: number,
  fontSize: number,
  fontFamily: string,
  defaultColor: string = '#000000'
): number {
  // Set font
  ctx.font = `${fontSize}px ${fontFamily}`;

  // Calculate line height
  const lineHeight = getLineHeight(ctx, fontSize);

  // Draw line 1
  const y1 = y + lineHeight;
  drawMulticolorCenteredText({
    text: line1,
    canvas,
    ctx,
    x,
    y: y1,
    fontSize,
    fontFamily,
    defaultColor,
  });

  // Draw line 2
  const y2 = y1 + lineHeight;
  drawMulticolorCenteredText({
    text: line2,
    canvas,
    ctx,
    x,
    y: y2,
    fontSize,
    fontFamily,
    defaultColor,
  });

  // Return total height
  return lineHeight * 2;
}

/**
 * Create a blank canvas with specified dimensions
 *
 * @param width Canvas width in pixels
 * @param height Canvas height in pixels
 * @param bgColor Background color (default: white)
 * @returns Canvas and its 2D context
 */
export function createBlankCanvas(
  width: number,
  height: number,
  bgColor: string = '#ffffff'
): { canvas: Canvas; ctx: CanvasRenderingContext2D } {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fill background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  return { canvas, ctx };
}

/**
 * Render single-color text (for debugging)
 *
 * @param ctx Canvas 2D context
 * @param text Text to render
 * @param x X position
 * @param y Y position
 * @param fontSize Font size in pixels
 * @param fontFamily Font family name
 * @param color Text color
 */
export function drawSimpleText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fontFamily: string,
  color: string = '#000000'
): void {
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}
