/**
 * Theme Module Builder
 *
 * Generates theme/festival description segment including:
 * - Theme name
 * - Mood words
 * - Micro props (theme-specific decorations)
 * - Color palette core
 * - Strength level
 */

import { type ModuleBuilder, type TemplateContext } from '../types';

export const ThemeModule: ModuleBuilder = {
  name: 'theme',

  build(context: TemplateContext): string {
    const theme = context.theme;

    if (!theme) {
      throw new Error('Theme data not found in context');
    }

    const parts: string[] = [];

    // Theme name
    if (theme.theme) {
      parts.push(`主题: ${theme.theme}`);
    }

    // Mood words (thematic atmosphere)
    if (theme.mood_words && Array.isArray(theme.mood_words) && theme.mood_words.length > 0) {
      parts.push(`氛围: ${theme.mood_words.join(', ')}`);
    }

    // Micro props (small thematic decorations)
    if (theme.micro_props && Array.isArray(theme.micro_props) && theme.micro_props.length > 0) {
      const maxProps = theme.max_micro_props || 3;
      const selectedProps = theme.micro_props.slice(0, maxProps);
      parts.push(`主题道具: ${selectedProps.join(', ')}`);
    }

    // Decorative props (if has decorative_props array)
    if (theme.decorative_props && Array.isArray(theme.decorative_props) && theme.decorative_props.length > 0) {
      const propNames = theme.decorative_props
        .filter((p: any) => p.priority === 'high')
        .map((p: any) => p.name)
        .slice(0, 3);

      if (propNames.length > 0) {
        parts.push(`装饰元素: ${propNames.join(', ')}`);
      }
    }

    // Color palette core
    if (theme.palette_core && Array.isArray(theme.palette_core) && theme.palette_core.length > 0) {
      parts.push(`主题配色: ${theme.palette_core.join(', ')}`);
    }

    // Strength (theme prominence)
    if (theme.strength !== undefined) {
      const strengthLevel = theme.strength >= 0.8 ? '强烈' : theme.strength >= 0.5 ? '中等' : '淡雅';
      parts.push(`主题强度: ${strengthLevel} (${theme.strength})`);
    }

    return parts.join('\n');
  },
};
