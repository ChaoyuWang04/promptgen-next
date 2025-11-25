/**
 * Font Loader
 * Loads and registers fonts for multi-language text rendering
 * Matches Python's font loading logic with cross-platform support
 */

import { registerFont } from 'canvas';
import fs from 'fs';
import path from 'path';
import { getLanguageFontFile } from './languages';

/**
 * Font search paths (in order of priority)
 * Matches Python's FONT_PATHS configuration
 */
const FONT_SEARCH_PATHS = [
  'public/fonts',           // Next.js public directory
  'fonts',                  // Relative to project root
  '/System/Library/Fonts',  // macOS system fonts
  '/Library/Fonts',         // macOS user fonts
  'C:\\Windows\\Fonts',     // Windows system fonts
];

/**
 * Cache for loaded fonts to avoid re-registration
 */
const loadedFonts = new Set<string>();

/**
 * Find font file in search paths
 *
 * @param fontFileName Font file name (e.g., 'ARIAL.TTF')
 * @returns Full path to font file
 * @throws Error if font file not found in any search path
 */
function findFontFile(fontFileName: string): string {
  // Try each search path
  for (const basePath of FONT_SEARCH_PATHS) {
    const fullPath = path.isAbsolute(basePath)
      ? path.join(basePath, fontFileName)
      : path.join(process.cwd(), basePath, fontFileName);

    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  // Font not found in any path
  throw new Error(
    `Font file not found: ${fontFileName}\n` +
      `Searched paths:\n${FONT_SEARCH_PATHS.map((p) => `  - ${p}`).join('\n')}`
  );
}

/**
 * Load and register font for a specific language
 *
 * @param languageId Language ID (1-7)
 * @returns Font family name to use in canvas context
 *
 * @example
 * const fontFamily = loadFont(1);  // Returns 'Font_English'
 * ctx.font = `${fontSize}px ${fontFamily}`;
 */
export function loadFont(languageId: number): string {
  // Get font file name for this language
  const fontFileName = getLanguageFontFile(languageId);

  // Map to actual font family names (use the font's internal name)
  const fontFamilyMap: Record<number, string> = {
    1: 'Arial',           // English - ARIAL.TTF
    2: 'Noto Sans',       // French - NotoSans-Regular.ttf (or NotoSansJP-Regular.otf)
    3: 'Noto Sans JP',    // Japanese - NotoSansJP-Regular.otf
    4: 'Noto Sans KR',    // Korean - NotoSansKR-Regular.otf
    5: 'Noto Sans',       // German - NotoSans-Regular.ttf
    6: 'Noto Sans',       // Spanish - NotoSans-Regular.ttf
    7: 'Noto Sans TC',    // Chinese - NotoSansTC-Regular.otf
  };

  const fontFamily = fontFamilyMap[languageId] || 'Arial';

  // Skip if already loaded (but still log it)
  if (loadedFonts.has(fontFamily)) {
    console.log(`[FontLoader] Font already loaded: ${fontFamily}`);
    return fontFamily;
  }

  try {
    // Find font file in search paths
    const fontPath = findFontFile(fontFileName);

    console.log(`[FontLoader] Loading font for language ${languageId}: ${fontFileName}`);
    console.log(`[FontLoader] Found at: ${fontPath}`);
    console.log(`[FontLoader] Registering as font family: "${fontFamily}"`);

    // Register font with node-canvas using the font's actual family name
    registerFont(fontPath, {
      family: fontFamily,
      weight: 'normal',
      style: 'normal',
    });

    // Mark as loaded
    loadedFonts.add(fontFamily);

    console.log(`[FontLoader] Successfully registered: ${fontFamily}`);
    return fontFamily;
  } catch (error) {
    console.error(`[FontLoader] Failed to load font for language ${languageId}:`, error);
    throw new Error(
      `Failed to load font for language ${languageId}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Preload all fonts for all languages
 * Useful for initialization to avoid lazy loading delays
 *
 * @returns Array of loaded font family names
 */
export function preloadAllFonts(): string[] {
  const fontFamilies: string[] = [];

  console.log('[FontLoader] Preloading all fonts for 7 languages...');

  for (let languageId = 1; languageId <= 7; languageId++) {
    try {
      const fontFamily = loadFont(languageId);
      fontFamilies.push(fontFamily);
    } catch (error) {
      console.warn(`[FontLoader] Failed to preload font for language ${languageId}:`, error);
    }
  }

  console.log(`[FontLoader] Preloaded ${fontFamilies.length}/7 fonts successfully`);
  return fontFamilies;
}

/**
 * Check if all required font files exist
 *
 * @returns Object with check results for each language
 */
export function checkFontFiles(): Record<number, { exists: boolean; path?: string; error?: string }> {
  const results: Record<number, { exists: boolean; path?: string; error?: string }> = {};

  for (let languageId = 1; languageId <= 7; languageId++) {
    const fontFileName = getLanguageFontFile(languageId);

    try {
      const fontPath = findFontFile(fontFileName);
      results[languageId] = { exists: true, path: fontPath };
    } catch (error) {
      results[languageId] = {
        exists: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return results;
}

/**
 * Clear font cache (useful for testing)
 */
export function clearFontCache(): void {
  loadedFonts.clear();
  console.log('[FontLoader] Font cache cleared');
}

/**
 * Auto-preload all fonts at module load time
 * This ensures fonts are registered before any canvas operations
 */
try {
  console.log('[FontLoader] Auto-preloading all fonts at module initialization...');
  preloadAllFonts();
  console.log('[FontLoader] Auto-preload complete');
} catch (error) {
  console.error('[FontLoader] Auto-preload failed:', error);
}
