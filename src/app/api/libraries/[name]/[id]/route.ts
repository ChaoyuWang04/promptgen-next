/**
 * Individual Library Entry Endpoints
 *
 * GET    /api/libraries/[name]/[id]  - Get single entry
 * PUT    /api/libraries/[name]/[id]  - Update single entry
 * DELETE /api/libraries/[name]/[id]  - Delete single entry
 *
 * Replaces Flask endpoints:
 * - GET    /api/libraries/<library_name>/<entry_id>
 * - PUT    /api/libraries/<library_name>/<entry_id>
 * - DELETE /api/libraries/<library_name>/<entry_id>
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/libraries/[name]/[id]
 *
 * Retrieves a single entry from a library.
 *
 * @param params.name - Library name
 * @param params.id - Entry ID
 * @returns Single entry object
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; id: string }> }
) {
  try {
    const { name, id } = await params;

    // Get library
    const library = await prisma.library.findUnique({
      where: { name },
      select: { entries: true },
    });

    if (!library) {
      return NextResponse.json(
        { error: `库不存在: ${name}` },
        { status: 404 }
      );
    }

    const entries = library.entries as Record<string, any>;
    let entry: any;

    // Determine structure type from entries
    const isNestedArray = entries.common_props && Array.isArray(entries.common_props);

    if (isNestedArray) {
      // Search in common_props array
      const commonProps = entries.common_props || [];
      entry = commonProps.find((item: any) => item.id === id);
    } else {
      // Direct object access
      entry = entries[id];
    }

    if (!entry) {
      return NextResponse.json(
        { error: `条目不存在: ${id}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    console.error(`[GET /api/libraries/${(await params).name}/${(await params).id}] Error:`, error);

    return NextResponse.json(
      {
        error: '获取条目失败',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/libraries/[name]/[id]
 *
 * Updates a single entry in a library.
 *
 * Request body:
 * {
 *   "entry_data": { ... }  // Updated entry data
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; id: string }> }
) {
  try {
    const { name, id } = await params;

    // Parse request body
    const body = await request.json();
    const { entry_data } = body;

    if (!entry_data || typeof entry_data !== 'object') {
      return NextResponse.json(
        { error: '缺少必需字段: entry_data' },
        { status: 400 }
      );
    }

    // Get current library
    const library = await prisma.library.findUnique({
      where: { name },
      select: { entries: true },
    });

    if (!library) {
      return NextResponse.json(
        { error: `库不存在: ${name}` },
        { status: 404 }
      );
    }

    const currentEntries = library.entries as Record<string, any>;
    let newEntries: Record<string, any>;
    let found = false;

    // Determine structure type from entries
    const isNestedArray = currentEntries.common_props && Array.isArray(currentEntries.common_props);

    if (isNestedArray) {
      // Update in common_props array
      const commonProps = currentEntries.common_props || [];
      const updatedProps = commonProps.map((item: any) => {
        if (item.id === id) {
          found = true;
          return { ...entry_data, id }; // Preserve id
        }
        return item;
      });

      if (!found) {
        return NextResponse.json(
          { error: `条目不存在: ${id}` },
          { status: 404 }
        );
      }

      newEntries = {
        common_props: updatedProps,
      };
    } else {
      // Update in object
      if (!currentEntries[id]) {
        return NextResponse.json(
          { error: `条目不存在: ${id}` },
          { status: 404 }
        );
      }

      newEntries = {
        ...currentEntries,
        [id]: { ...entry_data, id }, // Preserve id
      };
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
        library_name: updated.name,
        entry_id: id,
        updated_at: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error(`[PUT /api/libraries/${(await params).name}/${(await params).id}] Error:`, error);

    return NextResponse.json(
      {
        error: '更新条目失败',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/libraries/[name]/[id]
 *
 * Deletes a single entry from a library.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; id: string }> }
) {
  try {
    const { name, id } = await params;

    // Get current library
    const library = await prisma.library.findUnique({
      where: { name },
      select: { entries: true },
    });

    if (!library) {
      return NextResponse.json(
        { error: `库不存在: ${name}` },
        { status: 404 }
      );
    }

    const currentEntries = library.entries as Record<string, any>;
    let newEntries: Record<string, any>;
    let found = false;

    // Determine structure type from entries
    const isNestedArray = currentEntries.common_props && Array.isArray(currentEntries.common_props);

    if (isNestedArray) {
      // Remove from common_props array
      const commonProps = currentEntries.common_props || [];
      const filteredProps = commonProps.filter((item: any) => {
        if (item.id === id) {
          found = true;
          return false;
        }
        return true;
      });

      if (!found) {
        return NextResponse.json(
          { error: `条目不存在: ${id}` },
          { status: 404 }
        );
      }

      newEntries = {
        common_props: filteredProps,
      };
    } else {
      // Remove from object
      if (!currentEntries[id]) {
        return NextResponse.json(
          { error: `条目不存在: ${id}` },
          { status: 404 }
        );
      }

      const { [id]: removed, ...rest } = currentEntries;
      newEntries = rest;
      found = true;
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
      library_name: updated.name,
      entry_id: id,
      deleted_at: updated.updatedAt,
      message: `已删除条目: ${id}`,
    });
  } catch (error) {
    console.error(`[DELETE /api/libraries/${(await params).name}/${(await params).id}] Error:`, error);

    return NextResponse.json(
      {
        error: '删除条目失败',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
