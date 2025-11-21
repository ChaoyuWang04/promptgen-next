/**
 * Bulk Delete Records API
 * POST /api/records/bulk-delete - Delete multiple records with cascade
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { ErrorLogger } from '@/lib/errors/error-logger';

export const dynamic = 'force-dynamic';

const bulkDeleteSchema = z.object({
  imageIds: z.array(z.string()).min(1, 'At least one imageId is required'),
  cascade: z.boolean().default(true), // Delete related prompts and image variants
});

/**
 * POST /api/records/bulk-delete
 * Deletes multiple records and optionally their related data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageIds, cascade } = bulkDeleteSchema.parse(body);

    let deletedCount = 0;
    let relatedDeleted = { prompts: 0, imageVariants: 0 };

    // Use transaction for atomic operation
    await prisma.$transaction(async (tx) => {
      if (cascade) {
        // Delete related prompts
        const promptsResult = await tx.prompt.deleteMany({
          where: { record: { imageId: { in: imageIds } } },
        });
        relatedDeleted.prompts = promptsResult.count;

        // Delete related image variants
        const variantsResult = await tx.imageVariant.deleteMany({
          where: { record: { imageId: { in: imageIds } } },
        });
        relatedDeleted.imageVariants = variantsResult.count;
      }

      // Delete records
      const result = await tx.record.deleteMany({
        where: { imageId: { in: imageIds } },
      });
      deletedCount = result.count;
    });

    return NextResponse.json({
      success: true,
      data: {
        deletedRecords: deletedCount,
        deletedPrompts: relatedDeleted.prompts,
        deletedImageVariants: relatedDeleted.imageVariants,
      },
      message: `Deleted ${deletedCount} record(s)${cascade ? ` and ${relatedDeleted.prompts + relatedDeleted.imageVariants} related items` : ''}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    await ErrorLogger.log(error, {
      method: 'POST',
      url: '/api/records/bulk-delete',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BULK_DELETE_FAILED',
          message: error instanceof Error ? error.message : 'Bulk delete failed',
        },
      },
      { status: 500 }
    );
  }
}
