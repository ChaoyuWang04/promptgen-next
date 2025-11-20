/**
 * Schema Template Generator
 *
 * Generates JSON templates from JSON Schema definitions with intelligent
 * example values based on field descriptions.
 */

interface JSONSchemaProperty {
  type: string | string[];
  description?: string;
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  default?: unknown;
  enum?: unknown[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
}

interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
}

/**
 * Generate intelligent example value based on field description and type
 */
function generateExampleValue(
  fieldName: string,
  description: string | undefined,
  type: string,
  schemaProperty: JSONSchemaProperty
): string {
  // If description contains an example (e.g., "例如：char_betty_casual"), extract it
  if (description && description.includes('例如：')) {
    const exampleMatch = description.match(/例如[：:]\s*([^，。\n]+)/);
    if (exampleMatch) {
      return description; // Return full description with example
    }
  }

  // Generate example based on description keywords or field name
  const descLower = (description || fieldName).toLowerCase();

  // Common field patterns
  if (fieldName === 'id' || descLower.includes('标识')) {
    return `${description || '唯一标识符'}，例如：${inferIdExample(fieldName)}`;
  }

  if (fieldName === 'name' || descLower.includes('名称')) {
    return `${description || '名称'}，例如：示例名称`;
  }

  if (descLower.includes('颜色') || descLower.includes('color')) {
    return `${description || '颜色'}，例如：红色`;
  }

  if (descLower.includes('描述') || descLower.includes('说明')) {
    return `${description || '描述说明'}，例如：这是一段示例描述`;
  }

  if (descLower.includes('模板') || descLower.includes('template')) {
    return `${description || '模板'}，例如：{{示例模板}}`;
  }

  // Type-based examples
  if (type === 'string') {
    if (description) {
      return `${description}，例如：示例${description.replace(/[，。：]/g, '')}`;
    }
    return `string类型，例如：示例文本`;
  }

  if (type === 'number' || type === 'integer') {
    return `${description || 'number类型'}，例如：0`;
  }

  if (type === 'boolean') {
    return `${description || 'boolean类型'}，例如：true`;
  }

  // Fallback
  return description
    ? `${description}，例如：示例值`
    : `${type}类型`;
}

/**
 * Infer example ID based on field name pattern
 */
function inferIdExample(fieldName: string): string {
  if (fieldName.includes('char')) return 'char_example_001';
  if (fieldName.includes('pose')) return 'pose_example_001';
  if (fieldName.includes('scene')) return 'scene_example_001';
  if (fieldName.includes('theme')) return 'theme_example_001';
  if (fieldName.includes('style')) return 'style_example_001';
  if (fieldName.includes('prop')) return 'prop_example_001';
  return 'example_id_001';
}

/**
 * Generate array example with sample items
 */
function generateArrayExample(
  fieldName: string,
  description: string | undefined,
  itemSchema: JSONSchemaProperty | undefined
): unknown[] {
  // If items schema has properties, generate object array
  if (itemSchema?.properties) {
    return [generateTemplateFromProperties(itemSchema.properties, `${fieldName}_item`)];
  }

  // Simple array examples based on description
  const descLower = (description || '').toLowerCase();

  if (descLower.includes('标签') || descLower.includes('tag')) {
    return ['示例标签1', '示例标签2'];
  }

  if (descLower.includes('颜色') || descLower.includes('color')) {
    return ['红色', '蓝色'];
  }

  if (descLower.includes('配件') || descLower.includes('装饰')) {
    return ['示例配件1', '示例配件2'];
  }

  // Default array example
  return ['示例项1', '示例项2'];
}

/**
 * Generate template from schema properties
 */
function generateTemplateFromProperties(
  properties: Record<string, JSONSchemaProperty>,
  prefix: string = ''
): Record<string, unknown> {
  const template: Record<string, unknown> = {};

  for (const [fieldName, fieldSchema] of Object.entries(properties)) {
    const types = Array.isArray(fieldSchema.type) ? fieldSchema.type : [fieldSchema.type];
    const primaryType = types[0];

    // Handle different types
    switch (primaryType) {
      case 'string':
      case 'number':
      case 'integer':
      case 'boolean':
        template[fieldName] = generateExampleValue(
          fieldName,
          fieldSchema.description,
          primaryType,
          fieldSchema
        );
        break;

      case 'array':
        template[fieldName] = generateArrayExample(
          fieldName,
          fieldSchema.description,
          fieldSchema.items
        );
        break;

      case 'object':
        if (fieldSchema.properties) {
          template[fieldName] = generateTemplateFromProperties(
            fieldSchema.properties,
            `${prefix}_${fieldName}`
          );
        } else {
          template[fieldName] = `${fieldSchema.description || 'object类型'}，例如：{}`;
        }
        break;

      default:
        // Fallback for unknown types
        template[fieldName] = fieldSchema.description
          ? `${fieldSchema.description}，例如：示例值`
          : `${primaryType}类型`;
    }
  }

  return template;
}

/**
 * Generate template from JSON Schema
 *
 * @param schema - JSON Schema definition
 * @param structureType - Library structure type ('standard' or 'nested_array')
 * @returns Template object with example values based on schema descriptions
 */
export function generateTemplateFromSchema(
  schema: unknown,
  structureType?: string
): Record<string, unknown> {
  if (!schema || typeof schema !== 'object') {
    throw new Error('Invalid schema: schema must be an object');
  }

  const schemaObj = schema as JSONSchema;

  if (!schemaObj.properties) {
    throw new Error('Invalid schema: missing properties field');
  }

  const template = generateTemplateFromProperties(schemaObj.properties);

  // Handle special structure types (decorative_props uses nested_array)
  if (structureType === 'nested_array') {
    // Wrap in common_props array structure
    return {
      common_props: [template],
    };
  }

  return template;
}

/**
 * Generate formatted JSON string from schema
 *
 * @param schema - JSON Schema definition
 * @param structureType - Library structure type
 * @returns Formatted JSON string (2-space indentation)
 */
export function generateFormattedTemplateFromSchema(
  schema: unknown,
  structureType?: string
): string {
  try {
    const template = generateTemplateFromSchema(schema, structureType);
    return JSON.stringify(template, null, 2);
  } catch (error) {
    console.error('Failed to generate template from schema:', error);
    throw error;
  }
}

/**
 * Check if the template generation is available for a given schema
 */
export function canGenerateTemplate(schema: unknown): boolean {
  if (!schema || typeof schema !== 'object') {
    return false;
  }

  const schemaObj = schema as JSONSchema;
  return !!schemaObj.properties && Object.keys(schemaObj.properties).length > 0;
}
