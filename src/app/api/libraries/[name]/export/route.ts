/**
 * Library Export Endpoint
 *
 * GET /api/libraries/[name]/export - Export entries as JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { exportLibraryData, type ExportFormat } from '@/lib/importers/library-importer';
import { isNestedArraySchema } from '@/lib/schema/schema-manager';

export const dynamic = 'force-dynamic';

/**
 * GET /api/libraries/[name]/export
 *
 * Export library entries in specified format.
 *
 * Query parameters:
 * - format: 'object' | 'array' (default: 'object')
 * - pretty: 'true' | 'false' (default: 'true')
 *
 * Response: JSON string (plain text with Content-Type: application/json)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'object') as ExportFormat;
    const pretty = searchParams.get('pretty') !== 'false'; // Default is true

    // Validate format
    if (format !== 'object' && format !== 'array') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'format 必须是 "object" 或 "array"',
          },
        },
        { status: 400 }
      );
    }

    // Get library
    const library = await prisma.library.findUnique({
      where: { name },
      select: {
        entries: true,
        schema: true,
      },
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

    const entries = library.entries;

    // Check if it's a nested array structure
    const isNestedArray = library.schema
      ? isNestedArraySchema(library.schema)
      : false;

    // Convert entries to array if it's an object
    let entriesArray: unknown[];
    if (isNestedArray) {
      // For nested array (decorative_props), keep as-is
      entriesArray = [entries];
    } else if (typeof entries === 'object' && !Array.isArray(entries)) {
      // Convert object to array
      entriesArray = Object.values(entries as Record<string, unknown>);
    } else {
      entriesArray = entries as unknown[];
    }

    // Export data
    const jsonString = exportLibraryData(
      entriesArray,
      { format, pretty },
      isNestedArray
    );

    // Return as downloadable JSON file
    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${name}_export.json"`,
      },
    });
  } catch (error) {
    console.error(`[GET /api/libraries/${(await params).name}/export] Error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '导出失败',
          details: { originalError: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}
