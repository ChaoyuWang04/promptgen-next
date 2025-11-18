/**
 * Error Log API Endpoints
 * GET /api/errors - Query error logs with filters
 * DELETE /api/errors - Delete all error logs or cleanup old logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ErrorLogger } from '@/lib/errors/error-logger';
import { ErrorLevel } from '@/lib/errors/types';

export const dynamic = 'force-dynamic';

// Query params schema
const querySchema = z.object({
  level: z.nativeEnum(ErrorLevel).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).optional(),
  skip: z.coerce.number().min(0).optional(),
});

/**
 * GET /api/errors
 * Query error logs with filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params = {
      level: searchParams.get('level') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') || undefined,
      skip: searchParams.get('skip') || undefined,
    };

    const validated = querySchema.parse(params);

    const errors = await ErrorLogger.query({
      level: validated.level,
      startDate: validated.startDate ? new Date(validated.startDate) : undefined,
      endDate: validated.endDate ? new Date(validated.endDate) : undefined,
      search: validated.search,
      limit: validated.limit,
      skip: validated.skip,
    });

    return NextResponse.json({
      success: true,
      data: {
        errors,
        count: errors.length,
      },
      message: 'Error logs retrieved successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    await ErrorLogger.log(error, {
      method: 'GET',
      url: '/api/errors',
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

// Delete body schema
const deleteSchema = z.object({
  action: z.enum(['cleanup', 'deleteAll']),
  daysToKeep: z.number().min(1).max(365).optional(),
});

/**
 * DELETE /api/errors
 * Delete error logs (cleanup old or delete all)
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = deleteSchema.parse(body);

    let deletedCount = 0;

    if (validated.action === 'cleanup') {
      const days = validated.daysToKeep || 30;
      deletedCount = await ErrorLogger.cleanup(days);
    } else if (validated.action === 'deleteAll') {
      deletedCount = await ErrorLogger.deleteAll();
    }

    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
      },
      message: `Successfully deleted ${deletedCount} error logs`,
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
      method: 'DELETE',
      url: '/api/errors',
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
