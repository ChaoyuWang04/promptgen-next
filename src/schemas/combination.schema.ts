/**
 * Combination Schema Validation
 * Zod schemas for combination management data structures
 */

import { z } from 'zod';
import { LibraryIdsSchema } from './record.schema';

// ========================================
// Strategy Configuration Schema
// ========================================

// Strategy config for combination generation
export const StrategyConfigSchema = z.object({
  fixed: z.array(z.string()), // Libraries with fixed values
  variable: z.array(z.string()), // Libraries to enumerate
});

// ========================================
// Combination Core Schemas
// ========================================

export const CombinationSchema = z.object({
  id: z.string().cuid().optional(),
  combinationKey: z.string(), // betty_christmas_entrance
  libraryIds: LibraryIdsSchema,
  templateId: z.string().nullable().optional(),
  strategyConfig: StrategyConfigSchema.nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// ========================================
// Create/Update Combination Schemas
// ========================================

export const CreateCombinationSchema = CombinationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateCombinationSchema = CombinationSchema.partial().omit({
  id: true,
  combinationKey: true, // Key should not be changed
  createdAt: true,
  updatedAt: true,
});

// ========================================
// Strategy Generation Request Schema
// ========================================

/**
 * DEPRECATED (v1): Old strategy format
 * Use StrategyGenerationRequestSchemaV2 for new implementations
 */
export const StrategyGenerationRequestSchemaV1 = z.object({
  templateId: z.string(),
  strategyConfig: z.object({
    // Fixed libraries with specific element IDs
    fixed: z.record(z.string(), z.string()), // { "character": "char_betty_v1" }
    // Variable libraries to enumerate all elements
    variable: z.array(z.string()), // ["theme", "scene"]
  }),
});

/**
 * NEW (v2): Strategy format with multi-select support
 *
 * Format:
 * {
 *   templateId: "template_main_v1",
 *   strategyConfig: {
 *     character: ["char_betty_v1", "char_alice_v1"],  // Multi-select
 *     theme: ["theme_christmas_v1"],                   // Single-select (as array)
 *     scene: []                                        // Empty = all entries
 *   }
 * }
 */
export const StrategyGenerationRequestSchemaV2 = z.object({
  templateId: z.string().min(1, '模板ID不能为空'),
  strategyConfig: z
    .record(z.array(z.string()))
    .describe(
      '库选择配置，格式：{ character: ["id1", "id2"], theme: [], scene: ["id3"] }'
    ),
});

/**
 * Default to v2 for new code
 */
export const StrategyGenerationRequestSchema = StrategyGenerationRequestSchemaV2;

// ========================================
// Variant Generation Request Schema
// ========================================

export const GenerateVariantRequestSchema = z.object({
  combinationId: z.string().cuid(),
});

// ========================================
// Language Generation Request Schema
// ========================================

export const GenerateLanguageRequestSchema = z.object({
  variantId: z.string().cuid(),
  language: z.enum(['en', 'fr', 'ja', 'ko', 'de', 'es', 'zh']),
});

// ========================================
// Combination Filter Schema
// ========================================

export const CombinationFilterSchema = z.object({
  templateId: z.string().optional(),
  libraryFilters: z.record(z.string(), z.string()).optional(), // { "character": "char_betty_v1" }
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

// ========================================
// Combination with Records Response Schema
// ========================================

export const CombinationWithRecordsSchema = CombinationSchema.extend({
  records: z.array(z.object({
    id: z.string().cuid(),
    imageId: z.string(),
    variantNumber: z.number().int().positive(),
    promptGenerated: z.boolean(),
    imageGenerated: z.boolean(),
    variants: z.array(z.object({
      id: z.string().cuid(),
      version: z.number().int().positive(),
      imageMainPath: z.string().nullable().optional(),
      imageDiffPath: z.string().nullable().optional(),
      finalImages: z.record(z.string(), z.string()).nullable().optional(),
      generatedAt: z.date().optional(),
    })),
    createdAt: z.date().optional(),
  })),
});

// ========================================
// Combination List Response Schema
// ========================================

export const CombinationListResponseSchema = z.object({
  combinations: z.array(CombinationSchema.extend({
    _count: z.object({
      records: z.number(),
    }).optional(),
  })),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

// ========================================
// Type Exports
// ========================================

export type StrategyConfig = z.infer<typeof StrategyConfigSchema>;
export type Combination = z.infer<typeof CombinationSchema>;
export type CreateCombination = z.infer<typeof CreateCombinationSchema>;
export type UpdateCombination = z.infer<typeof UpdateCombinationSchema>;
export type StrategyGenerationRequest = z.infer<typeof StrategyGenerationRequestSchema>;
export type GenerateVariantRequest = z.infer<typeof GenerateVariantRequestSchema>;
export type GenerateLanguageRequest = z.infer<typeof GenerateLanguageRequestSchema>;
export type CombinationFilter = z.infer<typeof CombinationFilterSchema>;
export type CombinationWithRecords = z.infer<typeof CombinationWithRecordsSchema>;
export type CombinationListResponse = z.infer<typeof CombinationListResponseSchema>;
