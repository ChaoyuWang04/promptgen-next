/**
 * Bulk Delete Library Entries API
 * POST /api/libraries/[name]/bulk-delete - Delete multiple library entries
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

const bulkDeleteSchema = z.object({
  entryIds: z.array(z.string()).min(1, 'At least one entryId is required'),
});

/**
 * POST /api/libraries/[name]/bulk-delete
 * Deletes multiple entries from a library
 *
 * @param params.name - Library name
 * @param body.entryIds - Array of entry IDs to delete
 * @returns Deletion result with count
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const body = await request.json();
    const { entryIds } = bulkDeleteSchema.parse(body);

    // Get current library
    const library = await prisma.library.findUnique({
      where: { name },
      select: { entries: true },
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

    const currentEntries = library.entries as Record<string, any>;
    let newEntries: Record<string, any>;
    let deletedCount = 0;
    const notFoundIds: string[] = [];

    // Determine structure type from entries
    const isNestedArray = currentEntries.common_props && Array.isArray(currentEntries.common_props);

    if (isNestedArray) {
      // Remove from common_props array
      const commonProps = currentEntries.common_props || [];
      const entryIdsSet = new Set(entryIds);

      // Track which IDs were actually found
      const filteredProps = commonProps.filter((item: any) => {
        if (entryIdsSet.has(item.id)) {
          deletedCount++;
          return false;
        }
        return true;
      });

      // Find IDs that weren't found
      entryIds.forEach((id) => {
        if (!commonProps.some((item: any) => item.id === id)) {
          notFoundIds.push(id);
        }
      });

      newEntries = {
        common_props: filteredProps,
      };
    } else {
      // Remove from object structure
      const rest: Record<string, any> = {};

      for (const [key, value] of Object.entries(currentEntries)) {
        if (entryIds.includes(key)) {
          deletedCount++;
        } else {
          rest[key] = value;
        }
      }

      // Find IDs that weren't found
      entryIds.forEach((id) => {
        if (!currentEntries[id]) {
          notFoundIds.push(id);
        }
      });

      newEntries = rest;
    }

    // If no entries were deleted, return error
    if (deletedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '未找到任何匹配的条目',
            details: { notFoundIds },
          },
        },
        { status: 404 }
      );
    }

    // Update database
    const updated = await prisma.library.update({
      where: { name },
      data: { entries: newEntries },
      select: {
        id: true,
        name: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
        libraryName: updated.name,
        notFoundCount: notFoundIds.length,
        notFoundIds: notFoundIds.length > 0 ? notFoundIds : undefined,
        updatedAt: updated.updatedAt,
      },
      message: `已成功删除 ${deletedCount} 个条目${notFoundIds.length > 0 ? `（${notFoundIds.length} 个条目未找到）` : ''}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求数据无效',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    console.error(`[POST /api/libraries/${(await params).name}/bulk-delete] Error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BULK_DELETE_FAILED',
          message: '批量删除失败',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
