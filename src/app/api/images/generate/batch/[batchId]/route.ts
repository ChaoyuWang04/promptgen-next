/**
 * Batch Progress API
 * GET /api/images/generate/batch/[batchId]
 * Get batch generation status and progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { BatchGenerator } from '@/lib/generators/batch-generator';
import { createProviderManagerFromEnv } from '@/lib/providers';

interface RouteParams {
  params: Promise<{
    batchId: string;
  }>;
}

/**
 * GET /api/images/generate/batch/[batchId]
 * Get batch status and progress
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { batchId } = await params;

    console.log(`[API] Getting batch status for: ${batchId}`);

    // Create batch generator
    const batchGenerator = new BatchGenerator();

    // Get batch status (includes real-time queue status)
    const status = await batchGenerator.getBatchStatus(batchId);

    // Calculate progress percentage
    const progress =
      status.totalImages > 0
        ? Math.round((status.completed / status.totalImages) * 100)
        : 0;

    console.log(
      `[API] Batch ${batchId} status: ${status.status} (${status.completed + status.failed}/${status.totalImages}) - ${progress}%`
    );

    // Transform to match the expected BatchProgress interface
    const response = {
      batchId: status.batchId,
      totalImages: status.totalImages,
      completed: status.completed,
      failed: status.failed,
      status: status.status,
      progress,
      createdAt: status.createdAt.toISOString(),
      updatedAt: status.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('[API] Batch status error:', error);

    // Handle batch not found
    if (
      error instanceof Error &&
      error.message.includes('Batch not found')
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Batch not found',
          },
        },
        { status: 404 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BATCH_STATUS_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/images/generate/batch/[batchId]
 * Cancel a running batch
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { batchId } = await params;

    console.log(`[API] Cancelling batch: ${batchId}`);

    // Create batch generator
    const batchGenerator = new BatchGenerator();

    // Cancel batch
    await batchGenerator.cancelBatch(batchId);

    console.log(`[API] Batch ${batchId} cancelled`);

    return NextResponse.json({
      success: true,
      message: `Batch ${batchId} has been cancelled`,
    });
  } catch (error) {
    console.error('[API] Batch cancel error:', error);

    // Handle batch not found
    if (
      error instanceof Error &&
      error.message.includes('Batch not found')
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Batch not found',
          },
        },
        { status: 404 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BATCH_CANCEL_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 }
    );
  }
}
