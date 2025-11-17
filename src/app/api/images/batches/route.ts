/**
 * GET /api/images/batches
 *
 * Returns list of image generation batches with pagination.
 * Used by images page to show batch generation history.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/images/batches
 *
 * Query parameters:
 * - page (optional): Page number (default: 1)
 * - limit (optional): Items per page (default: 20, max: 100)
 * - status (optional): Filter by batch status (PENDING, IN_PROGRESS, COMPLETED, FAILED)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const status = searchParams.get('status')?.toUpperCase();

    // Build filter
    const where: any = {};
    if (status && ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'].includes(status)) {
      where.status = status;
    }

    // Get total count for pagination
    const totalCount = await prisma.imageBatch.count({ where });

    // Query batches with pagination
    const batches = await prisma.imageBatch.findMany({
      where,
      select: {
        id: true,
        imageIds: true,
        totalImages: true,
        completed: true,
        failed: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        batches,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    console.error('[GET /api/images/batches] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取批次列表失败',
          details: { originalError: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}
