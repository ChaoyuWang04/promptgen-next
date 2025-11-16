/**
 * Prompt Schema Validation
 * Zod schemas for prompt data structures
 */

import { z } from 'zod';

// ========================================
// Prompt Type Enum
// ========================================
export const PromptTypeSchema = z.enum(['MAIN', 'DIFF']);

// ========================================
// Prompt Schema
// ========================================
export const PromptSchema = z.object({
  id: z.string().cuid().optional(),
  recordId: z.string().cuid(),
  type: PromptTypeSchema,
  promptCn: z.string().min(1, 'Chinese prompt is required'),
  promptEn: z.string().min(1, 'English prompt is required'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// ========================================
// Create/Update Prompt Schemas
// ========================================
export const CreatePromptSchema = PromptSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdatePromptSchema = PromptSchema.partial().omit({
  id: true,
  recordId: true, // Record ID should not be changed
  createdAt: true,
  updatedAt: true,
});

// ========================================
// Type Exports
// ========================================
export type PromptType = z.infer<typeof PromptTypeSchema>;
export type Prompt = z.infer<typeof PromptSchema>;
export type CreatePrompt = z.infer<typeof CreatePromptSchema>;
export type UpdatePrompt = z.infer<typeof UpdatePromptSchema>;
