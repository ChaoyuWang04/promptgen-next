/**
 * Image ID Utilities
 *
 * Functions for generating and parsing image IDs.
 * Format: {lib1}_{lib2}_{...}_{libN}_{sequence}
 *
 * Libraries are sorted by their `order` field from the database.
 * Abbreviations come from the `abbreviation` field in the database.
 *
 * Example: betty_sitting_living_summer_simpson_0001
 */

import { type LibrarySelection } from '../engines/types';
import { prisma } from '../db/prisma';
import { libraryService } from '../services';

/**
 * Extract abbreviation from library entry ID
 *
 * Examples:
 * - char_betty_v1 -> betty (with abbreviation "char")
 * - pose_turn_back_smile_v1 -> turnback (with abbreviation "pose")
 * - scene_living_sofa_v1 -> living (with abbreviation "scene")
 *
 * @param entryId - The full entry ID (e.g., "char_betty_v1")
 * @param abbreviation - The library abbreviation (e.g., "char")
 */
function extractEntryAbbreviation(entryId: string, abbreviation: string): string {
  let abbr = entryId;

  // Remove library prefix (e.g., "char_", "pose_")
  if (abbreviation && entryId.startsWith(`${abbreviation}_`)) {
    abbr = entryId.substring(abbreviation.length + 1);
  }

  // Remove version suffix (e.g., "_v1", "_v2")
  abbr = abbr.replace(/_v\d+$/, '');

  // Handle multi-word names:
  // - "turn_back_smile" -> "turnback"
  // - "living_sofa" -> "living"
  // Take meaningful parts and combine
  const parts = abbr.split('_');

  // Strategy: Use first 2 words max, or first word if long enough
  if (parts.length === 1) {
    return parts[0];
  } else if (parts.length === 2) {
    return parts.join('');
  } else {
    // For 3+ words, take first 2
    return parts.slice(0, 2).join('');
  }
}

/**
 * Generate image ID base from library selections
 *
 * Libraries are sorted by their `order` field from the database.
 * Only libraries with entries in the selection are included.
 *
 * @param selections - Library entry IDs
 * @returns Generated image ID base (without sequence number)
 */
export async function generateImageIdBase(selections: LibrarySelection): Promise<string> {
  const parts: string[] = [];

  // Get libraries sorted by order, filtered to those in selections
  const libraries = await libraryService.getLibrariesForImageId(selections);

  for (const library of libraries) {
    const entryId = selections[library.name];
    if (entryId) {
      // Get abbreviation from database (fallback to first 4 chars)
      const abbreviation = library.abbreviation || library.name.substring(0, 4);
      const abbr = extractEntryAbbreviation(entryId, abbreviation);
      parts.push(abbr);
    }
  }

  return parts.join('_');
}

/**
 * Generate image ID base synchronously (for backwards compatibility)
 *
 * @deprecated Use generateImageIdBase (async) instead
 * This function requires libraries to be passed in since it can't fetch from DB
 */
export function generateImageIdBaseSync(
  selections: LibrarySelection,
  libraries: Array<{ name: string; abbreviation: string | null; order: number }>
): string {
  const parts: string[] = [];

  // Sort libraries by order
  const sortedLibraries = [...libraries].sort((a, b) => a.order - b.order);

  for (const library of sortedLibraries) {
    const entryId = selections[library.name];
    if (entryId) {
      const abbreviation = library.abbreviation || library.name.substring(0, 4);
      const abbr = extractEntryAbbreviation(entryId, abbreviation);
      parts.push(abbr);
    }
  }

  return parts.join('_');
}

/**
 * Get next sequence number for a given image ID base
 *
 * @param imageIdBase - Base image ID (without sequence)
 * @returns Next available sequence number (4 digits)
 */
export async function getNextSequence(imageIdBase: string): Promise<string> {
  // Find all records with matching base
  const records = await prisma.record.findMany({
    where: {
      imageId: {
        startsWith: imageIdBase,
      },
    },
    select: {
      imageId: true,
    },
  });

  if (records.length === 0) {
    return '0001';
  }

  // Extract sequence numbers
  const sequences = records
    .map(r => {
      const match = r.imageId.match(/_(\d{4})$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => n > 0);

  if (sequences.length === 0) {
    return '0001';
  }

  // Get max and increment
  const maxSeq = Math.max(...sequences);
  const nextSeq = maxSeq + 1;

  // Pad to 4 digits
  return String(nextSeq).padStart(4, '0');
}

/**
 * Generate full image ID with sequence number
 *
 * @param selections - Library entry IDs
 * @returns Full image ID with sequence number
 */
export async function generateImageId(selections: LibrarySelection): Promise<string> {
  const base = await generateImageIdBase(selections);
  const sequence = await getNextSequence(base);
  return `${base}_${sequence}`;
}

/**
 * Parse image ID to extract library selections
 *
 * @param imageId - Full image ID
 * @returns Parsed library selections (partial - only IDs can be inferred)
 *
 * Note: This is a best-effort parse. Exact library IDs cannot be fully
 * reconstructed from abbreviated image IDs. Use database records instead.
 */
export function parseImageId(imageId: string): {
  base: string;
  sequence: string;
  parts: string[];
} {
  // Extract sequence (last 4 digits)
  const seqMatch = imageId.match(/_(\d{4})$/);
  const sequence = seqMatch ? seqMatch[1] : '0000';

  // Remove sequence to get base
  const base = seqMatch ? imageId.substring(0, imageId.length - 5) : imageId;

  // Split base into parts
  const parts = base.split('_');

  return {
    base,
    sequence,
    parts,
  };
}

/**
 * Validate image ID format
 *
 * Now more flexible - just needs at least 2 parts + sequence
 * (since libraries are dynamic, we can't assume exact count)
 *
 * @param imageId - Image ID to validate
 * @returns True if valid format
 */
export function isValidImageId(imageId: string): boolean {
  // Expected format: word_word_{more words}_0001
  // At least 2 parts + 1 sequence (more flexible for dynamic libraries)
  const pattern = /^[a-z0-9]+(_[a-z0-9]+)+_\d{4}$/;
  return pattern.test(imageId);
}

/**
 * Get image ID from record
 *
 * @param recordId - Record database ID
 * @returns Image ID or null if not found
 */
export async function getImageIdFromRecord(recordId: string): Promise<string | null> {
  const record = await prisma.record.findUnique({
    where: { id: recordId },
    select: { imageId: true },
  });

  return record?.imageId || null;
}

/**
 * Get library count used in image ID generation
 * Useful for validation
 */
export async function getImageIdLibraryCount(): Promise<number> {
  const libraries = await libraryService.getRequired();
  return libraries.length;
}
