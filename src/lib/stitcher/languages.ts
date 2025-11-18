/**
 * Language Configurations for Image Text Overlay
 * Defines text templates and styling for 7 supported languages
 */

export type LanguageCode = 'en' | 'fr' | 'ja' | 'ko' | 'de' | 'es' | 'zh';

/**
 * Language configuration interface
 */
export interface LanguageConfig {
  /**
   * Language code (ISO 639-1)
   */
  code: LanguageCode;

  /**
   * Language ID (1-7)
   */
  id: number;

  /**
   * Display name
   */
  name: string;

  /**
   * Text for "Before" label
   */
  beforeText: string;

  /**
   * Text for "After" label
   */
  afterText: string;

  /**
   * Font family to use (fallback to system fonts if not available)
   */
  fontFamily: string;

  /**
   * Font size in pixels
   */
  fontSize: number;

  /**
   * Font weight
   */
  fontWeight: 'normal' | 'bold';

  /**
   * Text color (hex)
   */
  color: string;

  /**
   * Whether to use vertical text orientation
   */
  vertical: boolean;
}

/**
 * Language configurations for all 7 supported languages
 */
export const LANGUAGE_CONFIGS: Record<number, LanguageConfig> = {
  // 1. English
  1: {
    code: 'en',
    id: 1,
    name: 'English',
    beforeText: 'Before',
    afterText: 'After',
    fontFamily: 'Arial, sans-serif',
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    vertical: false,
  },

  // 2. French
  2: {
    code: 'fr',
    id: 2,
    name: 'French',
    beforeText: 'Avant',
    afterText: 'Après',
    fontFamily: 'Arial, sans-serif',
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    vertical: false,
  },

  // 3. Japanese
  3: {
    code: 'ja',
    id: 3,
    name: 'Japanese',
    beforeText: '前',
    afterText: '後',
    fontFamily: 'Noto Sans JP, sans-serif',
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    vertical: false,
  },

  // 4. Korean
  4: {
    code: 'ko',
    id: 4,
    name: 'Korean',
    beforeText: '전',
    afterText: '후',
    fontFamily: 'Noto Sans KR, sans-serif',
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    vertical: false,
  },

  // 5. German
  5: {
    code: 'de',
    id: 5,
    name: 'German',
    beforeText: 'Vorher',
    afterText: 'Nachher',
    fontFamily: 'Arial, sans-serif',
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    vertical: false,
  },

  // 6. Spanish
  6: {
    code: 'es',
    id: 6,
    name: 'Spanish',
    beforeText: 'Antes',
    afterText: 'Después',
    fontFamily: 'Arial, sans-serif',
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    vertical: false,
  },

  // 7. Chinese
  7: {
    code: 'zh',
    id: 7,
    name: 'Chinese',
    beforeText: '前',
    afterText: '后',
    fontFamily: 'Noto Sans SC, sans-serif',
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    vertical: false,
  },
};

/**
 * Get language configuration by ID
 */
export function getLanguageConfig(languageId: number): LanguageConfig {
  const config = LANGUAGE_CONFIGS[languageId];
  if (!config) {
    throw new Error(
      `Invalid language ID: ${languageId}. Must be 1-7.`
    );
  }
  return config;
}

/**
 * Get language configuration by code
 */
export function getLanguageConfigByCode(code: LanguageCode): LanguageConfig {
  const config = Object.values(LANGUAGE_CONFIGS).find(
    (c) => c.code === code
  );
  if (!config) {
    throw new Error(`Invalid language code: ${code}`);
  }
  return config;
}

/**
 * Get all language configurations
 */
export function getAllLanguageConfigs(): LanguageConfig[] {
  return Object.values(LANGUAGE_CONFIGS);
}

/**
 * Get language code from ID
 */
export function getLanguageCode(languageId: number): LanguageCode {
  const config = getLanguageConfig(languageId);
  return config.code;
}

/**
 * Get language ID from code
 */
export function getLanguageId(code: LanguageCode): number {
  const config = getLanguageConfigByCode(code);
  return config.id;
}
