/**
 * Style Module Builder
 *
 * Generates artistic style description segment including:
 * - Era/style name
 * - Rendering technique
 * - Line weight and shading
 * - Color temperature
 * - Negative style constraints
 */

import { type ModuleBuilder, type TemplateContext } from '../types';

export const StyleModule: ModuleBuilder = {
  name: 'style',

  build(context: TemplateContext): string {
    const style = context.style;

    if (!style) {
      throw new Error('Style data not found in context');
    }

    const parts: string[] = [];

    // Era/style name
    if (style.era_style) {
      parts.push(`画风: ${style.era_style}`);
    }

    // Rendering technique (core style definition)
    if (style.render_technique) {
      parts.push(`渲染方式: ${style.render_technique}`);
    }

    // Line weight
    if (style.line_weight) {
      parts.push(`线条粗细: ${style.line_weight}`);
    }

    // Shade level
    if (style.shade_level) {
      parts.push(`阴影程度: ${style.shade_level}`);
    }

    // Color temperature
    if (style.color_temp) {
      parts.push(`色温: ${style.color_temp}`);
    }

    // Inspirations (reference styles)
    if (style.inspirations && Array.isArray(style.inspirations) && style.inspirations.length > 0) {
      parts.push(`参考风格: ${style.inspirations.join(', ')}`);
    }

    // Negative style (what to avoid)
    if (style.negative_style && Array.isArray(style.negative_style) && style.negative_style.length > 0) {
      parts.push(`避免风格: ${style.negative_style.join(', ')}`);
    }

    // Style adapter strength (for reference image blending)
    if (style.style_adapter_strength !== undefined) {
      parts.push(`风格强度: ${style.style_adapter_strength}`);
    }

    return parts.join('\n');
  },
};
