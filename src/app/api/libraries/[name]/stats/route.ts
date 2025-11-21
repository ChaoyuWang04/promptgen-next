/**
 * Library Statistics Endpoint
 *
 * GET /api/libraries/[name]/stats - Get library statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { isNestedArraySchema } from '@/lib/schema/schema-manager';

export const dynamic = 'force-dynamic';

/**
 * GET /api/libraries/[name]/stats
 *
 * Returns statistics about a library.
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     name: string,
 *     displayName: string,
 *     entryCount: number,
 *     schemaVersion: string,
 *     isActive: boolean,
 *     structureType: 'standard' | 'nested_array',
 *     createdAt: string,
 *     updatedAt: string,
 *     description?: string
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    // Get library
    const library = await prisma.library.findUnique({
      where: { name },
    });

    if (!library) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `库不存在: ${name}`,
          },
        },
        { status: 404 }
      );
    }

    // Calculate entry count
    const entries = library.entries;
    let entryCount = 0;
    let structureType: 'standard' | 'nested_array' = 'standard';

    if (library.schema && isNestedArraySchema(library.schema)) {
      // Nested array structure (decorative_props)
      structureType = 'nested_array';
      const entriesObj = entries as Record<string, unknown>;
      if (entriesObj.common_props && Array.isArray(entriesObj.common_props)) {
        entryCount = entriesObj.common_props.length;
      }
    } else {
      // Standard object structure
      if (typeof entries === 'object' && !Array.isArray(entries)) {
        entryCount = Object.keys(entries as Record<string, unknown>).length;
      } else if (Array.isArray(entries)) {
        entryCount = entries.length;
      }
    }

    // Prepare response
    const stats = {
      name: library.name,
      displayName: library.displayName,
      description: library.description,
      displayField: library.displayField,
      entryCount,
      schemaVersion: library.schemaVersion,
      isActive: library.isActive,
      structureType,
      order: library.order,
      createdAt: library.createdAt.toISOString(),
      updatedAt: library.updatedAt.toISOString(),
      metadata: library.metadata,
      schema: library.schema, // Add schema for editing
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error(`[GET /api/libraries/${(await params).name}/stats] Error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取统计信息失败',
          details: { originalError: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}
