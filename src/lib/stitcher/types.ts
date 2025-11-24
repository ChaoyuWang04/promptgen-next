/**
 * Stitcher Types
 * Type definitions for image stitching system (matching Python implementation)
 */

/**
 * Language template with game narrative text
 */
export interface LanguageTemplate {
  name: string;
  line1: string;  // First line with color tags, e.g., "I've tried <c:#ff1a1a>{tries}</c> times but"
  line2: string;  // Second line with color tags
}

/**
 * Color span for multi-color inline text rendering
 */
export interface ColorSpan {
  text: string;
  color: string;  // Hex color format: #RRGGBB
}

/**
 * Stitch configuration options
 */
export interface StitchConfig {
  /**
   * Font size for title text (default: 110px)
   */
  titleSize: number;

  /**
   * Padding around canvas edges (default: 40px)
   */
  pad: number;

  /**
   * Gap between left and right images (default: 20px)
   */
  gap: number;

  /**
   * Background color (default: '#ffffff')
   */
  bgColor: string;

  /**
   * Auto-calculate header height based on font metrics (default: true)
   */
  autoHeader: boolean;

  /**
   * Minimum value for random "tries" number (default: 300)
   */
  triesMin: number;

  /**
   * Maximum value for random "tries" number (default: 999)
   */
  triesMax: number;

  /**
   * Minimum value for random "differences" number (default: 10)
   */
  diffsMin: number;

  /**
   * Maximum value for random "differences" number (default: 20)
   */
  diffsMax: number;
}

/**
 * Result from stitching operation
 */
export interface StitchResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;

  /**
   * Path to output file (on success)
   */
  outputPath?: string;

  /**
   * Language name (on success)
   */
  language?: string;

  /**
   * Random "tries" number used (on success)
   */
  tries?: number;

  /**
   * Random "diffs" number used (on success)
   */
  diffs?: number;

  /**
   * Final canvas dimensions (on success)
   */
  dimensions?: {
    width: number;
    height: number;
  };

  /**
   * Error message (on failure)
   */
  error?: string;

  /**
   * Error stage (on failure)
   */
  stage?: string;
}

/**
 * Default configuration values (matching Python implementation)
 */
export const DEFAULT_STITCH_CONFIG: StitchConfig = {
  titleSize: 110,
  pad: 40,
  gap: 20,
  bgColor: '#ffffff',
  autoHeader: true,
  triesMin: 300,
  triesMax: 999,
  diffsMin: 10,
  diffsMax: 20,
};
