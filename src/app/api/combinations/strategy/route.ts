/**
 * Strategy Generation API
 * POST /api/combinations/strategy - Generate combinations from strategy
 *
 * NEW FORMAT (v2):
 * {
 *   mainTemplateId: "template_main_v1",
 *   diffTemplateId: "diff_template_default_v1",
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
 * Request schema (v2 - multi-select support with separate main/diff templates)
 */
const StrategyGenerationRequestSchema = z.object({
  mainTemplateId: z.string().min(1, '主图模板ID不能为空'),
  diffTemplateId: z.string().min(1, '差异图模板ID不能为空'),
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

    const { mainTemplateId, diffTemplateId, strategyConfig } = parseResult.data;

    // Validate main template exists
    const mainTemplate = await prisma.template.findUnique({
      where: { id: mainTemplateId },
      select: {
        id: true,
        name: true,
        content: true,
        category: true,
      },
    });

    if (!mainTemplate) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `主图模板 ${mainTemplateId} 不存在`,
          },
        },
        { status: 404 }
      );
    }

    if (mainTemplate.category !== 'MAIN') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `模板 ${mainTemplate.name} 不是主图模板（类型为 ${mainTemplate.category}）`,
          },
        },
        { status: 400 }
      );
    }

    // Validate diff template exists
    const diffTemplate = await prisma.template.findUnique({
      where: { id: diffTemplateId },
      select: {
        id: true,
        name: true,
        content: true,
        category: true,
      },
    });

    if (!diffTemplate) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `差异图模板 ${diffTemplateId} 不存在`,
          },
        },
        { status: 404 }
      );
    }

    if (diffTemplate.category !== 'DIFF') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `模板 ${diffTemplate.name} 不是差异图模板（类型为 ${diffTemplate.category}）`,
          },
        },
        { status: 400 }
      );
    }

    // Extract and validate libraries from main template
    const templateLibraries = extractLibrariesFromTemplate(mainTemplate.content);

    const validation = validateTemplateLibraryReferences(
      mainTemplate.content,
      mainTemplate.category
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

    // Track created combinations with imageIds for batch generation
    interface CreatedCombination {
      id: string;
      combinationKey: string;
      imageIds: string[];
    }
    const createdCombinations: CreatedCombination[] = [];

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

        const newCombination = await prisma.combination.create({
          data: {
            combinationKey: combo.imageId,
            libraryIds: combo.libraryIds,
            mainTemplateId,
            diffTemplateId,
            strategyConfig,
          },
        });

        created.push(combo.imageId);

        // Store created combination with imageIds for batch generation
        createdCombinations.push({
          id: newCombination.id,
          combinationKey: combo.imageId,
          imageIds: [combo.imageId], // Each combination has one imageId
        });
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
        mainTemplateId,
        mainTemplateName: mainTemplate.name,
        diffTemplateId,
        diffTemplateName: diffTemplate.name,
        total: combinations.length,
        created: created.length,
        skipped: skipped.length,
        createdCombinations, // NEW: Include full details with imageIds
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
