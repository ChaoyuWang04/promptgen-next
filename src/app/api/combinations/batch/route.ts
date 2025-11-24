/**
 * Batch Combination API Routes
 * DELETE /api/combinations/batch - Batch delete combinations and all associated data
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { deleteCombinationFiles } from '@/lib/utils/file-manager';
import { z } from 'zod';

// Request schema
const BatchDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one ID is required'),
});

/**
 * DELETE /api/combinations/batch
 * Batch delete combinations and all associated data (records, variants, prompts, files)
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const parseResult = BatchDeleteSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parseResult.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { ids } = parseResult.data;

    // Find all combinations to get their keys for file deletion
    const combinations = await prisma.combination.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        combinationKey: true,
        records: {
          select: { id: true },
        },
      },
    });

    if (combinations.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No combinations found with the provided IDs',
          },
        },
        { status: 404 }
      );
    }

    // Collect all record IDs
    const allRecordIds = combinations.flatMap((c) => c.records.map((r) => r.id));
    const combinationIds = combinations.map((c) => c.id);
    const combinationKeys = combinations.map((c) => c.combinationKey);

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      if (allRecordIds.length > 0) {
        // Step 1: Delete all variants for all records
        await tx.imageVariant.deleteMany({
          where: { recordId: { in: allRecordIds } },
        });

        // Step 2: Delete all prompts for all records
        await tx.prompt.deleteMany({
          where: { recordId: { in: allRecordIds } },
        });

        // Step 3: Delete all records for all combinations
        await tx.record.deleteMany({
          where: { combinationId: { in: combinationIds } },
        });
      }

      // Step 4: Delete all combinations
      await tx.combination.deleteMany({
        where: { id: { in: combinationIds } },
      });
    });

    // Step 5: Delete files from filesystem (parallel for performance)
    const fileDeletePromises = combinationKeys.map((key) =>
      deleteCombinationFiles(key).catch((err) => {
        console.warn(`[API] Failed to delete files for combination ${key}:`, err);
        // Don't throw - file deletion is best-effort
      })
    );
    await Promise.all(fileDeletePromises);

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: combinations.length,
        deletedKeys: combinationKeys,
      },
      message: `Successfully deleted ${combinations.length} combinations`,
    });
  } catch (error) {
    console.error('[API] DELETE /api/combinations/batch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to batch delete combinations',
        },
      },
      { status: 500 }
    );
  }
}
