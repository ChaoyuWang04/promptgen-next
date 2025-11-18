/**
 * Library Importer/Exporter
 *
 * 提供库数据的导入/导出功能：
 * - 自动检测导入格式（Object vs Array）
 * - 支持两种导出格式
 * - 处理特殊的嵌套数组结构（decorative_props）
 */

// ========================================
// 类型定义
// ========================================

export type ExportFormat = 'object' | 'array';

export interface ImportResult {
  success: boolean;
  entries: unknown[];
  format: 'object' | 'array' | 'nested_array';
  count: number;
  errors?: string[];
}

export interface ExportOptions {
  format: ExportFormat;
  pretty?: boolean; // 是否美化 JSON
}

// ========================================
// 格式检测
// ========================================

/**
 * 检测 JSON 数据的格式类型
 *
 * @param data - 要检测的 JSON 数据
 * @returns 格式类型
 */
export function detectFormat(data: unknown): 'object' | 'array' | 'nested_array' | 'unknown' {
  // 检查是否为有效数据
  if (!data || typeof data !== 'object') {
    return 'unknown';
  }

  // 检查是否为数组格式 [{...}, {...}]
  if (Array.isArray(data)) {
    return 'array';
  }

  // 检查是否为嵌套数组格式（decorative_props）
  // 格式：{ common_props: [...] }
  const obj = data as Record<string, unknown>;
  if ('common_props' in obj && Array.isArray(obj.common_props)) {
    return 'nested_array';
  }

  // 检查是否为对象格式 { "id1": {...}, "id2": {...} }
  // 验证至少有一个键，且第一个值是对象
  const keys = Object.keys(obj);
  if (keys.length > 0) {
    const firstValue = obj[keys[0]];
    if (typeof firstValue === 'object' && firstValue !== null && !Array.isArray(firstValue)) {
      return 'object';
    }
  }

  return 'unknown';
}

// ========================================
// 导入功能
// ========================================

/**
 * 从任意格式导入库数据（自动检测格式）
 *
 * @param data - 要导入的 JSON 数据
 * @returns 导入结果
 */
export function importLibraryData(data: unknown): ImportResult {
  const format = detectFormat(data);

  switch (format) {
    case 'array':
      return importFromArray(data as unknown[]);
    case 'object':
      return importFromObject(data as Record<string, unknown>);
    case 'nested_array':
      return importFromNestedArray(data as Record<string, unknown>);
    default:
      return {
        success: false,
        entries: [],
        format: 'object',
        count: 0,
        errors: ['Unknown or invalid format']
      };
  }
}

/**
 * 从对象格式导入数据
 * 格式：{ "entry_id": { id, field1, field2, ... }, ... }
 *
 * @param data - 对象格式的数据
 * @returns 导入结果
 */
export function importFromObject(data: Record<string, unknown>): ImportResult {
  const entries: unknown[] = [];
  const errors: string[] = [];

  try {
    for (const [key, value] of Object.entries(data)) {
      if (typeof value !== 'object' || value === null) {
        errors.push(`Invalid entry at key "${key}": value must be an object`);
        continue;
      }

      const entryObj = value as Record<string, unknown>;

      // 验证是否有 id 字段
      if (!entryObj.id) {
        errors.push(`Entry at key "${key}" is missing "id" field`);
        continue;
      }

      // 验证 id 与 key 是否一致
      if (entryObj.id !== key) {
        errors.push(
          `Entry at key "${key}" has mismatched id "${entryObj.id}"`
        );
      }

      entries.push(value);
    }

    return {
      success: errors.length === 0,
      entries,
      format: 'object',
      count: entries.length,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    return {
      success: false,
      entries: [],
      format: 'object',
      count: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * 从数组格式导入数据
 * 格式：[{ id, field1, field2, ... }, ...]
 *
 * @param data - 数组格式的数据
 * @returns 导入结果
 */
export function importFromArray(data: unknown[]): ImportResult {
  const entries: unknown[] = [];
  const errors: string[] = [];

  try {
    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      if (typeof item !== 'object' || item === null) {
        errors.push(`Invalid entry at index ${i}: value must be an object`);
        continue;
      }

      const entryObj = item as Record<string, unknown>;

      // 验证是否有 id 字段
      if (!entryObj.id) {
        errors.push(`Entry at index ${i} is missing "id" field`);
        continue;
      }

      entries.push(item);
    }

    return {
      success: errors.length === 0,
      entries,
      format: 'array',
      count: entries.length,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    return {
      success: false,
      entries: [],
      format: 'array',
      count: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * 从嵌套数组格式导入数据（decorative_props 专用）
 * 格式：{ common_props: [...] }
 *
 * @param data - 嵌套数组格式的数据
 * @returns 导入结果
 */
export function importFromNestedArray(data: Record<string, unknown>): ImportResult {
  const errors: string[] = [];

  try {
    const commonProps = data.common_props;

    if (!Array.isArray(commonProps)) {
      return {
        success: false,
        entries: [],
        format: 'nested_array',
        count: 0,
        errors: ['"common_props" must be an array']
      };
    }

    // 验证数组中的每个元素
    for (let i = 0; i < commonProps.length; i++) {
      const item = commonProps[i];

      if (typeof item !== 'object' || item === null) {
        errors.push(`Invalid entry at index ${i}: value must be an object`);
        continue;
      }

      const entryObj = item as Record<string, unknown>;

      // 验证是否有 id 字段
      if (!entryObj.id) {
        errors.push(`Entry at index ${i} is missing "id" field`);
      }
    }

    return {
      success: errors.length === 0,
      entries: [data], // 整个对象作为单个条目（保持嵌套结构）
      format: 'nested_array',
      count: commonProps.length, // 实际条目数是数组长度
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    return {
      success: false,
      entries: [],
      format: 'nested_array',
      count: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

// ========================================
// 导出功能
// ========================================

/**
 * 导出库数据为指定格式
 *
 * @param entries - 条目数据数组
 * @param options - 导出选项
 * @param isNestedArray - 是否为嵌套数组格式（decorative_props）
 * @returns JSON 字符串
 */
export function exportLibraryData(
  entries: unknown[],
  options: ExportOptions,
  isNestedArray = false
): string {
  const { format, pretty = true } = options;

  // 处理嵌套数组格式（decorative_props）
  if (isNestedArray) {
    // 假设 entries 只有一个元素，且包含 common_props
    const data = entries[0];
    return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  }

  // 导出为对象格式
  if (format === 'object') {
    return exportToObjectFormat(entries, pretty);
  }

  // 导出为数组格式
  return exportToArrayFormat(entries, pretty);
}

/**
 * 导出为对象格式
 * 格式：{ "entry_id": { id, field1, field2, ... }, ... }
 *
 * @param entries - 条目数据数组
 * @param pretty - 是否美化 JSON
 * @returns JSON 字符串
 */
function exportToObjectFormat(entries: unknown[], pretty: boolean): string {
  const obj: Record<string, unknown> = {};

  for (const entry of entries) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }

    const entryObj = entry as Record<string, unknown>;
    const id = entryObj.id;

    if (typeof id === 'string') {
      obj[id] = entry;
    }
  }

  return pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
}

/**
 * 导出为数组格式
 * 格式：[{ id, field1, field2, ... }, ...]
 *
 * @param entries - 条目数据数组
 * @param pretty - 是否美化 JSON
 * @returns JSON 字符串
 */
function exportToArrayFormat(entries: unknown[], pretty: boolean): string {
  return pretty ? JSON.stringify(entries, null, 2) : JSON.stringify(entries);
}

// ========================================
// 格式转换工具
// ========================================

/**
 * 将对象格式转换为数组格式
 *
 * @param data - 对象格式的数据
 * @returns 数组格式的数据
 */
export function convertObjectToArray(data: Record<string, unknown>): unknown[] {
  return Object.values(data);
}

/**
 * 将数组格式转换为对象格式
 *
 * @param data - 数组格式的数据
 * @returns 对象格式的数据
 */
export function convertArrayToObject(data: unknown[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  for (const entry of data) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }

    const entryObj = entry as Record<string, unknown>;
    const id = entryObj.id;

    if (typeof id === 'string') {
      obj[id] = entry;
    }
  }

  return obj;
}

// ========================================
// 验证工具
// ========================================

/**
 * 验证导入的数据是否有重复的 ID
 *
 * @param entries - 条目数据数组
 * @returns 重复的 ID 列表
 */
export function findDuplicateIds(entries: unknown[]): string[] {
  const idSet = new Set<string>();
  const duplicates = new Set<string>();

  for (const entry of entries) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }

    const entryObj = entry as Record<string, unknown>;
    const id = entryObj.id;

    if (typeof id === 'string') {
      if (idSet.has(id)) {
        duplicates.add(id);
      } else {
        idSet.add(id);
      }
    }
  }

  return Array.from(duplicates);
}

/**
 * 验证条目是否包含必需字段
 *
 * @param entry - 条目数据
 * @param requiredFields - 必需字段列表
 * @returns 是否有效
 */
export function validateRequiredFields(
  entry: unknown,
  requiredFields: string[]
): { valid: boolean; missingFields?: string[] } {
  if (typeof entry !== 'object' || entry === null) {
    return { valid: false };
  }

  const entryObj = entry as Record<string, unknown>;
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (!(field in entryObj) || entryObj[field] === undefined || entryObj[field] === null) {
      missingFields.push(field);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields: missingFields.length > 0 ? missingFields : undefined
  };
}
