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
  path: string;
  type: string;
  description: string;
  example: string;
  requires_filter: boolean;
  category?: 'MAIN' | 'DIFF' | 'BOTH';
}

/**
 * Generate variable metadata from library structure
 */
async function generateVariableMetadata(category?: 'MAIN' | 'DIFF'): Promise<VariableMetadata[]> {
  const variables: VariableMetadata[] = [];

  // Load one example entry from each library to infer structure
  for (const libConfig of ENABLED_LIBRARIES) {
    const library = await prisma.library.findUnique({
      where: { name: libConfig.name },
      select: { entries: true },
    });

    if (!library) continue;

    const entries = library.entries as Record<string, any>;
    let sampleEntry: any;

    // Get sample entry
    if (libConfig.structureType === 'nested_array') {
      const commonProps = entries.common_props || [];
      sampleEntry = commonProps[0];
    } else {
      const firstKey = Object.keys(entries)[0];
      sampleEntry = entries[firstKey];
    }

    if (!sampleEntry) continue;

    // Generate variables from sample entry
    for (const [key, value] of Object.entries(sampleEntry)) {
      const variablePath = `${libConfig.name}.${key}`;
      const type = Array.isArray(value)
        ? 'array'
        : typeof value === 'object' && value !== null
        ? 'object'
        : (typeof value as any);

      variables.push({
        path: variablePath,
        type,
        description: `${libConfig.displayName} - ${key}`,
        requires_filter: Array.isArray(value),
        example: Array.isArray(value)
          ? `{{${variablePath} | join}}`
          : `{{${variablePath}}}`,
        category: 'BOTH', // Available in both MAIN and DIFF templates
      });
    }
  }

  // Add module shortcuts (only for MAIN templates)
  if (!category || category === 'MAIN') {
    const modules = [
      { name: 'character', desc: '角色模块 - 完整角色描述' },
      { name: 'pose', desc: '姿态模块 - 完整姿态描述' },
      { name: 'scene', desc: '场景模块 - 完整场景描述' },
      { name: 'theme', desc: '主题模块 - 完整主题描述' },
      { name: 'lighting', desc: '光照模块 - 光照描述' },
      { name: 'style', desc: '画风模块 - 完整画风描述' },
      { name: 'composition', desc: '构图模块 - 构图规则' },
    ];

    for (const module of modules) {
      variables.push({
        path: `@module:${module.name}`,
        type: 'string',
        description: module.desc,
        example: `{{@module:${module.name}}}`,
        requires_filter: false,
        category: 'MAIN',
      });
    }
  }

  // Add DIFF-specific variables
  if (!category || category === 'DIFF') {
    const diffVariables = [
      { path: 'outfit_state', desc: 'Outfit状态对象', type: 'object' },
      { path: 'new_outfit_state', desc: '新Outfit状态对象', type: 'object' },
      { path: 'color_changes', desc: '颜色变化列表', type: 'array' },
      { path: 'decorations', desc: '装饰列表', type: 'array' },
      { path: 'new_decorations', desc: '新装饰列表', type: 'array' },
      { path: 'all_decorations', desc: '所有装饰列表', type: 'array' },
    ];

    for (const diffVar of diffVariables) {
      variables.push({
        path: diffVar.path,
        type: diffVar.type,
        description: diffVar.desc,
        example: diffVar.type === 'array'
          ? `{{${diffVar.path} | join}}`
          : `{{${diffVar.path}}}`,
        requires_filter: diffVar.type === 'array',
        category: 'DIFF',
      });
    }
  }

  // Filter by category if specified
  if (category) {
    return variables.filter(v => v.category === category || v.category === 'BOTH');
  }

  return variables;
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

    const variables = await generateVariableMetadata(type);

    return NextResponse.json({
      success: true,
      data: {
        variables,
        total_count: variables.length,
        category: type || 'ALL',
        filters: [
          {
            name: 'join',
            description: '连接数组元素',
            usage: '{{array | join}} 或 {{array | join: ", "}}',
          },
          {
            name: 'uppercase',
            description: '转换为大写',
            usage: '{{text | uppercase}}',
          },
          {
            name: 'lowercase',
            description: '转换为小写',
            usage: '{{text | lowercase}}',
          },
          {
            name: 'first',
            description: '获取数组前N个元素',
            usage: '{{array | first: 3}}',
          },
          {
            name: 'default',
            description: '提供默认值',
            usage: '{{value | default: "N/A"}}',
          },
        ],
      },
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
