/**
 * Lighting Module Builder
 *
 * Generates lighting description segment based on:
 * - Scene time of day
 * - Theme mood
 * - Style color temperature
 *
 * This module synthesizes lighting from other modules rather than
 * having its own dedicated library.
 */

import { type ModuleBuilder, type TemplateContext } from '../types';

export const LightingModule: ModuleBuilder = {
  name: 'lighting',

  build(context: TemplateContext): string {
    const parts: string[] = [];

    // Derive lighting from style color temperature
    if (context.style?.color_temp) {
      const colorTemp = context.style.color_temp;
      let lightingDescription = '';

      if (colorTemp.includes('暖')) {
        lightingDescription = '柔和暖光, 营造温馨氛围';
      } else if (colorTemp.includes('冷')) {
        lightingDescription = '清冷蓝调光线, 偏现代感';
      } else if (colorTemp.includes('中性')) {
        lightingDescription = '均衡自然光, 明亮清晰';
      } else {
        lightingDescription = '自然均衡光线';
      }

      parts.push(`光照: ${lightingDescription}`);
    }

    // Enhance lighting based on theme mood
    if (context.theme?.mood_words && Array.isArray(context.theme.mood_words)) {
      const moodWords = context.theme.mood_words;

      if (moodWords.some((w: string) => w.includes('温馨') || w.includes('温暖'))) {
        parts.push('光线柔和温暖');
      } else if (moodWords.some((w: string) => w.includes('清爽') || w.includes('明亮'))) {
        parts.push('光线明亮清爽');
      } else if (moodWords.some((w: string) => w.includes('神秘') || w.includes('暗'))) {
        parts.push('光线柔和略暗, 营造神秘感');
      }
    }

    // Default lighting if nothing derived
    if (parts.length === 0) {
      parts.push('光照: 自然均衡光线, 明亮清晰');
    }

    return parts.join('\n');
  },
};
