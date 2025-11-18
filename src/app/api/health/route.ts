/**
 * System Health API
 * GET /api/health - Get complete system health status
 */

import { NextResponse } from 'next/server';
import { HealthChecker } from '@/lib/monitoring/health-checker';
import { ErrorLogger } from '@/lib/errors/error-logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 * Returns complete system health check including providers, database, queue, and file system
 */
export async function GET() {
  try {
    const health = await HealthChecker.checkSystemHealth({
      timeout: 5000,
      includeMetrics: true,
      diskWarningThreshold: 80,
      diskCriticalThreshold: 90,
    });

    // Determine HTTP status code based on health
    let statusCode = 200;
    if (health.status === 'DEGRADED') {
      statusCode = 207; // Multi-Status
    } else if (health.status === 'UNHEALTHY') {
      statusCode = 503; // Service Unavailable
    }

    return NextResponse.json(
      {
        success: true,
        data: health,
        message: health.summary,
      },
      { status: statusCode }
    );
  } catch (error) {
    await ErrorLogger.log(error, {
      method: 'GET',
      url: '/api/health',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Health check failed',
        },
      },
      { status: 500 }
    );
  }
}
