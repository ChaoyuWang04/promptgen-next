/**
 * GET /api/templates/variables
 *
 * Returns available template variables for a specific template category.
 * Used by template editor for autocomplete and variable reference.
 *
 * Query parameters:
 * - type: Template category (main or diff) - optional, returns all if not specified
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { ENABLED_LIBRARIES } from '@/lib/config/library-config';

export const dynamic = 'force-dynamic';

interface VariableMetadata {
  name: string;
  type: string;
  description: string;
  example?: string;
  category?: 'MAIN' | 'DIFF' | 'BOTH';
}

interface Warning {
  library: string;
  message: string;
}

interface VariablesResponse {
  variables: VariableMetadata[];
  warnings: Warning[];
}

/**
 * Infer TypeScript type from JSON Schema type
 */
function inferTypeFromSchema(schemaProp: any): string {
  if (!schemaProp.type) return 'unknown';

  const type = schemaProp.type;
  if (type === 'array') {
    const itemType = schemaProp.items?.type || 'unknown';
    return `array<${itemType}>`;
  }
  return type;
}

/**
 * Generate example value from schema property
 */
function generateExampleFromSchema(schemaProp: any, fieldName: string): string {
  if (schemaProp.example) return String(schemaProp.example);

  const type = schemaProp.type;
  switch (type) {
    case 'string':
      return `示例${fieldName}`;
    case 'number':
    case 'integer':
      return '123';
    case 'boolean':
      return 'true';
    case 'array':
      return '["item1", "item2"]';
    case 'object':
      return '{}';
    default:
      return '';
  }
}

/**
 * Generate variable metadata from library JSON schemas
 */
async function generateVariableMetadata(category?: 'MAIN' | 'DIFF'): Promise<VariablesResponse> {
  const variables: VariableMetadata[] = [];
  const warnings: Warning[] = [];

  // Load all libraries and extract variables from their JSON schemas
  for (const libConfig of ENABLED_LIBRARIES) {
    const library = await prisma.library.findUnique({
      where: { name: libConfig.name },
      select: { schema: true, name: true, category: true },
    });

    if (!library) {
      warnings.push({
        library: libConfig.name,
        message: `库 "${libConfig.displayName}" 不存在于数据库中`,
      });
      continue;
    }

    // Skip library if it doesn't match the requested category
    if (category && library.category !== category) {
      continue;
    }

    // Check if schema exists
    if (!library.schema) {
      warnings.push({
        library: libConfig.name,
        message: `库 "${libConfig.displayName}" 缺少 JSON Schema 定义，无法生成变量参考`,
      });
      continue;
    }

    // Parse schema
    const schema = library.schema as any;

    if (!schema.properties || typeof schema.properties !== 'object') {
      warnings.push({
        library: libConfig.name,
        message: `库 "${libConfig.displayName}" 的 JSON Schema 格式无效（缺少 properties 字段）`,
      });
      continue;
    }

    // Extract variables from schema properties
    for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
      const prop = fieldSchema as any;
      const variableName = `${libConfig.name}.${fieldName}`;
      const type = inferTypeFromSchema(prop);
      const isArray = prop.type === 'array';

      variables.push({
        name: variableName,
        type: type,
        description: prop.description || `${libConfig.displayName} - ${fieldName}`,
        example: isArray
          ? `{{${variableName} | join}}`
          : `{{${variableName}}}`,
        category: library.category, // Use library's category (MAIN or DIFF)
      });
    }
  }

  // Add module shortcuts (only for MAIN templates)
  if (!category || category === 'MAIN') {
    const modules = [
      { name: 'character', desc: '角色模块 - 完整角色描述（组合多个字段）' },
      { name: 'pose', desc: '姿态模块 - 完整姿态描述（组合多个字段）' },
      { name: 'scene', desc: '场景模块 - 完整场景描述（组合多个字段）' },
      { name: 'theme', desc: '主题模块 - 完整主题描述（组合多个字段）' },
      { name: 'lighting', desc: '光照模块 - 完整光照描述（从相关字段生成）' },
      { name: 'style', desc: '画风模块 - 完整画风描述（组合多个字段）' },
      { name: 'composition', desc: '构图模块 - 构图规则（从相关字段生成）' },
    ];

    for (const module of modules) {
      variables.push({
        name: `@module:${module.name}`,
        type: 'string',
        description: module.desc,
        example: `{{@module:${module.name}}}`,
        category: 'MAIN',
      });
    }
  }

  // Add DIFF-specific variables
  if (!category || category === 'DIFF') {
    const diffVariables = [
      {
        path: 'outfit_state',
        desc: 'Outfit 当前状态对象（包含当前服装的所有属性）',
        type: 'object'
      },
      {
        path: 'new_outfit_state',
        desc: 'Outfit 新状态对象（包含修改后服装的所有属性）',
        type: 'object'
      },
      {
        path: 'color_changes',
        desc: '颜色变化列表（记录哪些颜色属性发生了变化）',
        type: 'array<string>'
      },
      {
        path: 'decorations',
        desc: '当前装饰列表（当前已有的装饰元素）',
        type: 'array<string>'
      },
      {
        path: 'new_decorations',
        desc: '新增装饰列表（本次新添加的装饰元素）',
        type: 'array<string>'
      },
      {
        path: 'all_decorations',
        desc: '所有装饰列表（包括当前和新增的所有装饰）',
        type: 'array<string>'
      },
    ];

    for (const diffVar of diffVariables) {
      const isArray = diffVar.type.startsWith('array');
      variables.push({
        name: diffVar.path,
        type: diffVar.type,
        description: diffVar.desc,
        example: isArray
          ? `{{${diffVar.path} | join}}`
          : `{{${diffVar.path}}}`,
        category: 'DIFF',
      });
    }
  }

  // Filter by category if specified
  const filteredVariables = category
    ? variables.filter(v => v.category === category || v.category === 'BOTH')
    : variables;

  return {
    variables: filteredVariables,
    warnings,
  };
}

/**
 * GET handler
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type')?.toUpperCase() as 'MAIN' | 'DIFF' | undefined;

    // Validate type if provided
    if (type && !['MAIN', 'DIFF'].includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid type parameter. Must be "main" or "diff".',
          },
        },
        { status: 400 }
      );
    }

    const result = await generateVariableMetadata(type);

    return NextResponse.json({
      success: true,
      data: result.variables,
      warnings: result.warnings,
    });
  } catch (error) {
    console.error('[GET /api/templates/variables] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取模板变量列表失败',
          details: { originalError: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}
