/**
 * Strategy Generation API
 * POST /api/combinations/strategy - Generate combinations from strategy
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { StrategyGenerationRequestSchema } from '@/schemas/combination.schema';
import { generateCombinationKey } from '@/lib/utils/file-manager';

/**
 * POST /api/combinations/strategy
 * Generate combinations based on strategy configuration
 *
 * Strategy config example:
 * {
 *   templateId: "template_main_v1",
 *   strategyConfig: {
 *     fixed: { "character": "char_betty_v1" },
 *     variable: ["theme", "scene"]
 *   }
 * }
 *
 * This will generate combinations for:
 * - betty × all themes × all scenes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = StrategyGenerationRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid strategy configuration',
            details: validationResult.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { templateId, strategyConfig } = validationResult.data;
    const { fixed, variable } = strategyConfig;

    // Validate template exists
    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Template not found: ${templateId}`,
          },
        },
        { status: 404 }
      );
    }

    // Get all library entries for variable libraries
    const libraryData: Record<string, any[]> = {};

    for (const libraryName of variable) {
      const library = await prisma.library.findUnique({
        where: { name: libraryName },
      });

      if (!library) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `Library not found: ${libraryName}`,
            },
          },
          { status: 404 }
        );
      }

      const entries = library.entries as any[];
      if (!entries || entries.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Library has no entries: ${libraryName}`,
            },
          },
          { status: 400 }
        );
      }

      libraryData[libraryName] = entries;
    }

    // Validate fixed libraries exist
    for (const [libraryName, entryId] of Object.entries(fixed)) {
      const library = await prisma.library.findUnique({
        where: { name: libraryName },
      });

      if (!library) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `Library not found: ${libraryName}`,
            },
          },
          { status: 404 }
        );
      }

      const entries = library.entries as any[];
      const entryExists = entries.some((e) => e.id === entryId);

      if (!entryExists) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `Entry not found in ${libraryName}: ${entryId}`,
            },
          },
          { status: 404 }
        );
      }
    }

    // Generate all combinations using cartesian product
    const combinations: Array<{
      combinationKey: string;
      libraryIds: Record<string, string>;
    }> = [];

    // Helper function to generate cartesian product
    function* cartesianProduct<T>(
      arrays: T[][]
    ): Generator<T[], void, unknown> {
      if (arrays.length === 0) {
        yield [];
        return;
      }

      const [first, ...rest] = arrays;
      for (const item of first) {
        for (const combo of cartesianProduct(rest)) {
          yield [item, ...combo];
        }
      }
    }

    // Build arrays for cartesian product
    const variableArrays = variable.map((libraryName) =>
      libraryData[libraryName].map((entry) => ({
        libraryName,
        entryId: entry.id,
      }))
    );

    // Generate combinations
    for (const combo of cartesianProduct(variableArrays)) {
      const libraryIds: Record<string, string> = { ...fixed };

      for (const item of combo) {
        libraryIds[item.libraryName] = item.entryId;
      }

      const combinationKey = generateCombinationKey(libraryIds);
      combinations.push({ combinationKey, libraryIds });
    }

    // Create combinations in database, skipping duplicates
    const created: string[] = [];
    const skipped: string[] = [];

    for (const combo of combinations) {
      try {
        const existing = await prisma.combination.findUnique({
          where: { combinationKey: combo.combinationKey },
        });

        if (existing) {
          skipped.push(combo.combinationKey);
          continue;
        }

        await prisma.combination.create({
          data: {
            combinationKey: combo.combinationKey,
            libraryIds: combo.libraryIds,
            templateId,
            strategyConfig: {
              fixed: Object.keys(fixed),
              variable,
            },
          },
        });

        created.push(combo.combinationKey);
      } catch (error) {
        // Handle unique constraint violation (race condition)
        if ((error as any).code === 'P2002') {
          skipped.push(combo.combinationKey);
        } else {
          throw error;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: combinations.length,
        created: created.length,
        skipped: skipped.length,
        createdKeys: created,
        skippedKeys: skipped,
      },
      message: `Generated ${created.length} combinations (${skipped.length} already existed)`,
    });
  } catch (error) {
    console.error('[API] POST /api/combinations/strategy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate combinations',
        },
      },
      { status: 500 }
    );
  }
}
