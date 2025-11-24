/**
 * Language Templates and Font Configuration
 * Complete 7-language game narrative system (matching Python implementation)
 */

import { LanguageTemplate } from './types';

/**
 * Language templates with game narrative text
 * Each template has two lines with color tags for inline colored text
 * Variables: {tries} = random number 300-999, {diffs} = random number 10-20
 *
 * Matches Python's LANGUAGE_TEMPLATES exactly
 */
export const LANGUAGE_TEMPLATES: Record<number, LanguageTemplate> = {
  1: {  // English
    name: 'English',
    line1: "I've tried <c:#ff1a1a>{tries}</c> times but",
    line2: "still can't find <c:#ff1a1a> 10 </c> differences"
  },
  2: {  // French
    name: 'Français',
    line1: "J'ai essayé <c:#ff1a1a>{tries}</c> fois mais",
    line2: "je ne trouve toujours pas <c:#ff1a1a> 10 </c> différences"
  },
  3: {  // Japanese
    name: '日本語',
    line1: "<c:#ff1a1a>{tries}</c>回試しましたが",
    line2: "まだ<c:#ff1a1a> 10 </c>つの違いが見つかりません"
  },
  4: {  // Korean
    name: '한국어',
    line1: "<c:#ff1a1a>{tries}</c>번 시도했지만",
    line2: "아직도 <c:#ff1a1a> 10 </c>개의 차이점을 못 찾았어요"
  },
  5: {  // German
    name: 'Deutsch',
    line1: "Ich habe es <c:#ff1a1a>{tries}</c> Mal versucht",
    line2: "aber ich finde immer noch <c:#ff1a1a> 10 </c> Unterschiede nicht"
  },
  6: {  // Spanish
    name: 'Español',
    line1: "He intentado <c:#ff1a1a>{tries}</c> veces pero",
    line2: "todavía no puedo encontrar <c:#ff1a1a> 10 </c> diferencias"
  },
  7: {  // Traditional Chinese
    name: '繁體中文',
    line1: "我已經試了<c:#ff1a1a>{tries}</c>次了",
    line2: "但還是找不到<c:#ff1a1a> 10 </c>個不同"
  }
};

/**
 * Language-specific font sizes (in pixels)
 * Matches Python's LANGUAGE_FONT_SIZES
 *
 * Latin languages (English, French, German, Spanish): 90-110px
 * CJK languages (Japanese, Korean, Chinese): 90-110px
 */
export const LANGUAGE_FONT_SIZES: Record<number, number> = {
  1: 110,  // English - Standard Latin alphabet
  2: 90,   // Français - Slightly smaller for longer French text
  3: 90,   // 日本語 - CJK characters need smaller size for balance
  4: 90,   // 한국어 - CJK characters need smaller size for balance
  5: 90,   // Deutsch - German words tend to be longer
  6: 90,   // Español - Spanish text can be verbose
  7: 110   // 繁體中文 - CJK characters at standard size
};

/**
 * Font file names for each language
 * Matches Python's FONT_CONFIG
 *
 * These should be placed in public/fonts/ or src/assets/fonts/
 */
export const FONT_FILES: Record<number, string> = {
  1: 'ARIAL.TTF',                              // English
  2: 'ARIAL.TTF',                              // Français
  3: 'NotoSansJP-VariableFont_wght.ttf',      // 日本語
  4: 'NotoSansKR-VariableFont_wght.ttf',      // 한국어
  5: 'ARIAL.TTF',                              // Deutsch
  6: 'ARIAL.TTF',                              // Español
  7: 'NotoSansTC-VariableFont_wght.ttf'       // 繁體中文 (IMPORTANT: Traditional, not Simplified)
};

/**
 * Language codes (ISO 639-1)
 * Matches Python's LANGUAGE_CODE
 */
export const LANGUAGE_CODES: Record<number, string> = {
  1: 'en',   // English
  2: 'fr',   // Français
  3: 'ja',   // 日本語
  4: 'ko',   // 한국어
  5: 'de',   // Deutsch
  6: 'es',   // Español
  7: 'zh'    // 繁體中文 (zh-TW)
};

/**
 * Get language template by ID
 *
 * @param languageId Language ID (1-7)
 * @returns Language template
 * @throws Error if language ID is invalid
 */
export function getLanguageTemplate(languageId: number): LanguageTemplate {
  if (languageId < 1 || languageId > 7 || !LANGUAGE_TEMPLATES[languageId]) {
    throw new Error(`Invalid language ID: ${languageId}. Must be 1-7.`);
  }
  return LANGUAGE_TEMPLATES[languageId];
}

/**
 * Get font size for language
 *
 * @param languageId Language ID (1-7)
 * @returns Font size in pixels
 */
export function getLanguageFontSize(languageId: number): number {
  return LANGUAGE_FONT_SIZES[languageId] || 110;
}

/**
 * Get font file name for language
 *
 * @param languageId Language ID (1-7)
 * @returns Font file name
 */
export function getLanguageFontFile(languageId: number): string {
  return FONT_FILES[languageId] || 'ARIAL.TTF';
}

/**
 * Get language code
 *
 * @param languageId Language ID (1-7)
 * @returns ISO 639-1 language code
 */
export function getLanguageCode(languageId: number): string {
  return LANGUAGE_CODES[languageId] || 'en';
}

/**
 * Language configuration for text overlay
 */
export interface LanguageConfig {
  name: string;
  beforeText: string;
  afterText: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
}

/**
 * Get complete language configuration for text overlay
 *
 * @param languageId Language ID (1-7)
 * @returns Language configuration object
 */
export function getLanguageConfig(languageId: number): LanguageConfig {
  const template = getLanguageTemplate(languageId);
  const fontSize = getLanguageFontSize(languageId);

  // Determine font family based on language
  const isCJK = [3, 4, 7].includes(languageId); // Japanese, Korean, Chinese
  const fontFamily = isCJK
    ? 'Noto Sans JP, Noto Sans KR, Noto Sans SC, sans-serif'
    : 'Arial, sans-serif';

  return {
    name: template.name,
    beforeText: 'Before',
    afterText: 'After',
    fontFamily,
    fontSize,
    fontWeight: 700,
    color: '#FFFFFF',
  };
}

/**
 * Check if language ID is valid
 *
 * @param languageId Language ID to check
 * @returns True if valid (1-7)
 */
export function isValidLanguageId(languageId: number): boolean {
  return languageId >= 1 && languageId <= 7 && LANGUAGE_TEMPLATES[languageId] !== undefined;
}
