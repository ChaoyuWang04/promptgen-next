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
import { CreateTemplateSchema } from '@/schemas/template.schema';

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
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('[GET /api/templates] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取模板列表失败',
          details: { originalError: error instanceof Error ? error.message : 'Unknown error' },
        },
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

    // Validate request body using Zod schema
    const validationResult = CreateTemplateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '输入数据验证失败',
            details: validationResult.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { name, description, type, category, content } = validationResult.data;

    // Check if template name already exists
    const existing = await prisma.template.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: `模板名称已存在: ${name}`,
          },
        },
        { status: 409 }
      );
    }

    // Create template
    const template = await prisma.template.create({
      data: {
        name,
        description: description || null,
        type, // Already validated by Zod as TemplateType enum
        category, // Already validated by Zod as TemplateCategory enum
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
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '创建模板失败',
          details: { originalError: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}
