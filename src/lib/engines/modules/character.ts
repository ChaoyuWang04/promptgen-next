/**
 * Character Module Builder
 *
 * Generates character description segment including:
 * - Name
 * - Appearance (core + details)
 * - Outfit (major + minor with colors)
 * - Style constraints (must_keep, negative_rules)
 */

import { type ModuleBuilder, type TemplateContext } from '../types';

export const CharacterModule: ModuleBuilder = {
  name: 'character',

  build(context: TemplateContext): string {
    const char = context.character;

    if (!char) {
      throw new Error('Character data not found in context');
    }

    const parts: string[] = [];

    // Character name
    if (char.name) {
      parts.push(`角色: ${char.name}`);
    }

    // Appearance core (essential features)
    if (char.appearance_core) {
      parts.push(`外观: ${char.appearance_core}`);
    }

    // Appearance details (if available)
    if (char.appearance_detail) {
      parts.push(char.appearance_detail);
    }

    // Outfit major (main clothing)
    if (char.outfit_major) {
      parts.push(`穿着: ${char.outfit_major}`);
    }

    // Outfit minor with current colors (from outfit_minor_state in context or default)
    if (char.outfit_minor && Array.isArray(char.outfit_minor)) {
      const minorDescriptions = char.outfit_minor.map((item: any) => {
        const color = item.original_color || item.current_color || '';
        const template = item.description_template || '{color}{element}';
        return template
          .replace('{color}', color)
          .replace('{element}', item.element || '');
      });

      if (minorDescriptions.length > 0) {
        parts.push(minorDescriptions.join(', '));
      }
    }

    // Must keep constraints
    if (char.must_keep && Array.isArray(char.must_keep) && char.must_keep.length > 0) {
      parts.push(`必须保持: ${char.must_keep.join(', ')}`);
    }

    return parts.join('\n');
  },
};
