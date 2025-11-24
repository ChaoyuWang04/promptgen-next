/**
 * Single Combination API Routes
 * GET /api/combinations/[id] - Get combination with all records and variants
 * DELETE /api/combinations/[id] - Delete combination and all associated data
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { deleteCombinationFiles } from '@/lib/utils/file-manager';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/combinations/[id]
 * Get combination with all records and variants
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const combination = await prisma.combination.findUnique({
      where: { id },
      include: {
        mainTemplate: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        diffTemplate: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        records: {
          include: {
            prompts: true,
            variants: {
              orderBy: { version: 'asc' },
            },
          },
          orderBy: { variantNumber: 'asc' },
        },
      },
    });

    if (!combination) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Combination not found: ${id}`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: combination,
    });
  } catch (error) {
    console.error(`[API] GET /api/combinations/${(await params).id} error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch combination',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/combinations/[id]
 * Delete combination and all associated data (records, variants, files)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Find combination to get the key for file deletion
    const combination = await prisma.combination.findUnique({
      where: { id },
      select: {
        combinationKey: true,
        records: {
          select: { id: true },
        },
      },
    });

    if (!combination) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Combination not found: ${id}`,
          },
        },
        { status: 404 }
      );
    }

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // Delete all variants for records in this combination
      const recordIds = combination.records.map((r) => r.id);

      if (recordIds.length > 0) {
        await tx.imageVariant.deleteMany({
          where: { recordId: { in: recordIds } },
        });

        // Delete all prompts for records in this combination
        await tx.prompt.deleteMany({
          where: { recordId: { in: recordIds } },
        });

        // Delete all records in this combination
        await tx.record.deleteMany({
          where: { combinationId: id },
        });
      }

      // Delete the combination
      await tx.combination.delete({
        where: { id },
      });
    });

    // Delete files from filesystem
    await deleteCombinationFiles(combination.combinationKey);

    return NextResponse.json({
      success: true,
      message: `Combination deleted: ${combination.combinationKey}`,
    });
  } catch (error) {
    console.error(`[API] DELETE /api/combinations/${(await params).id} error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete combination',
        },
      },
      { status: 500 }
    );
  }
}
