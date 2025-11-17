/**
 * GET /api/images/stats
 *
 * Returns statistics about image generation.
 * Used by dashboard to show overall system stats.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/images/stats
 *
 * Returns:
 * - Total images generated
 * - Images by status (completed, pending, failed)
 * - Recent generation activity
 */
export async function GET() {
  try {
    // Get total records
    const totalRecords = await prisma.record.count();

    // Get completed images (both prompt and image generated)
    const completedImages = await prisma.record.count({
      where: {
        promptGenerated: true,
        imageGenerated: true,
      },
    });

    // Get pending images (missing either prompt or image)
    const pendingImages = await prisma.record.count({
      where: {
        OR: [
          { promptGenerated: false },
          { imageGenerated: false },
        ],
      },
    });

    // Get total variants
    const totalVariants = await prisma.imageVariant.count();

    // Get records by provider
    const providerStats = await prisma.record.groupBy({
      by: ['providerUsed'],
      _count: {
        providerUsed: true,
      },
    });

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentImages = await prisma.record.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        total_records: totalRecords,
        completed_images: completedImages,
        pending_images: pendingImages,
        total_variants: totalVariants,
        recent_images_7d: recentImages,
        by_provider: providerStats.reduce((acc, stat) => {
          const provider = stat.providerUsed || 'unknown';
          acc[provider] = stat._count.providerUsed;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error('[GET /api/images/stats] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取图片统计失败',
          details: { originalError: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}
