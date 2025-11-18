/**
 * Queue Statistics API
 * GET /api/queue/stats - Get BullMQ queue statistics
 */

import { NextResponse } from 'next/server';
import { getQueueStats } from '@/lib/queue/image-generation-queue';
import { ErrorLogger } from '@/lib/errors/error-logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/queue/stats
 * Returns queue statistics including waiting, active, completed, failed, and delayed jobs
 */
export async function GET() {
  try {
    const stats = await getQueueStats();

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        health: stats.failed > 50 ? 'unhealthy' : stats.failed > 10 ? 'degraded' : 'healthy',
        timestamp: new Date().toISOString(),
      },
      message: 'Queue statistics retrieved successfully',
    });
  } catch (error) {
    await ErrorLogger.log(error, {
      method: 'GET',
      url: '/api/queue/stats',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'QUEUE_STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get queue stats',
        },
      },
      { status: 500 }
    );
  }
}
