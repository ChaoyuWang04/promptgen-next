/**
 * Individual Template Endpoints
 *
 * GET    /api/templates/[id] - Get template by id
 * PUT    /api/templates/[id] - Update template
 * DELETE /api/templates/[id] - Delete template
 *
 * Replaces Flask:
 * - GET    /api/schemes/get/<name>
 * - PUT    /api/schemes/update/<name>
 * - DELETE /api/schemes/delete/<name>
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/templates/[id]
 *
 * Get a specific template by id.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const template = await prisma.template.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        category: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: `模板不存在: ${id}` },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error(`[GET /api/templates/${(await params).id}] Error:`, error);

    return NextResponse.json(
      {
        error: '获取模板失败',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/templates/[id]
 *
 * Update an existing template.
 *
 * Request body:
 * {
 *   "description": "Updated description",
 *   "content": "Updated content"
 * }
 *
 * Note: SYSTEM templates cannot be updated.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { description, content } = body;

    // Check if template exists
    const existing = await prisma.template.findUnique({
      where: { id },
      select: { type: true, name: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `模板不存在: ${id}` },
        { status: 404 }
      );
    }

    // Prevent updating SYSTEM templates
    if (existing.type === 'SYSTEM') {
      return NextResponse.json(
        { error: '系统模板不可修改' },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (description !== undefined) {
      updateData.description = description;
    }
    if (content !== undefined) {
      updateData.content = content;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '没有提供更新字段' },
        { status: 400 }
      );
    }

    // Update template
    const updated = await prisma.template.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        category: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      template: updated,
    });
  } catch (error) {
    console.error(`[PUT /api/templates/${(await params).id}] Error:`, error);

    return NextResponse.json(
      {
        error: '更新模板失败',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/templates/[id]
 *
 * Delete a template.
 *
 * Note: SYSTEM templates cannot be deleted.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if template exists
    const existing = await prisma.template.findUnique({
      where: { id },
      select: { type: true, name: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `模板不存在: ${id}` },
        { status: 404 }
      );
    }

    // Prevent deleting SYSTEM templates
    if (existing.type === 'SYSTEM') {
      return NextResponse.json(
        { error: '系统模板不可删除' },
        { status: 403 }
      );
    }

    // Delete template
    await prisma.template.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `模板已删除: ${existing.name}`,
    });
  } catch (error) {
    console.error(`[DELETE /api/templates/${(await params).id}] Error:`, error);

    return NextResponse.json(
      {
        error: '删除模板失败',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
