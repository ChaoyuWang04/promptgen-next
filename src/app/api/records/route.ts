/**
 * GET /api/records
 *
 * Returns list of generation records with pagination support.
 * Used by dashboard to show recent generation history.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/records
 *
 * Query parameters:
 * - page (optional): Page number (default: 1)
 * - limit (optional): Items per page (default: 20, max: 100)
 * - status (optional): Filter by generation status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const status = searchParams.get('status'); // 'completed', 'pending', etc.

    // Build filter
    const where: any = {};
    if (status === 'completed') {
      where.promptGenerated = true;
      where.imageGenerated = true;
    } else if (status === 'pending') {
      where.OR = [
        { promptGenerated: false },
        { imageGenerated: false },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.record.count({ where });

    // Query records with pagination
    const records = await prisma.record.findMany({
      where,
      select: {
        id: true,
        imageId: true,
        libraryIds: true,
        promptGenerated: true,
        imageGenerated: true,
        providerUsed: true,
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
        records,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    console.error('[GET /api/records] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取记录列表失败',
          details: { originalError: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}
