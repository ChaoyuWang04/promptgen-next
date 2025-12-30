/**
 * Template Engine Types
 *
 * Type definitions for the template engine and module builders.
 * Ensures type safety and provides clear interfaces for template rendering.
 *
 * NOTE: These types are now dynamic to support database-driven library configuration.
 * Library names are no longer hardcoded - they come from the database.
 */

/**
 * Library selection for prompt generation
 * Now dynamic: keys are library names from database
 *
 * Example:
 * {
 *   "character": "char_betty_v1",
 *   "pose": "pose_standing_v1",
 *   "scene": "scene_living_v1",
 *   "theme": "theme_summer_v1",
 *   "style": "style_retro_v1"
 * }
 */
export type LibrarySelection = Record<string, string>;

/**
 * Library data loaded from database
 * Now dynamic: keys are library names from database
 */
export type LoadedLibraryData = Record<string, Record<string, unknown>>;

/**
 * Template rendering context
 *
 * Contains all variables available in templates.
 * Dynamic namespaces based on library names from database.
 *
 * Example namespaces:
 * - character.*
 * - pose.*
 * - scene.*
 * - theme.*
 * - style.*
 * - decorative_props.*
 * - (any other custom libraries)
 */
export type TemplateContext = Record<string, Record<string, unknown>>;

/**
 * Diff template context
 *
 * Extended context for diff (comparison) templates.
 * Includes outfit state changes and decoration additions.
 *
 * Dynamic library data is in the base context,
 * special diff-related fields are typed explicitly.
 */
export interface DiffTemplateContext extends Record<string, unknown> {
  // Main image data (original) - dynamic library data
  main: Record<string, Record<string, unknown>>;

  // Outfit state changes
  outfit_state: Array<{
    element: string;
    current_color: string;
  }>;

  new_outfit_state: Array<{
    element: string;
    original_color: string;
    new_color: string;
  }>;

  // Color change descriptions
  color_changes: string[];

  // Decoration additions
  decorations: {
    from_theme: string[];
    from_scene: string[];
  };

  new_decorations: Array<{
    name: string;
    source: string;
  }>;

  all_decorations: string[];
}

/**
 * Template variable metadata
 *
 * Used for autocomplete and documentation.
 */
export interface VariableMetadata {
  /**
   * Variable path (e.g., "character.name", "pose.emotion")
   */
  path: string;

  /**
   * Variable type
   */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';

  /**
   * Description
   */
  description: string;

  /**
   * Example value
   */
  example?: string;

  /**
   * Whether this variable requires a filter (e.g., arrays should use | join)
   */
  requires_filter?: boolean;
}

/**
 * Filter function
 *
 * Transforms a value in a template expression.
 * Examples: join, uppercase, lowercase, etc.
 */
export type FilterFunction = (value: unknown, args?: string[]) => string;

/**
 * Template validation result
 */
export interface TemplateValidationResult {
  valid: boolean;
  errors: Array<{
    line: number;
    column: number;
    message: string;
    variable?: string;
  }>;
  warnings: Array<{
    line: number;
    column: number;
    message: string;
    variable?: string;
  }>;
}

/**
 * Template rendering options
 */
export interface TemplateRenderOptions {
  /**
   * Throw error on undefined variables
   * If false, undefined variables render as empty string
   */
  strict?: boolean;

  /**
   * Custom filters to register
   */
  custom_filters?: Record<string, FilterFunction>;
}

/**
 * Prompt generation result
 */
export interface PromptGenerationResult {
  /**
   * Generated image ID
   */
  image_id: string;

  /**
   * Chinese prompt
   */
  prompt_cn: string;

  /**
   * English prompt (translated)
   */
  prompt_en?: string;

  /**
   * Library selections used (dynamic)
   */
  library_ids: LibrarySelection;

  /**
   * Outfit minor state (for diff generation)
   */
  outfit_minor_state: Array<{
    element: string;
    current_color: string;
  }>;

  /**
   * Used decorations (for diff generation)
   */
  used_decorations: {
    from_theme: string[];
    from_scene: string[];
  };

  /**
   * Timestamp
   */
  generated_at: Date;
}

/**
 * Diff prompt generation result
 */
export interface DiffPromptGenerationResult {
  /**
   * Diff prompt ID
   */
  diff_id: string;

  /**
   * Base image ID
   */
  image_id: string;

  /**
   * Chinese diff prompt
   */
  prompt_cn: string;

  /**
   * English diff prompt (translated)
   */
  prompt_en?: string;

  /**
   * New outfit state
   */
  new_outfit_state: Array<{
    element: string;
    original_color: string;
    new_color: string;
  }>;

  /**
   * New decorations added
   */
  new_decorations: Array<{
    name: string;
    source: string;
  }>;

  /**
   * Timestamp
   */
  generated_at: Date;
}

// ==========================================
// Validation Helpers
// ==========================================

/**
 * Validate that a LibrarySelection has all required libraries
 */
export function validateLibrarySelection(
  selection: LibrarySelection,
  requiredLibraries: string[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const libName of requiredLibraries) {
    if (!selection[libName]) {
      missing.push(libName);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Check if a context has a specific library loaded
 */
export function hasLibrary(
  context: TemplateContext,
  libraryName: string
): boolean {
  return libraryName in context && context[libraryName] !== undefined;
}

/**
 * Get a value from context by path (e.g., "character.name")
 */
export function getContextValue(
  context: TemplateContext,
  path: string
): unknown {
  const parts = path.split('.');
  let value: unknown = context;

  for (const part of parts) {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === 'object') {
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return value;
}
