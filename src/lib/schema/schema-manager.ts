/**
 * Schema Manager
 *
 * 提供 JSON Schema 管理和验证功能：
 * - 验证条目数据是否符合 schema
 * - 从 schema 生成表单字段定义
 * - Schema 迁移工具（未来功能）
 */

// ========================================
// 类型定义
// ========================================

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'array' | 'object';
  required: boolean;
  description?: string;
  placeholder?: string;
  defaultValue?: unknown;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    minimum?: number;
    maximum?: number;
    enum?: string[];
  };
  items?: FormField; // For array types
  properties?: FormField[]; // For object types
}

// ========================================
// Schema 验证
// ========================================

/**
 * 验证条目数据是否符合 JSON Schema
 *
 * @param entry - 要验证的条目数据
 * @param schema - JSON Schema 定义
 * @returns 验证结果
 */
export function validateEntryAgainstSchema(
  entry: unknown,
  schema: unknown
): ValidationResult {
  const errors: ValidationError[] = [];

  // 基本类型检查
  if (typeof schema !== 'object' || schema === null) {
    return {
      valid: false,
      errors: [{ field: 'schema', message: 'Invalid schema format' }]
    };
  }

  const schemaObj = schema as Record<string, unknown>;

  // 检查是否为对象类型的 schema
  if (schemaObj.type !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'schema', message: 'Schema must be of type "object"' }]
    };
  }

  // 验证条目是否为对象
  if (typeof entry !== 'object' || entry === null) {
    return {
      valid: false,
      errors: [{ field: 'entry', message: 'Entry must be an object' }]
    };
  }

  const entryObj = entry as Record<string, unknown>;
  const properties = schemaObj.properties as Record<string, unknown> | undefined;
  const required = (schemaObj.required as string[]) || [];

  if (!properties) {
    return { valid: true };
  }

  // 验证必填字段
  for (const field of required) {
    if (!(field in entryObj) || entryObj[field] === undefined || entryObj[field] === null) {
      errors.push({
        field,
        message: `Required field "${field}" is missing`,
        value: undefined
      });
    }
  }

  // 验证每个字段的类型
  for (const [field, fieldSchema] of Object.entries(properties)) {
    if (!(field in entryObj)) {
      continue; // 跳过可选字段
    }

    const value = entryObj[field];
    const fieldSchemaObj = fieldSchema as Record<string, unknown>;
    const fieldType = fieldSchemaObj.type as string;

    // 类型验证
    const typeErrors = validateFieldType(field, value, fieldType, fieldSchemaObj);
    errors.push(...typeErrors);
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * 验证字段类型
 */
function validateFieldType(
  field: string,
  value: unknown,
  expectedType: string,
  fieldSchema: Record<string, unknown>
): ValidationError[] {
  const errors: ValidationError[] = [];

  switch (expectedType) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push({
          field,
          message: `Field "${field}" must be a string`,
          value
        });
      } else {
        // 验证 pattern
        const pattern = fieldSchema.pattern as string | undefined;
        if (pattern && !new RegExp(pattern).test(value)) {
          errors.push({
            field,
            message: `Field "${field}" does not match pattern: ${pattern}`,
            value
          });
        }

        // 验证 minLength
        const minLength = fieldSchema.minLength as number | undefined;
        if (minLength !== undefined && value.length < minLength) {
          errors.push({
            field,
            message: `Field "${field}" must be at least ${minLength} characters`,
            value
          });
        }

        // 验证 maxLength
        const maxLength = fieldSchema.maxLength as number | undefined;
        if (maxLength !== undefined && value.length > maxLength) {
          errors.push({
            field,
            message: `Field "${field}" must be at most ${maxLength} characters`,
            value
          });
        }
      }
      break;

    case 'number':
    case 'integer':
      if (typeof value !== 'number') {
        errors.push({
          field,
          message: `Field "${field}" must be a number`,
          value
        });
      } else {
        // 验证 minimum
        const minimum = fieldSchema.minimum as number | undefined;
        if (minimum !== undefined && value < minimum) {
          errors.push({
            field,
            message: `Field "${field}" must be at least ${minimum}`,
            value
          });
        }

        // 验证 maximum
        const maximum = fieldSchema.maximum as number | undefined;
        if (maximum !== undefined && value > maximum) {
          errors.push({
            field,
            message: `Field "${field}" must be at most ${maximum}`,
            value
          });
        }
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        errors.push({
          field,
          message: `Field "${field}" must be a boolean`,
          value
        });
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        errors.push({
          field,
          message: `Field "${field}" must be an array`,
          value
        });
      } else {
        // 验证 minItems
        const minItems = fieldSchema.minItems as number | undefined;
        if (minItems !== undefined && value.length < minItems) {
          errors.push({
            field,
            message: `Field "${field}" must have at least ${minItems} items`,
            value
          });
        }

        // 验证 maxItems
        const maxItems = fieldSchema.maxItems as number | undefined;
        if (maxItems !== undefined && value.length > maxItems) {
          errors.push({
            field,
            message: `Field "${field}" must have at most ${maxItems} items`,
            value
          });
        }

        // TODO: 验证数组元素类型 (items schema)
      }
      break;

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push({
          field,
          message: `Field "${field}" must be an object`,
          value
        });
      }
      // TODO: 递归验证对象属性
      break;

    default:
      // 未知类型，跳过验证
      break;
  }

  return errors;
}

// ========================================
// 表单字段生成
// ========================================

/**
 * 从 JSON Schema 生成表单字段定义
 *
 * @param schema - JSON Schema 定义
 * @returns 表单字段列表
 */
export function generateFormFieldsFromSchema(schema: unknown): FormField[] {
  if (typeof schema !== 'object' || schema === null) {
    return [];
  }

  const schemaObj = schema as Record<string, unknown>;
  const properties = schemaObj.properties as Record<string, unknown> | undefined;
  const required = (schemaObj.required as string[]) || [];

  if (!properties) {
    return [];
  }

  const fields: FormField[] = [];

  for (const [fieldName, fieldSchema] of Object.entries(properties)) {
    const fieldSchemaObj = fieldSchema as Record<string, unknown>;
    const field = generateFormField(fieldName, fieldSchemaObj, required.includes(fieldName));
    fields.push(field);
  }

  return fields;
}

/**
 * 从单个字段 schema 生成表单字段定义
 */
function generateFormField(
  name: string,
  fieldSchema: Record<string, unknown>,
  required: boolean
): FormField {
  const type = fieldSchema.type as string;
  const description = fieldSchema.description as string | undefined;
  const pattern = fieldSchema.pattern as string | undefined;
  const minLength = fieldSchema.minLength as number | undefined;
  const maxLength = fieldSchema.maxLength as number | undefined;
  const minimum = fieldSchema.minimum as number | undefined;
  const maximum = fieldSchema.maximum as number | undefined;
  const enumValues = fieldSchema.enum as string[] | undefined;

  // 确定表单字段类型
  let formFieldType: FormField['type'] = 'text';

  if (type === 'string') {
    formFieldType = maxLength && maxLength > 100 ? 'textarea' : 'text';
  } else if (type === 'number' || type === 'integer') {
    formFieldType = 'number';
  } else if (type === 'boolean') {
    formFieldType = 'boolean';
  } else if (type === 'array') {
    formFieldType = 'array';
  } else if (type === 'object') {
    formFieldType = 'object';
  }

  // 如果有 enum，使用 select
  if (enumValues && enumValues.length > 0) {
    formFieldType = 'select';
  }

  // 生成 label（将下划线转换为空格并首字母大写）
  const label = name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const field: FormField = {
    name,
    label,
    type: formFieldType,
    required,
    description,
    placeholder: description,
    validation: {
      pattern,
      minLength,
      maxLength,
      minimum,
      maximum,
      enum: enumValues
    }
  };

  // 处理数组类型
  if (type === 'array' && fieldSchema.items) {
    const itemsSchema = fieldSchema.items as Record<string, unknown>;
    field.items = generateFormField(
      `${name}_item`,
      itemsSchema,
      false
    );
  }

  // 处理对象类型
  if (type === 'object' && fieldSchema.properties) {
    const objProperties = fieldSchema.properties as Record<string, unknown>;
    const objRequired = (fieldSchema.required as string[]) || [];
    field.properties = Object.entries(objProperties).map(([propName, propSchema]) =>
      generateFormField(
        propName,
        propSchema as Record<string, unknown>,
        objRequired.includes(propName)
      )
    );
  }

  return field;
}

// ========================================
// Schema 迁移工具（未来功能）
// ========================================

/**
 * 迁移 schema 版本（未来功能）
 *
 * @param oldSchema - 旧版 schema
 * @param newSchema - 新版 schema
 * @param entries - 现有条目数据
 * @returns 迁移后的条目数据
 */
export function migrateSchema(
  oldSchema: unknown,
  newSchema: unknown,
  entries: unknown[]
): unknown[] {
  // TODO: 实现 schema 迁移逻辑
  // 1. 比较两个 schema 的差异
  // 2. 应用迁移规则（字段重命名、类型转换、默认值等）
  // 3. 返回迁移后的数据

  console.warn('Schema migration is not yet implemented');
  return entries;
}

// ========================================
// 辅助函数
// ========================================

/**
 * 格式化验证错误信息
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .map(error => `${error.field}: ${error.message}`)
    .join('\n');
}

/**
 * 检查 schema 是否为嵌套数组结构（如 decorative_props）
 */
export function isNestedArraySchema(schema: unknown): boolean {
  if (typeof schema !== 'object' || schema === null) {
    return false;
  }

  const schemaObj = schema as Record<string, unknown>;
  const properties = schemaObj.properties as Record<string, unknown> | undefined;

  if (!properties) {
    return false;
  }

  // 检查是否有 common_props 等特殊字段
  return 'common_props' in properties;
}

/**
 * 从 schema 中提取默认值
 */
export function extractDefaultValues(schema: unknown): Record<string, unknown> {
  if (typeof schema !== 'object' || schema === null) {
    return {};
  }

  const schemaObj = schema as Record<string, unknown>;
  const properties = schemaObj.properties as Record<string, unknown> | undefined;

  if (!properties) {
    return {};
  }

  const defaults: Record<string, unknown> = {};

  for (const [fieldName, fieldSchema] of Object.entries(properties)) {
    const fieldSchemaObj = fieldSchema as Record<string, unknown>;
    const defaultValue = fieldSchemaObj.default;

    if (defaultValue !== undefined) {
      defaults[fieldName] = defaultValue;
    } else {
      // 根据类型设置默认值
      const type = fieldSchemaObj.type as string;
      switch (type) {
        case 'string':
          defaults[fieldName] = '';
          break;
        case 'number':
        case 'integer':
          defaults[fieldName] = 0;
          break;
        case 'boolean':
          defaults[fieldName] = false;
          break;
        case 'array':
          defaults[fieldName] = [];
          break;
        case 'object':
          defaults[fieldName] = {};
          break;
      }
    }
  }

  return defaults;
}
