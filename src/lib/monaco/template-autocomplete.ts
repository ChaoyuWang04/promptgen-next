/**
 * Monaco Editor Autocomplete for Template Syntax
 *
 * Provides DYNAMIC autocomplete suggestions based on actual library schemas from API.
 *
 * Supports:
 * - Library field access: {{character.name}}, {{pose.emotion}}
 * - Module references: {{@module:character}}
 * - Filters: | join, | uppercase
 */

import type * as Monaco from 'monaco-editor';

// Type for variable from API
export interface TemplateVariable {
  name: string;      // e.g., "character.name", "@module:character"
  type: string;      // e.g., "string", "array<string>"
  description: string;
  example?: string;
}

// Parsed field structure for autocomplete
export interface LibraryField {
  name: string;
  type: string;
  description: string;
}

// Module names for {{@module:xxx}} syntax
export const MODULES = [
  { name: 'character', description: '角色模块' },
  { name: 'pose', description: '姿态模块' },
  { name: 'scene', description: '场景模块' },
  { name: 'theme', description: '主题模块' },
  { name: 'lighting', description: '光照模块' },
  { name: 'style', description: '画风模块' },
  { name: 'composition', description: '构图模块' },
];

// Available filters
export const FILTERS = [
  { name: 'join', description: '用默认分隔符连接数组', example: '{{array | join}}' },
  { name: 'join:', description: '用指定分隔符连接数组', example: "{{array | join: ', '}}" },
  { name: 'uppercase', description: '转换为大写', example: '{{text | uppercase}}' },
  { name: 'lowercase', description: '转换为小写', example: '{{text | lowercase}}' },
  { name: 'first:', description: '获取数组前N个元素', example: '{{array | first: 3}}' },
  { name: 'default:', description: '设置默认值', example: "{{value | default: 'N/A'}}" },
];

/**
 * Parse API variables into library field mapping
 *
 * Input: [{ name: "character.name", type: "string", description: "..." }, ...]
 * Output: { character: [{ name: "name", type: "string", description: "..." }], ... }
 */
export function parseVariablesToFields(variables: TemplateVariable[]): Record<string, LibraryField[]> {
  const fields: Record<string, LibraryField[]> = {};

  for (const variable of variables) {
    // Skip module references (e.g., "@module:character")
    if (variable.name.startsWith('@')) {
      continue;
    }

    // Parse "library.field" format
    const dotIndex = variable.name.indexOf('.');
    if (dotIndex === -1) {
      continue;
    }

    const libraryName = variable.name.substring(0, dotIndex);
    const fieldName = variable.name.substring(dotIndex + 1);

    if (!fields[libraryName]) {
      fields[libraryName] = [];
    }

    fields[libraryName].push({
      name: fieldName,
      type: variable.type,
      description: variable.description,
    });
  }

  return fields;
}

/**
 * Create template autocomplete provider with dynamic fields from API
 *
 * @param monaco - Monaco editor instance
 * @param variables - Variables from /api/templates/variables API
 * @returns Disposable to cleanup the provider
 */
export function createTemplateAutocomplete(
  monaco: typeof Monaco,
  variables: TemplateVariable[]
): Monaco.IDisposable {
  // Parse variables into library fields mapping
  const libraryFields = parseVariablesToFields(variables);
  const libraryNames = Object.keys(libraryFields);

  return monaco.languages.registerCompletionItemProvider('plaintext', {
    triggerCharacters: ['.', '{', '@', ':', '|'],

    provideCompletionItems(model, position) {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      const suggestions: Monaco.languages.CompletionItem[] = [];
      const word = model.getWordUntilPosition(position);
      const range: Monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // Check for library field access: {{library_name.
      const libraryFieldMatch = textUntilPosition.match(/\{\{(\w+)\.$/);
      if (libraryFieldMatch) {
        const libraryName = libraryFieldMatch[1];
        const fields = libraryFields[libraryName];

        if (fields) {
          fields.forEach((field) => {
            suggestions.push({
              label: field.name,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: field.name,
              detail: field.type,
              documentation: field.description,
              range,
            });
          });
        }
        return { suggestions };
      }

      // Check for module reference: {{@module:
      const moduleMatch = textUntilPosition.match(/\{\{@module:$/);
      if (moduleMatch) {
        MODULES.forEach((module) => {
          suggestions.push({
            label: module.name,
            kind: monaco.languages.CompletionItemKind.Module,
            insertText: module.name + '}}',
            detail: 'Module',
            documentation: module.description,
            range,
          });
        });
        return { suggestions };
      }

      // Check for filter: {{variable |
      const filterMatch = textUntilPosition.match(/\{\{[^}]+\|\s*$/);
      if (filterMatch) {
        FILTERS.forEach((filter) => {
          suggestions.push({
            label: filter.name,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: filter.name.endsWith(':') ? filter.name + ' ' : filter.name,
            detail: 'Filter',
            documentation: `${filter.description}\n\n示例: ${filter.example}`,
            range,
          });
        });
        return { suggestions };
      }

      // Check for start of variable: {{
      const variableStartMatch = textUntilPosition.match(/\{\{$/);
      if (variableStartMatch) {
        // Suggest library names (from API data)
        libraryNames.forEach((libraryName) => {
          suggestions.push({
            label: libraryName,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: libraryName + '.',
            detail: 'Library',
            documentation: `访问 ${libraryName} 库字段`,
            range,
          });
        });

        // Suggest @module syntax
        suggestions.push({
          label: '@module',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: '@module:',
          detail: 'Module Reference',
          documentation: '引用预定义模块',
          range,
        });

        return { suggestions };
      }

      // Check for @ after {{
      const atMatch = textUntilPosition.match(/\{\{@$/);
      if (atMatch) {
        suggestions.push({
          label: 'module:',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'module:',
          detail: 'Module Reference',
          documentation: '引用预定义模块',
          range,
        });
        return { suggestions };
      }

      return { suggestions };
    },
  });
}

/**
 * @deprecated Use createTemplateAutocomplete with dynamic variables instead
 */
export function registerTemplateAutocomplete(monaco: typeof Monaco): Monaco.IDisposable {
  // Fallback with empty fields - should not be used
  console.warn('registerTemplateAutocomplete is deprecated. Use createTemplateAutocomplete with API variables.');
  return createTemplateAutocomplete(monaco, []);
}
