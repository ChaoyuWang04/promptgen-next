/**
 * API Schema Validation
 * Zod schemas for API request/response validation
 */

import { z } from 'zod';
import { LibraryIdsSchema } from './record.schema';

// ========================================
// Common API Schemas
// ========================================

// Pagination
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

// Response wrapper
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  });

// ========================================
// Prompt Generation Requests
// ========================================

// Generate Main Prompt
export const GenerateMainPromptRequestSchema = z.object({
  libraryIds: LibraryIdsSchema,
  templateId: z.string().cuid().optional(), // Optional custom template
});

// Generate Diff Prompt
export const GenerateDiffPromptRequestSchema = z.object({
  imageId: z.string(),
  libraryIds: z
    .object({
      pose: z.string().optional(),
      scene: z.string().optional(),
      style: z.string().optional(),
    })
    .optional(), // Optional library changes for diff
  customChanges: z
    .object({
      colorChanges: z
        .array(
          z.object({
            element: z.string(),
            from_color: z.string(),
            to_color: z.string(),
          })
        )
        .optional(),
      decorations: z.array(z.string()).optional(),
    })
    .optional(),
});

// ========================================
// Image Generation Requests
// ========================================

// Generate Single Image
export const GenerateImageRequestSchema = z.object({
  imageId: z.string(),
  version: z.number().int().positive().default(1),
  provider: z.enum(['gemini', 'bytedance']).optional(), // Optional specific provider
  languageId: z.number().int().min(1).max(7).default(1), // 1-7 for different languages
});

// Generate Batch Images
export const GenerateBatchImagesRequestSchema = z.object({
  imageIds: z.array(z.string()).min(1, 'At least one image ID required'),
  provider: z.enum(['gemini', 'bytedance']).optional(),
  languageId: z.number().int().min(1).max(7).default(1),
  libraryFilter: z
    .record(z.string(), z.array(z.string()).nullable())
    .optional(), // Optional filter for selective generation
});

// ========================================
// Library Management Requests
// ========================================

// Create Library Entry
export const CreateLibraryEntryRequestSchema = z.object({
  libraryName: z.enum(['character', 'pose', 'scene', 'theme', 'style', 'decorative_props']),
  entry: z.record(z.string(), z.any()), // Flexible entry structure
});

// Update Library Entry
export const UpdateLibraryEntryRequestSchema = z.object({
  libraryName: z.enum(['character', 'pose', 'scene', 'theme', 'style', 'decorative_props']),
  entryId: z.string(),
  entry: z.record(z.string(), z.any()),
}).partial({ entry: true });

// Delete Library Entry
export const DeleteLibraryEntryRequestSchema = z.object({
  libraryName: z.enum(['character', 'pose', 'scene', 'theme', 'style', 'decorative_props']),
  entryId: z.string(),
});

// ========================================
// Sync Management Requests
// ========================================

// Repair Sync Issues
export const RepairSyncRequestSchema = z.object({
  repairTypes: z.array(
    z.enum([
      'prompt_sync',
      'image_sync',
      'combination_status',
      'orphaned_files',
      'record_integrity',
    ])
  ),
});

// ========================================
// Type Exports
// ========================================

export type Pagination = z.infer<typeof PaginationSchema>;
export type GenerateMainPromptRequest = z.infer<typeof GenerateMainPromptRequestSchema>;
export type GenerateDiffPromptRequest = z.infer<typeof GenerateDiffPromptRequestSchema>;
export type GenerateImageRequest = z.infer<typeof GenerateImageRequestSchema>;
export type GenerateBatchImagesRequest = z.infer<typeof GenerateBatchImagesRequestSchema>;
export type CreateLibraryEntryRequest = z.infer<typeof CreateLibraryEntryRequestSchema>;
export type UpdateLibraryEntryRequest = z.infer<typeof UpdateLibraryEntryRequestSchema>;
export type DeleteLibraryEntryRequest = z.infer<typeof DeleteLibraryEntryRequestSchema>;
export type RepairSyncRequest = z.infer<typeof RepairSyncRequestSchema>;
