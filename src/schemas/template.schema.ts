/**
 * Template Schema Validation
 * Zod schemas for template data structures
 */

import { z } from 'zod';

// ========================================
// Template Enums
// ========================================
export const TemplateTypeSchema = z
  .enum(['SYSTEM', 'USER', 'system', 'user'])
  .transform((val) => val.toUpperCase() as 'SYSTEM' | 'USER');

export const TemplateCategorySchema = z
  .enum(['MAIN', 'DIFF', 'main', 'diff'])
  .transform((val) => val.toUpperCase() as 'MAIN' | 'DIFF');

// ========================================
// Template Schema
// ========================================
export const TemplateSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1, 'Template name is required'),
  description: z.string().nullable().optional(),
  type: TemplateTypeSchema,
  category: TemplateCategorySchema,
  content: z.string(), // Allow empty content for new templates
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// ========================================
// Create/Update Template Schemas
// ========================================
export const CreateTemplateSchema = TemplateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateTemplateSchema = TemplateSchema.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ========================================
// Type Exports
// ========================================
export type TemplateType = z.infer<typeof TemplateTypeSchema>;
export type TemplateCategory = z.infer<typeof TemplateCategorySchema>;
export type Template = z.infer<typeof TemplateSchema>;
export type CreateTemplate = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplate = z.infer<typeof UpdateTemplateSchema>;
