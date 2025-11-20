/**
 * Library Reorder API Route
 *
 * POST /api/libraries/reorder
 * Swaps the order of two libraries
 *
 * Request Body:
 * {
 *   "library1": "character",
 *   "library2": "pose"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "updated": [
 *       { "name": "character", "order": 1 },
 *       { "name": "pose", "order": 0 }
 *     ]
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

// Request validation schema
const reorderRequestSchema = z.object({
  library1: z.string().min(1, 'library1 is required'),
  library2: z.string().min(1, 'library2 is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = reorderRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validation.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { library1, library2 } = validation.data;

    // Ensure library1 and library2 are different
    if (library1 === library2) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Cannot swap a library with itself',
          },
        },
        { status: 400 }
      );
    }

    // Fetch both libraries
    const [lib1, lib2] = await Promise.all([
      prisma.library.findUnique({ where: { name: library1 } }),
      prisma.library.findUnique({ where: { name: library2 } }),
    ]);

    // Check if both libraries exist
    if (!lib1) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Library '${library1}' not found`,
          },
        },
        { status: 404 }
      );
    }

    if (!lib2) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Library '${library2}' not found`,
          },
        },
        { status: 404 }
      );
    }

    // Swap orders using a transaction to ensure atomicity
    // Use a temporary negative value to avoid unique constraint conflicts
    const tempOrder = -999;

    await prisma.$transaction(async (tx) => {
      // Step 1: Set lib1's order to temp value
      await tx.library.update({
        where: { name: library1 },
        data: { order: tempOrder },
      });

      // Step 2: Set lib2's order to lib1's original order
      await tx.library.update({
        where: { name: library2 },
        data: { order: lib1.order },
      });

      // Step 3: Set lib1's order to lib2's original order
      await tx.library.update({
        where: { name: library1 },
        data: { order: lib2.order },
      });
    });

    // Fetch updated libraries
    const [updatedLib1, updatedLib2] = await Promise.all([
      prisma.library.findUnique({
        where: { name: library1 },
        select: { name: true, order: true },
      }),
      prisma.library.findUnique({
        where: { name: library2 },
        select: { name: true, order: true },
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          updated: [updatedLib1, updatedLib2],
        },
        message: '库顺序已更新',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Library reorder error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '服务器内部错误',
        },
      },
      { status: 500 }
    );
  }
}
