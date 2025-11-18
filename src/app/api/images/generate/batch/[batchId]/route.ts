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

    console.log(
      `[API] Batch ${batchId} status: ${status.status} (${status.completed + status.failed}/${status.totalImages})`
    );

    return NextResponse.json({
      success: true,
      data: status,
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
