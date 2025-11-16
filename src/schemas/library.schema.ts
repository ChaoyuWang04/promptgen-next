/**
 * Library Schema Validation
 * Zod schemas for library-related data structures
 */

import { z } from 'zod';

// ========================================
// Character Library Schema
// ========================================
export const CharacterEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  appearance_core: z.string(),
  appearance_detail: z.string(),
  outfit_major: z.string(),
  outfit_minor: z.array(
    z.object({
      element: z.string(),
      original_color: z.string(),
      color_pool: z.array(z.string()),
      description_template: z.string(),
    })
  ),
  personality: z.string(),
});

// ========================================
// Pose Library Schema
// ========================================
export const PoseEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  abbreviation: z.string(),
  description: z.string(),
  emotion: z.array(z.string()),
});

// ========================================
// Scene Library Schema
// ========================================
export const SceneEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  abbreviation: z.string(),
  description: z.string(),
  location: z.string(),
  props: z.array(
    z.object({
      name: z.string(),
      colors: z.array(z.string()).optional(),
    })
  ),
});

// ========================================
// Theme Library Schema
// ========================================
export const ThemeEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  abbreviation: z.string(),
  description: z.string(),
  decorations: z.array(
    z.object({
      name: z.string(),
      colors: z.array(z.string()).optional(),
    })
  ),
});

// ========================================
// Style Library Schema
// ========================================
export const StyleEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  abbreviation: z.string(),
  description: z.string(),
  color_palette: z.array(z.string()),
  rendering_style: z.string(),
});

// ========================================
// Decorative Props Library Schema
// ========================================
export const DecorativePropSchema = z.object({
  name: z.string(),
  colors: z.array(z.string()).optional(),
});

export const DecorativePropsEntrySchema = z.object({
  common_props: z.array(DecorativePropSchema),
});

// ========================================
// Generic Library Schema (for API)
// ========================================
export const LibraryEntriesSchema = z.record(z.string(), z.any());

export const LibrarySchema = z.object({
  id: z.string().cuid().optional(),
  name: z.enum(['character', 'pose', 'scene', 'theme', 'style', 'decorative_props']),
  displayName: z.string(),
  entries: LibraryEntriesSchema,
  schema: z.any().optional(), // JSON Schema
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// ========================================
// Create/Update Library Schemas
// ========================================
export const CreateLibrarySchema = LibrarySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateLibrarySchema = LibrarySchema.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ========================================
// Type Exports
// ========================================
export type CharacterEntry = z.infer<typeof CharacterEntrySchema>;
export type PoseEntry = z.infer<typeof PoseEntrySchema>;
export type SceneEntry = z.infer<typeof SceneEntrySchema>;
export type ThemeEntry = z.infer<typeof ThemeEntrySchema>;
export type StyleEntry = z.infer<typeof StyleEntrySchema>;
export type DecorativePropsEntry = z.infer<typeof DecorativePropsEntrySchema>;
export type Library = z.infer<typeof LibrarySchema>;
export type CreateLibrary = z.infer<typeof CreateLibrarySchema>;
export type UpdateLibrary = z.infer<typeof UpdateLibrarySchema>;
