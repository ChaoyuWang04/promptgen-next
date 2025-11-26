/**
 * Template Engine Types
 *
 * Type definitions for the template engine and module builders.
 * Ensures type safety and provides clear interfaces for template rendering.
 */

import { type LibraryName } from '../config/library-config';

/**
 * Library selection for prompt generation
 */
export interface LibrarySelection {
  character: string;
  pose: string;
  scene: string;
  theme: string;
  style: string;
  decorative_props?: string;
}

/**
 * Library data loaded from database
 */
export interface LoadedLibraryData {
  character: Record<string, any>;
  pose: Record<string, any>;
  scene: Record<string, any>;
  theme: Record<string, any>;
  style: Record<string, any>;
  decorative_props?: Record<string, any>;
}

/**
 * Template rendering context
 *
 * Contains all variables available in templates.
 * Namespaces:
 * - character.*
 * - pose.*
 * - scene.*
 * - theme.*
 * - style.*
 * - decorative_props.*
 */
export interface TemplateContext {
  character: Record<string, any>;
  pose: Record<string, any>;
  scene: Record<string, any>;
  theme: Record<string, any>;
  style: Record<string, any>;
  decorative_props?: Record<string, any>;
}

/**
 * Diff template context
 *
 * Extended context for diff (comparison) templates.
 * Includes outfit state changes and decoration additions.
 */
export interface DiffTemplateContext extends TemplateContext {
  // Main image data (original)
  main: {
    character: Record<string, any>;
    pose: Record<string, any>;
    scene: Record<string, any>;
    theme: Record<string, any>;
    style: Record<string, any>;
  };

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
export type FilterFunction = (value: any, args?: string[]) => string;

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
   * Library selections used
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
