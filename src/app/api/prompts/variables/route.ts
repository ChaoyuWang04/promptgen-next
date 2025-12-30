/**
 * GET /api/prompts/variables
 *
 * Returns available template variables for autocomplete.
 * Provides metadata about all variables accessible in templates.
 *
 * Uses dynamic library configuration from database via LibraryService.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { type VariableMetadata } from '@/lib/engines/types';
import { libraryService } from '@/lib/services';

export const dynamic = 'force-dynamic';

/**
 * Generate variable metadata from library structure
 *
 * Uses LibraryService for dynamic library configuration.
 */
async function generateVariableMetadata(): Promise<VariableMetadata[]> {
  const variables: VariableMetadata[] = [];

  // Load all libraries dynamically from database
  const libraries = await libraryService.getAll();

  // Load one example entry from each library to infer structure
  for (const libConfig of libraries) {
    const library = await prisma.library.findUnique({
      where: { name: libConfig.name },
      select: { entries: true },
    });

    if (!library) continue;

    const entries = library.entries as Record<string, unknown>;
    let sampleEntry: Record<string, unknown> | undefined;

    // Get sample entry - check structure type from metadata
    const structureType = libConfig.metadata?.structureType;
    if (structureType === 'nested_array') {
      const commonProps = (entries.common_props as unknown[]) || [];
      sampleEntry = commonProps[0] as Record<string, unknown>;
    } else {
      const firstKey = Object.keys(entries)[0];
      sampleEntry = entries[firstKey] as Record<string, unknown>;
    }

    if (!sampleEntry) continue;

    // Generate variables from sample entry
    for (const [key, value] of Object.entries(sampleEntry)) {
      const variablePath = `${libConfig.name}.${key}`;
      const type = Array.isArray(value)
        ? 'array'
        : typeof value === 'object' && value !== null
        ? 'object'
        : typeof value as 'string' | 'number' | 'boolean';

      variables.push({
        path: variablePath,
        type,
        description: `${libConfig.displayName} - ${key}`,
        requires_filter: Array.isArray(value),
        example: Array.isArray(value)
          ? `{{${variablePath} | join}}`
          : `{{${variablePath}}}`,
      });
    }
  }

  return variables;
}

/**
 * GET handler
 */
export async function GET() {
  try {
    const variables = await generateVariableMetadata();

    return NextResponse.json({
      success: true,
      data: {
        variables,
        total_count: variables.length,
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
    console.error('[GET /api/prompts/variables] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取变量列表失败',
          details: { originalError: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}
