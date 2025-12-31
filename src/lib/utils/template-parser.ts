/**
 * Template Parser Utility
 *
 * Parses template content to extract library dependencies.
 * Supports: {{library.field}} syntax
 *
 * Used for automatic library detection in strategy generation.
 *
 * Uses dynamic library configuration from database via LibraryService.
 */

import { isValidLibraryName } from '../config/library-config';

export interface ExtractLibrariesOptions {
  validLibraryNames?: string[] | Set<string>;
}

/**
 * Extract library names referenced in template content
 *
 * @param content - Template content string
 * @returns Array of unique library names found in template
 *
 * Note: This function validates library names against the cached config.
 * Make sure initLibraryConfigCache() is called at app startup.
 *
 * @example
 * const content = "{{character.name}} in {{scene.location}} with {{pose.emotion}}";
 * extractLibrariesFromTemplate(content); // ['character', 'scene', 'pose']
 */
export function extractLibrariesFromTemplate(
  content: string,
  options: ExtractLibrariesOptions = {}
): string[] {
  if (!content || content.trim() === '') {
    return [];
  }

  // Regular expression to match {{library.field}} syntax
  const variablePattern = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\.[a-zA-Z_][a-zA-Z0-9_]*(?:\s*\|[^}]*)?\}\}/g;

  const libraries = new Set<string>();
  const validLibraryNames = options.validLibraryNames
    ? Array.isArray(options.validLibraryNames)
      ? new Set(options.validLibraryNames)
      : options.validLibraryNames
    : null;
  let match: RegExpExecArray | null;

  while ((match = variablePattern.exec(content)) !== null) {
    const libraryName = match[1]; // Capture group 1: library name

    // Validate against known library names (uses cached config)
    const isValid = validLibraryNames
      ? validLibraryNames.has(libraryName)
      : isValidLibraryName(libraryName);
    if (isValid) {
      libraries.add(libraryName);
    }
  }

  return Array.from(libraries);
}

/**
 * Validate that a MAIN template does not reference decorative_props
 *
 * @param content - Template content string
 * @param templateCategory - 'MAIN' or 'DIFF'
 * @returns Validation result with error message if invalid
 */
export function validateTemplateLibraryReferences(
  content: string,
  templateCategory: 'MAIN' | 'DIFF'
): { isValid: boolean; error?: string } {
  const libraries = extractLibrariesFromTemplate(content);

  // MAIN templates cannot reference decorative_props
  if (templateCategory === 'MAIN' && libraries.includes('decorative_props')) {
    return {
      isValid: false,
      error: 'MAIN模板不允许引用decorative_props库。装饰小物仅用于DIFF模板。',
    };
  }

  return { isValid: true };
}

/**
 * Count variable references in template
 *
 * @param content - Template content string
 * @returns Total count of {{library.field}} references
 */
export function countVariableReferences(content: string): number {
  if (!content || content.trim() === '') {
    return 0;
  }

  const variablePattern = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\.[a-zA-Z_][a-zA-Z0-9_]*(?:\s*\|[^}]*)?\}\}/g;
  const matches = content.match(variablePattern);

  return matches ? matches.length : 0;
}

/**
 * Extract all variable references with their library and field names
 *
 * @param content - Template content string
 * @returns Array of {library, field, fullReference} objects
 *
 * @example
 * extractVariableDetails("{{character.name}} {{pose.emotion | uppercase}}")
 * // Returns:
 * // [
 * //   { library: 'character', field: 'name', fullReference: '{{character.name}}' },
 * //   { library: 'pose', field: 'emotion', fullReference: '{{pose.emotion | uppercase}}' }
 * // ]
 */
export interface VariableReference {
  library: string;
  field: string;
  fullReference: string;
}

export function extractVariableDetails(content: string): VariableReference[] {
  if (!content || content.trim() === '') {
    return [];
  }

  const variablePattern = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*\|[^}]*)?\}\}/g;
  const variables: VariableReference[] = [];
  let match: RegExpExecArray | null;

  while ((match = variablePattern.exec(content)) !== null) {
    variables.push({
      library: match[1],
      field: match[2],
      fullReference: match[0],
    });
  }

  return variables;
}
