/**
 * File Manager Utility
 *
 * Handles file storage paths for the combination-based storage structure.
 * New structure: public/images/combinations/{combinationKey}/
 *
 * Example:
 * - Combination key: betty_christmas_entrance
 * - Files: v1_main.png, v1_diff.png, v1_final_en.png, v2_main.png, etc.
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Library name to abbreviation mapping for combination keys
 */
const LIBRARY_ABBREVIATIONS: Record<string, string> = {
  character: 'char',
  pose: 'pose',
  scene: 'scene',
  theme: 'theme',
  style: 'style',
  decorative_props: 'props',
};

/**
 * Extract short name from library entry ID
 *
 * Examples:
 * - char_betty_v1 -> betty
 * - theme_christmas_v1 -> christmas
 * - scene_entrance_door_v1 -> entrance
 */
function extractShortName(entryId: string, libraryName: string): string {
  // Remove library prefix
  const prefix = LIBRARY_ABBREVIATIONS[libraryName];
  let name = entryId;

  if (prefix && entryId.startsWith(`${prefix}_`)) {
    name = entryId.substring(prefix.length + 1);
  }

  // Remove version suffix
  name = name.replace(/_v\d+$/, '');

  // Take first meaningful part (before any additional qualifiers)
  const parts = name.split('_');
  return parts[0];
}

/**
 * Generate combination key from library selections
 *
 * The key is built from the libraries used in the template,
 * in a consistent order for reproducibility.
 *
 * @param libraryIds - Map of library name to entry ID
 * @param libraryOrder - Optional order of libraries (default: alphabetical)
 * @returns Combination key string
 *
 * Example:
 * libraryIds = { character: "char_betty_v1", theme: "theme_christmas_v1", scene: "scene_entrance_door_v1" }
 * Returns: "betty_christmas_entrance"
 */
export function generateCombinationKey(
  libraryIds: Record<string, string>,
  libraryOrder?: string[]
): string {
  // Default order: character, pose, scene, theme, style, then any others alphabetically
  const defaultOrder = ['character', 'pose', 'scene', 'theme', 'style'];
  const order = libraryOrder || defaultOrder;

  const parts: string[] = [];

  // First, add libraries in specified order
  for (const library of order) {
    const entryId = libraryIds[library];
    if (entryId) {
      parts.push(extractShortName(entryId, library));
    }
  }

  // Then add any remaining libraries not in the order (alphabetically)
  const remainingLibraries = Object.keys(libraryIds)
    .filter((lib) => !order.includes(lib))
    .sort();

  for (const library of remainingLibraries) {
    const entryId = libraryIds[library];
    if (entryId) {
      parts.push(extractShortName(entryId, library));
    }
  }

  return parts.join('_');
}

/**
 * Get the storage directory for a combination
 */
export function getCombinationDirectory(combinationKey: string): string {
  return path.join(
    process.cwd(),
    'public',
    'images',
    'combinations',
    combinationKey
  );
}

/**
 * Get the relative path from public directory for a combination
 */
export function getCombinationRelativePath(combinationKey: string): string {
  return `/images/combinations/${combinationKey}`;
}

/**
 * Generate file paths for a variant
 */
export interface VariantPaths {
  mainImage: string;
  diffImage: string;
  finalImages: Record<string, string>;
  directory: string;
}

/**
 * Get file paths for a specific variant
 *
 * @param combinationKey - The combination key
 * @param variantNumber - The variant number (1, 2, 3, ...)
 * @param languages - Language codes to generate paths for
 * @returns Object with all file paths
 */
export function getVariantPaths(
  combinationKey: string,
  variantNumber: number,
  languages: string[] = ['en']
): VariantPaths {
  const directory = getCombinationDirectory(combinationKey);
  const relativePath = getCombinationRelativePath(combinationKey);

  const mainImage = path.join(directory, `v${variantNumber}_main.png`);
  const diffImage = path.join(directory, `v${variantNumber}_diff.png`);

  const finalImages: Record<string, string> = {};
  for (const lang of languages) {
    finalImages[lang] = `${relativePath}/v${variantNumber}_final_${lang}.png`;
  }

  return {
    mainImage,
    diffImage,
    finalImages,
    directory,
  };
}

/**
 * Ensure combination directory exists
 */
export async function ensureCombinationDirectory(
  combinationKey: string
): Promise<string> {
  const directory = getCombinationDirectory(combinationKey);
  await fs.mkdir(directory, { recursive: true });
  return directory;
}

/**
 * Check if a variant exists
 */
export async function variantExists(
  combinationKey: string,
  variantNumber: number
): Promise<boolean> {
  const paths = getVariantPaths(combinationKey, variantNumber);

  try {
    await fs.access(paths.mainImage);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get next available variant number for a combination
 */
export async function getNextVariantNumber(
  combinationKey: string
): Promise<number> {
  const directory = getCombinationDirectory(combinationKey);

  try {
    const files = await fs.readdir(directory);
    const variantNumbers = files
      .filter((f) => f.match(/^v\d+_main\.png$/))
      .map((f) => {
        const match = f.match(/^v(\d+)_main\.png$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);

    if (variantNumbers.length === 0) {
      return 1;
    }

    return Math.max(...variantNumbers) + 1;
  } catch {
    // Directory doesn't exist yet
    return 1;
  }
}

/**
 * List all variant numbers for a combination
 */
export async function listVariantNumbers(
  combinationKey: string
): Promise<number[]> {
  const directory = getCombinationDirectory(combinationKey);

  try {
    const files = await fs.readdir(directory);
    const variantNumbers = files
      .filter((f) => f.match(/^v\d+_main\.png$/))
      .map((f) => {
        const match = f.match(/^v(\d+)_main\.png$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0)
      .sort((a, b) => a - b);

    return variantNumbers;
  } catch {
    return [];
  }
}

/**
 * Check which languages are generated for a variant
 */
export async function getGeneratedLanguages(
  combinationKey: string,
  variantNumber: number
): Promise<string[]> {
  const directory = getCombinationDirectory(combinationKey);

  try {
    const files = await fs.readdir(directory);
    const pattern = new RegExp(`^v${variantNumber}_final_([a-z]{2})\\.png$`);

    const languages = files
      .map((f) => {
        const match = f.match(pattern);
        return match ? match[1] : null;
      })
      .filter((lang): lang is string => lang !== null);

    return languages;
  } catch {
    return [];
  }
}

/**
 * Delete all files for a combination
 */
export async function deleteCombinationFiles(
  combinationKey: string
): Promise<void> {
  const directory = getCombinationDirectory(combinationKey);

  try {
    await fs.rm(directory, { recursive: true, force: true });
  } catch (error) {
    console.error(`Failed to delete combination directory: ${directory}`, error);
  }
}

/**
 * Delete all files for a specific variant
 */
export async function deleteVariantFiles(
  combinationKey: string,
  variantNumber: number
): Promise<void> {
  const directory = getCombinationDirectory(combinationKey);

  try {
    const files = await fs.readdir(directory);
    const pattern = new RegExp(`^v${variantNumber}_`);

    for (const file of files) {
      if (pattern.test(file)) {
        await fs.unlink(path.join(directory, file));
      }
    }
  } catch (error) {
    console.error(
      `Failed to delete variant files: ${combinationKey}/v${variantNumber}`,
      error
    );
  }
}

/**
 * Get storage statistics for a combination
 */
export interface CombinationStorageStats {
  variantCount: number;
  totalFiles: number;
  totalSizeBytes: number;
  languages: string[];
}

export async function getCombinationStorageStats(
  combinationKey: string
): Promise<CombinationStorageStats> {
  const directory = getCombinationDirectory(combinationKey);

  try {
    const files = await fs.readdir(directory);
    let totalSizeBytes = 0;
    const languages = new Set<string>();
    const variants = new Set<number>();

    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = await fs.stat(filePath);
      totalSizeBytes += stats.size;

      // Extract variant number
      const variantMatch = file.match(/^v(\d+)_/);
      if (variantMatch) {
        variants.add(parseInt(variantMatch[1], 10));
      }

      // Extract language
      const langMatch = file.match(/_final_([a-z]{2})\.png$/);
      if (langMatch) {
        languages.add(langMatch[1]);
      }
    }

    return {
      variantCount: variants.size,
      totalFiles: files.length,
      totalSizeBytes,
      languages: Array.from(languages).sort(),
    };
  } catch {
    return {
      variantCount: 0,
      totalFiles: 0,
      totalSizeBytes: 0,
      languages: [],
    };
  }
}
