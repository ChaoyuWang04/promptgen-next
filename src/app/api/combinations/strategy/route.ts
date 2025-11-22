/**
 * Strategy Generation API
 * POST /api/combinations/strategy - Generate combinations from strategy
 *
 * NEW FORMAT (v2):
 * {
 *   templateId: "template_main_v1",
 *   strategyConfig: {
 *     character: ["char_betty_v1", "char_alice_v1"],  // Multi-select
 *     theme: ["theme_christmas_v1"],                   // Single-select (as array)
 *     scene: []                                        // Empty = all entries
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { ComboManager } from '@/lib/generators/combo-manager';
import {
  extractLibrariesFromTemplate,
  validateTemplateLibraryReferences,
} from '@/lib/utils/template-parser';
import type { LibraryName } from '@/lib/config/library-config';

/**
 * Request schema (v2 - multi-select support)
 */
const StrategyGenerationRequestSchema = z.object({
  templateId: z.string().min(1, '模板ID不能为空'),
  strategyConfig: z
    .record(z.array(z.string()))
    .describe(
      '库选择配置，格式：{ character: ["id1", "id2"], theme: [], scene: ["id3"] }'
    ),
});

type StrategyGenerationRequest = z.infer<typeof StrategyGenerationRequestSchema>;

/**
 * POST /api/combinations/strategy
 * Generate all combinations and create Combination records
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const parseResult = StrategyGenerationRequestSchema.safeParse(body);

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

    // Validate template exists
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        name: true,
        content: true,
        category: true,
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

    // Validate that all libraries exist
    for (const libraryName of strategyLibraries) {
      const library = await prisma.library.findUnique({
        where: { name: libraryName },
      });

      if (!library) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `库 ${libraryName} 不存在`,
            },
          },
          { status: 404 }
        );
      }

      // Validate selected entry IDs exist
      const selectedIds = strategyConfig[libraryName];
      if (selectedIds && selectedIds.length > 0) {
        const entries = library.entries as Record<string, any>;
        const invalidIds = selectedIds.filter((id) => !entries[id]);

        if (invalidIds.length > 0) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'NOT_FOUND',
                message: `库 ${libraryName} 中找不到以下元素：${invalidIds.join(', ')}`,
              },
            },
            { status: 404 }
          );
        }
      }
    }

    // Generate combinations using ComboManager
    const comboManager = new ComboManager();
    const combinations = await comboManager.enumerateDynamicCombinations(
      strategyConfig as Partial<Record<LibraryName, string[]>>
    );

    // Create Combination records in database
    const created: string[] = [];
    const skipped: string[] = [];

    for (const combo of combinations) {
      try {
        // Use imageId as the unique combination key
        const existing = await prisma.combination.findUnique({
          where: { combinationKey: combo.imageId },
        });

        if (existing) {
          skipped.push(combo.imageId);
          continue;
        }

        await prisma.combination.create({
          data: {
            combinationKey: combo.imageId,
            libraryIds: combo.libraryIds,
            templateId,
            strategyConfig,
          },
        });

        created.push(combo.imageId);
      } catch (error) {
        // Handle unique constraint violation (race condition)
        if ((error as any).code === 'P2002') {
          skipped.push(combo.imageId);
        } else {
          throw error;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        templateId,
        templateName: template.name,
        total: combinations.length,
        created: created.length,
        skipped: skipped.length,
        createdKeys: created.slice(0, 10), // Return first 10 for preview
        skippedKeys: skipped.slice(0, 10),
      },
      message: `成功生成 ${created.length} 个组合 (${skipped.length} 个已存在)`,
    });
  } catch (error) {
    console.error('[API] Error generating strategy combinations:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '生成策略组合时发生错误',
          details: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 }
    );
  }
}
