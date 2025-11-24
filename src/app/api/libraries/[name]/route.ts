/**
 * Library CRUD Endpoints
 *
 * GET    /api/libraries/[name]       - Get all entries from a library
 * POST   /api/libraries/[name]       - Create a new entry in a library
 * PUT    /api/libraries/[name]       - Update entire library entries
 * PATCH  /api/libraries/[name]       - Update library metadata (name, description, schema, etc.)
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

export const dynamic = 'force-dynamic';

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

    // Query library from database
    const library = await prisma.library.findUnique({
      where: { name },
      select: {
        id: true,
        name: true,
        displayName: true,
        category: true,
        entries: true,
        createdAt: true,
        updatedAt: true,
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

    // Return entries (preserves structure: standard object or nested array)
    return NextResponse.json({
      success: true,
      data: library.entries,
    });
  } catch (error) {
    console.error(`[GET /api/libraries/${(await params).name}] Error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取库数据失败',
          details: { originalError: error instanceof Error ? error.message : 'Unknown error' },
        },
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

    // Parse request body
    const body = await request.json();
    const { entry_id, entry_data } = body;

    // Validate entry_data exists
    if (!entry_data || typeof entry_data !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '缺少必需字段: entry_data',
          },
        },
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

    // Determine structure type from entries (nested_array has common_props array)
    const isNestedArray = currentEntries.common_props && Array.isArray(currentEntries.common_props);

    if (isNestedArray) {
      // Nested array structure (decorative_props)
      const commonProps = currentEntries.common_props || [];

      // Validate entry has id field
      if (!entry_data.id) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: '条目必须包含 id 字段',
            },
          },
          { status: 400 }
        );
      }

      // Check for duplicate ID
      if (commonProps.some((item: any) => item.id === entry_data.id)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'CONFLICT',
              message: `条目ID已存在: ${entry_data.id}`,
            },
          },
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
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: '缺少必需字段: entry_id',
            },
          },
          { status: 400 }
        );
      }

      // Check for duplicate ID
      if (currentEntries[entry_id]) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'CONFLICT',
              message: `条目ID已存在: ${entry_id}`,
            },
          },
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
      data: {
        library_name: updated.name,
        entry_id: isNestedArray ? entry_data.id : entry_id,
        updated_at: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error(`[POST /api/libraries/${(await params).name}] Error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '创建条目失败',
          details: { originalError: error instanceof Error ? error.message : 'Unknown error' },
        },
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

    // Parse request body
    const body = await request.json();
    const { entries } = body;

    if (!entries || typeof entries !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '缺少必需字段: entries',
          },
        },
        { status: 400 }
      );
    }

    // Check if library exists
    const existingLibrary = await prisma.library.findUnique({
      where: { name },
      select: { id: true, entries: true },
    });

    if (!existingLibrary) {
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

    // Validate structure for nested_array (check if existing library uses nested_array structure)
    const existingEntries = existingLibrary.entries as Record<string, any>;
    const isNestedArray = existingEntries.common_props && Array.isArray(existingEntries.common_props);

    if (isNestedArray) {
      if (!Array.isArray(entries.common_props)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: '此库使用嵌套数组结构，必须包含 common_props 数组',
            },
          },
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

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '更新库失败',
          details: { originalError: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/libraries/[name]
 *
 * Updates library metadata (displayName, description, schema, etc.).
 * Does NOT update entries - use PUT for that.
 *
 * Request body (all fields optional):
 * {
 *   "displayName": string,
 *   "description": string,
 *   "displayField": string,
 *   "order": number,
 *   "schema": object,
 *   "isActive": boolean
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    // Check if library exists
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

    // Parse request body
    const body = await request.json();

    // Build update data object (only include provided fields)
    const updateData: any = {};

    if (body.displayName !== undefined) {
      updateData.displayName = body.displayName;
    }
    if (body.description !== undefined) {
      updateData.description = body.description;
    }
    if (body.displayField !== undefined) {
      updateData.displayField = body.displayField;
    }
    if (body.category !== undefined) {
      // Validate category value
      if (body.category !== 'MAIN' && body.category !== 'DIFF') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'category 必须是 MAIN 或 DIFF',
            },
          },
          { status: 400 }
        );
      }
      updateData.category = body.category;
    }
    if (body.order !== undefined) {
      updateData.order = body.order;
    }
    if (body.schema !== undefined) {
      updateData.schema = body.schema;
    }
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }
    if (body.schemaVersion !== undefined) {
      updateData.schemaVersion = body.schemaVersion;
    }
    if (body.metadata !== undefined) {
      updateData.metadata = body.metadata;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '没有提供要更新的字段',
          },
        },
        { status: 400 }
      );
    }

    // Update library
    const updated = await prisma.library.update({
      where: { name },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error(`[PATCH /api/libraries/${(await params).name}] Error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '更新库元数据失败',
          details: { originalError: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to renumber all libraries sequentially
 * Called after a library is deleted to maintain sequential order (0, 1, 2, 3...)
 */
async function renumberLibraries() {
  // Fetch all libraries ordered by their current order value
  const libraries = await prisma.library.findMany({
    select: { id: true, name: true, order: true },
    orderBy: { order: 'asc' },
  });

  // Renumber sequentially using a transaction
  await prisma.$transaction(async (tx) => {
    // First set all to negative values to avoid unique constraint conflicts
    for (let i = 0; i < libraries.length; i++) {
      await tx.library.update({
        where: { id: libraries[i].id },
        data: { order: -(i + 1) },
      });
    }

    // Then set the final order values
    for (let i = 0; i < libraries.length; i++) {
      await tx.library.update({
        where: { id: libraries[i].id },
        data: { order: i },
      });
    }
  });
}

/**
 * DELETE /api/libraries/[name]
 *
 * Deletes an entire library and automatically renumbers remaining libraries.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    // Delete library and renumber in a transaction
    const deleted = await prisma.$transaction(async (tx) => {
      // First, delete the library
      const deletedLib = await tx.library.delete({
        where: { name },
        select: {
          id: true,
          name: true,
          displayName: true,
        },
      });

      return deletedLib;
    });

    // After successful deletion, renumber all remaining libraries
    await renumberLibraries();

    return NextResponse.json({
      success: true,
      library_name: deleted.name,
      display_name: deleted.displayName,
      message: `已删除库: ${deleted.displayName}`,
    });
  } catch (error) {
    console.error(`[DELETE /api/libraries/${(await params).name}] Error:`, error);

    // Handle not found
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `库不存在: ${(await params).name}`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '删除库失败',
          details: { originalError: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}
