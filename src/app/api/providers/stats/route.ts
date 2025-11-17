/**
 * GET /api/providers/stats
 *
 * Returns statistics about AI provider performance.
 * Used by dashboard and status page to show provider health and performance.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

interface ProviderAttempt {
  provider: string;
  success: boolean;
  error?: string;
  attempted_at: string;
}

/**
 * GET /api/providers/stats
 *
 * Returns:
 * - Total requests per provider
 * - Success rate per provider
 * - Average response time
 * - Recent errors
 */
export async function GET() {
  try {
    // Get all records with provider attempts
    const records = await prisma.record.findMany({
      select: {
        providerUsed: true,
        providerAttempts: true,
      },
    });

    // Analyze provider attempts
    const providerStats: Record<string, {
      total_requests: number;
      successful_requests: number;
      failed_requests: number;
      success_rate: number;
      last_used_at?: string;
    }> = {};

    records.forEach(record => {
      const attempts = (record.providerAttempts as ProviderAttempt[] | null) || [];

      attempts.forEach(attempt => {
        const { provider, success, attempted_at } = attempt;

        if (!providerStats[provider]) {
          providerStats[provider] = {
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            success_rate: 0,
          };
        }

        providerStats[provider].total_requests++;
        if (success) {
          providerStats[provider].successful_requests++;
        } else {
          providerStats[provider].failed_requests++;
        }

        // Track latest attempt time
        if (!providerStats[provider].last_used_at || attempted_at > providerStats[provider].last_used_at!) {
          providerStats[provider].last_used_at = attempted_at;
        }
      });
    });

    // Calculate success rates
    Object.keys(providerStats).forEach(provider => {
      const stats = providerStats[provider];
      stats.success_rate = stats.total_requests > 0
        ? Math.round((stats.successful_requests / stats.total_requests) * 100)
        : 0;
    });

    // Get provider usage count
    const providerUsage = await prisma.record.groupBy({
      by: ['providerUsed'],
      _count: {
        providerUsed: true,
      },
    });

    const usageByProvider = providerUsage.reduce((acc, stat) => {
      const provider = stat.providerUsed || 'unknown';
      acc[provider] = stat._count.providerUsed;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      data: {
        provider_stats: providerStats,
        usage_by_provider: usageByProvider,
        total_records: records.length,
      },
    });
  } catch (error) {
    console.error('[GET /api/providers/stats] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取Provider统计失败',
          details: { originalError: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}
