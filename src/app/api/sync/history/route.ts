/**
 * Sync History API
 * GET /api/sync/history - Get repair history
 */

import { NextRequest, NextResponse } from 'next/server';
import { SyncManager } from '@/lib/sync/sync-manager';
import { ErrorLogger } from '@/lib/errors/error-logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sync/history
 * Returns repair history
 * Query params:
 * - limit: number of entries to return (default: 10)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    const manager = new SyncManager();
    const history = manager.getRepairHistory(limit);

    return NextResponse.json({
      success: true,
      data: {
        history,
        count: history.length,
      },
      message: 'Repair history retrieved successfully',
    });
  } catch (error) {
    await ErrorLogger.log(error, {
      method: 'GET',
      url: '/api/sync/history',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SYNC_HISTORY_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get repair history',
        },
      },
      { status: 500 }
    );
  }
}
