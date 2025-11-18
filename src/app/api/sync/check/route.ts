/**
 * Sync Check API
 * GET /api/sync/check - Run all sync checkers and return results
 */

import { NextResponse } from 'next/server';
import { SyncManager } from '@/lib/sync/sync-manager';
import { ErrorLogger } from '@/lib/errors/error-logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sync/check
 * Runs all sync checkers and returns a summary of issues found
 */
export async function GET() {
  try {
    const manager = new SyncManager();
    const summary = await manager.runAllChecks();

    return NextResponse.json({
      success: true,
      data: summary,
      message: `Found ${summary.totalIssues} issue(s) across ${summary.checkerResults.length} checkers`,
    });
  } catch (error) {
    await ErrorLogger.log(error, {
      method: 'GET',
      url: '/api/sync/check',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SYNC_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Sync check failed',
        },
      },
      { status: 500 }
    );
  }
}
