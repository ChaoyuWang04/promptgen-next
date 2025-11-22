/**
 * Combination Preview API
 * POST /api/combinations/preview
 *
 * Calculate and preview combination count without actually generating records
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { ComboManager } from '@/lib/generators/combo-manager';
import {
  extractLibrariesFromTemplate,
  validateTemplateLibraryReferences,
} from '@/lib/utils/template-parser';
import {
  getLibraryConfig,
  type LibraryName,
} from '@/lib/config/library-config';

/**
 * Request schema
 */
const PreviewRequestSchema = z.object({
  templateId: z.string().min(1, '模板ID不能为空'),
  strategyConfig: z
    .record(z.array(z.string()))
    .describe('库选择配置，格式：{ character: ["id1"], theme: ["id2", "id3"] }'),
});

type PreviewRequest = z.infer<typeof PreviewRequestSchema>;

/**
 * POST /api/combinations/preview
 *
 * Preview combination count and configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const parseResult = PreviewRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求参数验证失败',
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { templateId, strategyConfig } = parseResult.data;

    // Fetch template
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        name: true,
        content: true,
        category: true,
        type: true,
      },
    });

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `模板 ${templateId} 不存在`,
          },
        },
        { status: 404 }
      );
    }

    // Extract and validate libraries from template
    const templateLibraries = extractLibrariesFromTemplate(template.content);

    const validation = validateTemplateLibraryReferences(
      template.content,
      template.category
    );

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error,
          },
        },
        { status: 400 }
      );
    }

    // Validate that strategyConfig keys match template libraries
    const strategyLibraries = Object.keys(strategyConfig) as LibraryName[];
    const missingLibraries = templateLibraries.filter(
      (lib) => !strategyLibraries.includes(lib)
    );

    if (missingLibraries.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `策略配置缺少模板引用的库：${missingLibraries.join(', ')}`,
            details: {
              templateLibraries,
              strategyLibraries,
              missingLibraries,
            },
          },
        },
        { status: 400 }
      );
    }

    // Calculate combination count
    const comboManager = new ComboManager();
    const totalCombinations = await comboManager.calculateDynamicCombinationCount(
      strategyConfig as Partial<Record<LibraryName, string[]>>
    );

    // Build library selection summary
    const librarySummary = await Promise.all(
      templateLibraries.map(async (libName) => {
        const config = getLibraryConfig(libName);
        const selectedIds = strategyConfig[libName] || [];

        // Get library from database
        const library = await prisma.library.findUnique({
          where: { name: libName },
          select: {
            displayName: true,
            entries: true,
          },
        });

        if (!library) {
          return {
            library: libName,
            displayName: config?.displayName || libName,
            selectedCount: 0,
            totalCount: 0,
            isAll: true,
            selectedElements: [],
          };
        }

        const entries = library.entries as Record<string, any>;
        const totalCount = Object.keys(entries).length;

        // Get selected element names
        const selectedElements =
          selectedIds.length > 0
            ? selectedIds
                .map((id) => {
                  const entry = entries[id];
                  if (!entry) return null;

                  const displayField = config?.displayField || 'name';
                  return {
                    id,
                    name: entry[displayField] || entry.name || id,
                  };
                })
                .filter((el) => el !== null)
            : [];

        return {
          library: libName,
          displayName: library.displayName,
          selectedCount: selectedIds.length > 0 ? selectedIds.length : totalCount,
          totalCount,
          isAll: selectedIds.length === 0,
          selectedElements: selectedElements.length > 0 ? selectedElements : null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        templateId: template.id,
        templateName: template.name,
        templateCategory: template.category,
        totalCombinations,
        librarySummary,
        strategyConfig,
      },
    });
  } catch (error) {
    console.error('[API] Error previewing combinations:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '预览组合时发生错误',
          details: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 }
    );
  }
}
