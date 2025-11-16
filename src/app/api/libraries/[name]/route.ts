/**
 * Library CRUD Endpoints
 *
 * GET    /api/libraries/[name]       - Get all entries from a library
 * POST   /api/libraries/[name]       - Create a new entry in a library
 * PUT    /api/libraries/[name]       - Update entire library entries
 * DELETE /api/libraries/[name]       - Delete entire library
 *
 * Replaces Flask endpoints:
 * - GET    /api/libraries/<library_name>
 * - POST   /api/libraries/<library_name>
 * - PUT    /api/libraries/<library_name>
 * - DELETE /api/libraries/<library_name>
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
  isValidLibraryName,
  getLibraryConfig,
  getLibraryDisplayName,
  type LibraryName,
} from '@/lib/config/library-config';

export const dynamic = 'force-dynamic';

/**
 * Type guard for library name validation
 */
function validateLibraryName(name: string): asserts name is LibraryName {
  if (!isValidLibraryName(name)) {
    throw new Error(`未知的库名称: ${name}`);
  }
}

/**
 * GET /api/libraries/[name]
 *
 * Retrieves all entries from a specific library.
 *
 * @param params.name - Library name (e.g., "character", "pose")
 * @returns Library entries as JSON
 *
 * Response format:
 * - Standard libraries: { "id1": {...}, "id2": {...} }
 * - Nested array (decorative_props): { "common_props": [...] }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    // Validate library name
    validateLibraryName(name);

    // Get library configuration
    const config = getLibraryConfig(name);
    if (!config) {
      return NextResponse.json(
        { error: `库配置不存在: ${name}` },
        { status: 404 }
      );
    }

    // Query library from database
    const library = await prisma.library.findUnique({
      where: { name },
      select: {
        id: true,
        name: true,
        displayName: true,
        entries: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!library) {
      return NextResponse.json(
        { error: `库不存在: ${getLibraryDisplayName(name)}` },
        { status: 404 }
      );
    }

    // Return entries directly (preserves structure: standard object or nested array)
    return NextResponse.json(library.entries);
  } catch (error) {
    console.error(`[GET /api/libraries/${(await params).name}] Error:`, error);

    if (error instanceof Error && error.message.startsWith('未知的库名称')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: '获取库数据失败',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/libraries/[name]
 *
 * Creates a new entry in a library.
 *
 * Request body:
 * {
 *   "entry_id": "char_example_v1",
 *   "entry_data": { ... }
 * }
 *
 * For nested_array libraries (decorative_props):
 * {
 *   "entry_data": { ... }  // No entry_id needed, appends to array
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    validateLibraryName(name);

    const config = getLibraryConfig(name);
    if (!config) {
      return NextResponse.json(
        { error: `库配置不存在: ${name}` },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { entry_id, entry_data } = body;

    // Validate entry_data exists
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
        { error: `库不存在: ${getLibraryDisplayName(name)}` },
        { status: 404 }
      );
    }

    const currentEntries = library.entries as Record<string, any>;
    let newEntries: Record<string, any>;

    if (config.structureType === 'nested_array') {
      // Nested array structure (decorative_props)
      const commonProps = currentEntries.common_props || [];

      // Validate entry has id field
      if (!entry_data.id) {
        return NextResponse.json(
          { error: '条目必须包含 id 字段' },
          { status: 400 }
        );
      }

      // Check for duplicate ID
      if (commonProps.some((item: any) => item.id === entry_data.id)) {
        return NextResponse.json(
          { error: `条目ID已存在: ${entry_data.id}` },
          { status: 409 }
        );
      }

      // Append to array
      newEntries = {
        common_props: [...commonProps, entry_data],
      };
    } else {
      // Standard object structure
      if (!entry_id) {
        return NextResponse.json(
          { error: '缺少必需字段: entry_id' },
          { status: 400 }
        );
      }

      // Check for duplicate ID
      if (currentEntries[entry_id]) {
        return NextResponse.json(
          { error: `条目ID已存在: ${entry_id}` },
          { status: 409 }
        );
      }

      // Add entry to object
      newEntries = {
        ...currentEntries,
        [entry_id]: entry_data,
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
      library_name: updated.name,
      entry_id: config.structureType === 'nested_array' ? entry_data.id : entry_id,
      updated_at: updated.updatedAt,
    });
  } catch (error) {
    console.error(`[POST /api/libraries/${(await params).name}] Error:`, error);

    if (error instanceof Error && error.message.startsWith('未知的库名称')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: '创建条目失败',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/libraries/[name]
 *
 * Replaces entire library entries (bulk update).
 *
 * Request body:
 * {
 *   "entries": { ... }  // Complete entries object
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    validateLibraryName(name);

    const config = getLibraryConfig(name);
    if (!config) {
      return NextResponse.json(
        { error: `库配置不存在: ${name}` },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { entries } = body;

    if (!entries || typeof entries !== 'object') {
      return NextResponse.json(
        { error: '缺少必需字段: entries' },
        { status: 400 }
      );
    }

    // Validate structure for nested_array
    if (config.structureType === 'nested_array') {
      if (!Array.isArray(entries.common_props)) {
        return NextResponse.json(
          { error: 'decorative_props 必须包含 common_props 数组' },
          { status: 400 }
        );
      }
    }

    // Update database
    const updated = await prisma.library.update({
      where: { name },
      data: { entries },
      select: {
        id: true,
        name: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      library_name: updated.name,
      updated_at: updated.updatedAt,
    });
  } catch (error) {
    console.error(`[PUT /api/libraries/${(await params).name}] Error:`, error);

    if (error instanceof Error && error.message.startsWith('未知的库名称')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: '更新库失败',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/libraries/[name]
 *
 * Deletes an entire library (use with caution!).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    validateLibraryName(name);

    // Delete library
    const deleted = await prisma.library.delete({
      where: { name },
      select: {
        id: true,
        name: true,
        displayName: true,
      },
    });

    return NextResponse.json({
      success: true,
      library_name: deleted.name,
      display_name: deleted.displayName,
      message: `已删除库: ${deleted.displayName}`,
    });
  } catch (error) {
    console.error(`[DELETE /api/libraries/${(await params).name}] Error:`, error);

    if (error instanceof Error && error.message.startsWith('未知的库名称')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Handle not found
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: `库不存在: ${(await params).name}` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: '删除库失败',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
