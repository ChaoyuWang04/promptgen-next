/**
 * Template Management Endpoints
 *
 * GET  /api/templates - List all templates
 * POST /api/templates - Create new template
 *
 * Replaces Flask:
 * - GET  /api/schemes/list
 * - POST /api/schemes/save
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/templates
 *
 * List all templates with optional filtering by type and category.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // SYSTEM or USER
    const category = searchParams.get('category'); // MAIN or DIFF

    // Build filter
    const where: any = {};
    if (type) {
      where.type = type.toUpperCase();
    }
    if (category) {
      where.category = category.toUpperCase();
    }

    // Query templates
    const templates = await prisma.template.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        category: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({
      templates,
      total_count: templates.length,
    });
  } catch (error) {
    console.error('[GET /api/templates] Error:', error);

    return NextResponse.json(
      {
        error: '获取模板列表失败',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates
 *
 * Create a new template.
 *
 * Request body:
 * {
 *   "name": "my_template_v1",
 *   "description": "My custom template",
 *   "type": "USER",
 *   "category": "MAIN",
 *   "content": "角色: {{character.name}}\n..."
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, type, category, content } = body;

    // Validate required fields
    if (!name || !type || !category || !content) {
      return NextResponse.json(
        {
          error: '缺少必需字段',
          required: ['name', 'type', 'category', 'content'],
        },
        { status: 400 }
      );
    }

    // Validate type
    if (!['SYSTEM', 'USER'].includes(type.toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid type. Must be SYSTEM or USER' },
        { status: 400 }
      );
    }

    // Validate category
    if (!['MAIN', 'DIFF'].includes(category.toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid category. Must be MAIN or DIFF' },
        { status: 400 }
      );
    }

    // Check if template name already exists
    const existing = await prisma.template.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: `模板名称已存在: ${name}` },
        { status: 409 }
      );
    }

    // Create template
    const template = await prisma.template.create({
      data: {
        name,
        description: description || null,
        type: type.toUpperCase(),
        category: category.toUpperCase(),
        content,
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        category: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('[POST /api/templates] Error:', error);

    return NextResponse.json(
      {
        error: '创建模板失败',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
