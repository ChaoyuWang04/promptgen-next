/**
 * Error Statistics API
 * GET /api/errors/stats - Get error statistics and trends
 */

import { NextResponse } from 'next/server';
import { ErrorLogger } from '@/lib/errors/error-logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/errors/stats
 * Get error statistics including counts by level, trends, and top errors
 */
export async function GET() {
  try {
    const stats = await ErrorLogger.getStats();

    return NextResponse.json({
      success: true,
      data: stats,
      message: 'Error statistics retrieved successfully',
    });
  } catch (error) {
    await ErrorLogger.log(error, {
      method: 'GET',
      url: '/api/errors/stats',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
