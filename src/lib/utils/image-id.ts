/**
 * Image ID Utilities
 *
 * Functions for generating and parsing image IDs.
 * Format: {character}_{pose}_{scene}_{theme}_{style}_{sequence}
 *
 * Example: betty_turnback_living_halloween_retro50s_0001
 */

import { type LibrarySelection } from '../engines/types';
import { prisma } from '../db/prisma';

/**
 * Library name to abbreviation mapping
 */
const LIBRARY_ABBREVIATIONS: Record<string, string> = {
  character: 'char',
  pose: 'pose',
  scene: 'scene',
  theme: 'theme',
  style: 'style',
};

/**
 * Extract abbreviation from library entry ID
 *
 * Examples:
 * - char_betty_v1 -> betty
 * - pose_turn_back_smile_v1 -> turnback
 * - scene_living_sofa_v1 -> living
 */
function extractAbbreviation(entryId: string, libraryName: string): string {
  // Remove library prefix (e.g., "char_", "pose_")
  const prefix = LIBRARY_ABBREVIATIONS[libraryName];
  let abbr = entryId;

  if (prefix && entryId.startsWith(`${prefix}_`)) {
    abbr = entryId.substring(prefix.length + 1);
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
 * Generate image ID from library selections
 *
 * @param selections - Library entry IDs
 * @returns Generated image ID (without sequence number)
 */
export function generateImageIdBase(selections: LibrarySelection): string {
  const parts: string[] = [];

  // Extract abbreviations in order
  const order: Array<keyof LibrarySelection> = [
    'character',
    'pose',
    'scene',
    'theme',
    'style',
  ];

  for (const library of order) {
    const entryId = selections[library];
    if (entryId) {
      const abbr = extractAbbreviation(entryId, library);
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
  const base = generateImageIdBase(selections);
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
 * @param imageId - Image ID to validate
 * @returns True if valid format
 */
export function isValidImageId(imageId: string): boolean {
  // Expected format: word_word_word_word_word_0001
  // At least 5 parts + 1 sequence
  const pattern = /^[a-z0-9]+(_[a-z0-9]+){4,}_\d{4}$/;
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
