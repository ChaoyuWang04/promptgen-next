/**
 * Library Import Endpoint
 *
 * POST /api/libraries/[name]/import - Import entries from JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { importLibraryData } from '@/lib/importers/library-importer';

export const dynamic = 'force-dynamic';

/**
 * POST /api/libraries/[name]/import
 *
 * Import library entries from JSON data.
 * Automatically detects format (object, array, or nested_array).
 *
 * Request body:
 * {
 *   "data": object | array,  // JSON data to import
 *   "mode": "replace" | "merge"  // Import mode (default: replace)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     format: string,
 *     count: number,
 *     mode: string
 *   }
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    // Check if library exists
    const library = await prisma.library.findUnique({
      where: { name },
      select: {
        id: true,
        entries: true,
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

    // Parse request body
    const body = await request.json();
    const { data, mode = 'replace' } = body;

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '缺少必需字段: data',
          },
        },
        { status: 400 }
      );
    }

    // Validate mode
    if (mode !== 'replace' && mode !== 'merge') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'mode 必须是 "replace" 或 "merge"',
          },
        },
        { status: 400 }
      );
    }

    // Import data
    const importResult = importLibraryData(data);

    if (!importResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'IMPORT_ERROR',
            message: '导入数据失败',
            details: {
              errors: importResult.errors,
              format: importResult.format,
            },
          },
        },
        { status: 400 }
      );
    }

    // Determine new entries based on mode
    let newEntries: unknown;

    if (mode === 'replace') {
      // Replace all entries
      if (importResult.format === 'nested_array') {
        newEntries = importResult.entries[0]; // { common_props: [...] }
      } else {
        // Convert array to object if needed
        if (Array.isArray(importResult.entries)) {
          newEntries = {};
          for (const entry of importResult.entries) {
            if (typeof entry === 'object' && entry !== null) {
              const entryObj = entry as Record<string, unknown>;
              const id = entryObj.id as string;
              if (id) {
                (newEntries as Record<string, unknown>)[id] = entry;
              }
            }
          }
        } else {
          newEntries = importResult.entries;
        }
      }
    } else {
      // Merge with existing entries
      const currentEntries = library.entries as Record<string, any>;

      if (importResult.format === 'nested_array') {
        // Merge arrays
        const currentProps = currentEntries.common_props || [];
        const newProps = (importResult.entries[0] as any).common_props || [];

        // Create a map to avoid duplicates (by id)
        const propsMap = new Map();
        for (const prop of currentProps) {
          if (prop.id) {
            propsMap.set(prop.id, prop);
          }
        }
        for (const prop of newProps) {
          if (prop.id) {
            propsMap.set(prop.id, prop); // Overwrites existing
          }
        }

        newEntries = {
          common_props: Array.from(propsMap.values())
        };
      } else {
        // Merge objects
        const importedData = Array.isArray(importResult.entries)
          ? importResult.entries.reduce((acc, entry) => {
              if (typeof entry === 'object' && entry !== null) {
                const entryObj = entry as Record<string, unknown>;
                const id = entryObj.id as string;
                if (id) {
                  acc[id] = entry;
                }
              }
              return acc;
            }, {} as Record<string, unknown>)
          : importResult.entries;

        newEntries = {
          ...currentEntries,
          ...importedData,
        };
      }
    }

    // Update database
    await prisma.library.update({
      where: { name },
      data: { entries: newEntries as any },
    });

    return NextResponse.json({
      success: true,
      data: {
        format: importResult.format,
        count: importResult.count,
        mode,
      },
    });
  } catch (error) {
    console.error(`[POST /api/libraries/${(await params).name}/import] Error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '导入失败',
          details: { originalError: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}
