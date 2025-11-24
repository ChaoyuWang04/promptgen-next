/**
 * Color Tag Parser
 * Parses text with <c:#color>text</c> tags into color spans
 * Matches Python's TAG_RE pattern and parse_colored_spans function
 */

import { ColorSpan } from './types';

// Re-export ColorSpan type for consumers
export type { ColorSpan };

/**
 * Regular expression for color tags
 * Pattern: <c:#RRGGBB>text</c> or <c:#RGB>text</c>
 * Matches Python's TAG_RE = re.compile(r"<c:(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})>(.*?)</c>")
 */
const COLOR_TAG_REGEX = /<c:(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})>(.*?)<\/c>/g;

/**
 * Parse text with color tags into color spans
 *
 * @param text Text with color tags, e.g., "I've tried <c:#ff1a1a>542</c> times"
 * @param defaultColor Default color for untagged text (default: '#000000')
 * @returns Array of color spans
 *
 * @example
 * parseColoredSpans("Hello <c:#ff0000>red</c> world")
 * // Returns: [
 * //   { text: "Hello ", color: "#000000" },
 * //   { text: "red", color: "#ff0000" },
 * //   { text: " world", color: "#000000" }
 * // ]
 */
export function parseColoredSpans(
  text: string,
  defaultColor: string = '#000000'
): ColorSpan[] {
  const spans: ColorSpan[] = [];
  let lastIndex = 0;

  // Use matchAll to find all color tag matches
  const matches = text.matchAll(COLOR_TAG_REGEX);

  for (const match of matches) {
    const matchIndex = match.index!;
    const color = match[1];  // Captured color (#RRGGBB or #RGB)
    const taggedText = match[2];  // Text inside tags

    // Add text before this tag (if any) with default color
    if (matchIndex > lastIndex) {
      const beforeText = text.substring(lastIndex, matchIndex);
      spans.push({ text: beforeText, color: defaultColor });
    }

    // Add tagged text with its color
    spans.push({ text: taggedText, color });

    // Update position
    lastIndex = matchIndex + match[0].length;
  }

  // Add remaining text after last tag (if any)
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    spans.push({ text: remainingText, color: defaultColor });
  }

  return spans;
}

/**
 * Expand short hex colors (#RGB) to full format (#RRGGBB)
 *
 * @param color Hex color in short or full format
 * @returns Full hex color format
 *
 * @example
 * expandShortHex('#f00')  // Returns: '#ff0000'
 * expandShortHex('#ff0000')  // Returns: '#ff0000'
 */
export function expandShortHex(color: string): string {
  if (color.length === 4) {
    // Short format: #RGB -> #RRGGBB
    const r = color[1];
    const g = color[2];
    const b = color[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return color;
}

/**
 * Validate hex color format
 *
 * @param color Color string to validate
 * @returns True if valid hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}
