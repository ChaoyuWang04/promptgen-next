/**
 * Record Schema Validation
 * Zod schemas for generation record data structures
 */

import { z } from 'zod';

// ========================================
// Record Core Schemas
// ========================================

// Library IDs (dynamic structure supporting 3-N libraries)
export const LibraryIdsSchema = z.record(z.string(), z.string()).refine(
  (data) => Object.keys(data).length >= 3,
  { message: 'At least 3 libraries required' }
);

// Outfit Minor State
export const OutfitMinorStateSchema = z.array(
  z.object({
    element: z.string(),
    current_color: z.string(),
  })
);

// Used Decorations
export const UsedDecorationsSchema = z.object({
  from_theme: z.array(z.string()),
  from_scene: z.array(z.string()),
});

// Provider Attempt
export const ProviderAttemptSchema = z.object({
  provider: z.string(),
  success: z.boolean(),
  error: z.string().optional(),
  attempted_at: z.string().datetime(),
});

// ========================================
// Record Schema
// ========================================
export const RecordSchema = z.object({
  id: z.string().cuid().optional(),
  imageId: z.string(),
  libraryIds: LibraryIdsSchema,
  outfitMinorState: OutfitMinorStateSchema,
  usedDecorations: UsedDecorationsSchema,
  providerUsed: z.string().nullable().optional(),
  providerAttempts: z.array(ProviderAttemptSchema).default([]),
  promptGenerated: z.boolean().default(false),
  imageGenerated: z.boolean().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// ========================================
// Create/Update Record Schemas
// ========================================
export const CreateRecordSchema = RecordSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateRecordSchema = RecordSchema.partial().omit({
  id: true,
  imageId: true, // Image ID should not be changed
  createdAt: true,
  updatedAt: true,
});

// ========================================
// Image Variant Schema
// ========================================
export const FinalImagesSchema = z.object({
  en: z.string().optional(),
  fr: z.string().optional(),
  ja: z.string().optional(),
  ko: z.string().optional(),
  de: z.string().optional(),
  es: z.string().optional(),
  zh: z.string().optional(),
});

export const ImageVariantSchema = z.object({
  id: z.string().cuid().optional(),
  recordId: z.string().cuid(),
  version: z.number().int().positive(),
  imageMainPath: z.string().nullable().optional(),
  imageDiffPath: z.string().nullable().optional(),
  finalImages: FinalImagesSchema.nullable().optional(),
  generatedAt: z.date().optional(),
});

export const CreateImageVariantSchema = ImageVariantSchema.omit({
  id: true,
  generatedAt: true,
});

// ========================================
// Type Exports
// ========================================
export type LibraryIds = z.infer<typeof LibraryIdsSchema>;
export type OutfitMinorState = z.infer<typeof OutfitMinorStateSchema>;
export type UsedDecorations = z.infer<typeof UsedDecorationsSchema>;
export type ProviderAttempt = z.infer<typeof ProviderAttemptSchema>;
export type Record = z.infer<typeof RecordSchema>;
export type CreateRecord = z.infer<typeof CreateRecordSchema>;
export type UpdateRecord = z.infer<typeof UpdateRecordSchema>;
export type FinalImages = z.infer<typeof FinalImagesSchema>;
export type ImageVariant = z.infer<typeof ImageVariantSchema>;
export type CreateImageVariant = z.infer<typeof CreateImageVariantSchema>;
