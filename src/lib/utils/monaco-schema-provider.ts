/**
 * Monaco Schema Provider
 *
 * 为Monaco Editor提供JSON Schema配置，用于智能提示和验证
 * 支持6种库类型，每种类型使用对应的JSON Schema
 */

import { getTemplateByName, type LibraryTemplate } from '@/lib/templates/library-templates';

/**
 * 库类型定义
 */
export type LibraryType =
  | 'character'
  | 'pose'
  | 'scene'
  | 'theme'
  | 'style'
  | 'decorative_props';

/**
 * Monaco Editor JSON Schema 配置接口
 */
export interface MonacoJsonSchema {
  uri: string;
  fileMatch: string[];
  schema: object;
}

/**
 * 获取库类型对应的JSON Schema
 *
 * @param libraryType - 库类型名称
 * @returns JSON Schema对象，如果库类型不存在则返回null
 *
 * @example
 * ```ts
 * const schema = getSchemaForLibraryType('character');
 * // Returns the character entry JSON Schema
 * ```
 */
export function getSchemaForLibraryType(libraryType: LibraryType): object | null {
  const template = getTemplateByName(libraryType);
  if (!template) {
    console.warn(`[Monaco Schema Provider] Unknown library type: ${libraryType}`);
    return null;
  }

  // 对于 decorative_props，返回完整的 schema (包含 common_props 数组)
  // 对于其他类型，返回 schema (单个entry的结构)
  return template.schema;
}

/**
 * 获取库模板的完整信息
 *
 * @param libraryType - 库类型名称
 * @returns 库模板对象，如果不存在则返回null
 */
export function getLibraryTemplate(libraryType: LibraryType): LibraryTemplate | null {
  const template = getTemplateByName(libraryType);
  if (!template) {
    console.warn(`[Monaco Schema Provider] Unknown library type: ${libraryType}`);
    return null;
  }
  return template;
}

/**
 * 为Monaco Editor生成JSON Schema配置
 *
 * @param libraryType - 库类型名称
 * @param uri - Schema URI (用于Monaco内部引用)
 * @returns Monaco JSON Schema配置对象
 *
 * @example
 * ```ts
 * const config = getMonacoSchemaConfig('character', 'inmemory://character-entry.json');
 * monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
 *   validate: true,
 *   schemas: [config]
 * });
 * ```
 */
export function getMonacoSchemaConfig(
  libraryType: LibraryType,
  uri: string = `inmemory://${libraryType}-entry.json`
): MonacoJsonSchema | null {
  const schema = getSchemaForLibraryType(libraryType);
  if (!schema) {
    return null;
  }

  return {
    uri,
    fileMatch: [`*${libraryType}*`], // 匹配包含库类型名称的文件
    schema,
  };
}

/**
 * 获取所有支持的库类型列表
 */
export function getAllLibraryTypes(): LibraryType[] {
  return ['character', 'pose', 'scene', 'theme', 'style', 'decorative_props'];
}

/**
 * 验证库类型是否有效
 */
export function isValidLibraryType(libraryType: string): libraryType is LibraryType {
  return getAllLibraryTypes().includes(libraryType as LibraryType);
}

/**
 * 获取库类型的显示名称
 */
export function getLibraryTypeDisplayName(libraryType: LibraryType): string {
  const template = getTemplateByName(libraryType);
  return template?.displayName || libraryType;
}

/**
 * 获取库类型的示例条目
 */
export function getExampleEntryForLibraryType(libraryType: LibraryType): object | null {
  const template = getTemplateByName(libraryType);
  return template?.exampleEntry || null;
}

/**
 * 判断库类型是否使用嵌套数组结构
 * (decorative_props 使用特殊的嵌套数组结构)
 */
export function isNestedArrayStructure(libraryType: LibraryType): boolean {
  const template = getTemplateByName(libraryType);
  return template?.structureType === 'nested_array';
}

/**
 * 获取格式化后的示例JSON字符串
 *
 * @param libraryType - 库类型名称
 * @param indent - 缩进空格数，默认2
 * @returns 格式化的JSON字符串
 */
export function getFormattedExampleJson(
  libraryType: LibraryType,
  indent: number = 2
): string | null {
  const example = getExampleEntryForLibraryType(libraryType);
  if (!example) {
    return null;
  }
  return JSON.stringify(example, null, indent);
}
