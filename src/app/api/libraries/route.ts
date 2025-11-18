/**
 * Library Management Endpoints
 *
 * POST /api/libraries - Create a new library
 *
 * 支持：
 * - 从预定义模板创建库
 * - 创建空白库（自定义 schema）
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getTemplateByName } from '@/lib/templates/library-templates';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ========================================
// Request Validation Schemas
// ========================================

const CreateLibrarySchema = z.object({
  name: z
    .string()
    .min(1, 'Library name is required')
    .regex(/^[a-z][a-z0-9_]*$/, 'Library name must be lowercase with underscores only')
    .max(50, 'Library name must be at most 50 characters'),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be at most 100 characters'),
  description: z.string().optional(),
  displayField: z.string().default('name'),
  category: z.string().optional(),
  order: z.number().int().min(0).default(0),
  templateName: z.string().optional(), // 如果提供，从模板创建
  schema: z.record(z.unknown()).optional(), // 如果不使用模板，必须提供 schema
  entries: z.record(z.unknown()).or(z.array(z.unknown())).optional(), // 初始条目（可选）
});

type CreateLibraryInput = z.infer<typeof CreateLibrarySchema>;

// ========================================
// POST /api/libraries
// ========================================

/**
 * 创建新库
 *
 * Request body:
 * {
 *   name: string,              // 库名称（小写、下划线）
 *   displayName: string,       // 显示名称
 *   description?: string,      // 描述
 *   displayField?: string,     // 显示字段名
 *   category?: string,         // 分类
 *   order?: number,            // 排序
 *   templateName?: string,     // 模板名称（从模板创建）
 *   schema?: object,           // JSON Schema（自定义）
 *   entries?: object | array   // 初始条目（可选）
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     id: string,
 *     name: string,
 *     displayName: string,
 *     ...
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();

    // 验证输入
    const validationResult = CreateLibrarySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求数据验证失败',
            details: validationResult.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const input: CreateLibraryInput = validationResult.data;

    // 检查库名称是否已存在
    const existingLibrary = await prisma.library.findUnique({
      where: { name: input.name },
    });

    if (existingLibrary) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ALREADY_EXISTS',
            message: `库名称 "${input.name}" 已存在`,
          },
        },
        { status: 409 }
      );
    }

    // 获取 schema（从模板或自定义）
    let schema: object;
    let entries: unknown = input.entries || [];
    let structureType = 'standard';

    if (input.templateName) {
      // 从模板创建
      const template = getTemplateByName(input.templateName);
      if (!template) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `模板 "${input.templateName}" 不存在`,
            },
          },
          { status: 404 }
        );
      }

      schema = template.schema;
      structureType = template.structureType;

      // 如果没有提供初始条目，使用模板的示例条目
      if (!input.entries) {
        if (structureType === 'nested_array') {
          // decorative_props 格式
          entries = template.exampleEntry;
        } else {
          // 标准格式：空对象（用户稍后添加条目）
          entries = {};
        }
      }
    } else if (input.schema) {
      // 自定义 schema
      schema = input.schema;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '必须提供 templateName 或 schema',
          },
        },
        { status: 400 }
      );
    }

    // 创建库
    const library = await prisma.library.create({
      data: {
        name: input.name,
        displayName: input.displayName,
        description: input.description,
        displayField: input.displayField,
        category: input.category,
        order: input.order,
        schema: schema as any, // JSON 类型
        entries: entries as any, // JSON 类型
        schemaVersion: '1.0',
        isActive: true,
        metadata: {
          createdFrom: input.templateName || 'custom',
          structureType,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: library,
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/libraries] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '创建库失败',
        },
      },
      { status: 500 }
    );
  }
}
