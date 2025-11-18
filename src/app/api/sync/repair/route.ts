/**
 * Sync Repair API
 * POST /api/sync/repair - Repair specific issues or auto-repair all
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SyncManager } from '@/lib/sync/sync-manager';
import { ErrorLogger } from '@/lib/errors/error-logger';

export const dynamic = 'force-dynamic';

// Request schema
const repairSchema = z.object({
  mode: z.enum(['manual', 'auto']).default('manual'),
  issueIds: z.array(z.string()).optional(),
});

/**
 * POST /api/sync/repair
 * Repairs sync issues
 * - mode: 'manual' - repair specific issues (requires issueIds)
 * - mode: 'auto' - auto-repair all repairable issues
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = repairSchema.parse(body);

    const manager = new SyncManager();
    let historyEntry;

    if (validated.mode === 'auto') {
      // Auto-repair all repairable issues
      historyEntry = await manager.autoRepairAll();
    } else {
      // Manual repair of specific issues
      if (!validated.issueIds || validated.issueIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'issueIds is required for manual repair mode',
            },
          },
          { status: 400 }
        );
      }

      historyEntry = await manager.repairIssues(validated.issueIds, 'manual');
    }

    return NextResponse.json({
      success: true,
      data: historyEntry,
      message: `Repaired ${historyEntry.successCount} issue(s), ${historyEntry.failureCount} failed`,
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
      url: '/api/sync/repair',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SYNC_REPAIR_FAILED',
          message: error instanceof Error ? error.message : 'Sync repair failed',
        },
      },
      { status: 500 }
    );
  }
}
