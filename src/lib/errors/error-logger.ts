/**
 * Centralized Error Logger
 * Logs errors to the database with classification and context
 */

import { prisma } from '@/lib/db/prisma';
import { ErrorClassifier } from './error-classifier';
import { ErrorContext, ErrorLogFilter, ErrorStats, ErrorLevel } from './types';

/**
 * Centralized error logger
 */
export class ErrorLogger {
  /**
   * Log an error to the database
   * @param error - The error to log
   * @param context - Optional context information
   * @returns Promise<void>
   */
  static async log(error: unknown, context?: ErrorContext): Promise<void> {
    try {
      const classified = ErrorClassifier.classify(error);

      await prisma.errorLog.create({
        data: {
          level: classified.level,
          message: classified.message,
          stack: classified.stack,
          context: context ? (context as any) : undefined,
        },
      });

      // Also log to console for development
      if (process.env.NODE_ENV === 'development') {
        console.error('[ErrorLogger]', {
          level: classified.level,
          category: classified.category,
          message: classified.message,
          context,
        });
      }
    } catch (loggingError) {
      // Fallback to console if database logging fails
      console.error('[ErrorLogger] Failed to log error to database:', loggingError);
      console.error('[ErrorLogger] Original error:', error);
    }
  }

  /**
   * Log an error and return a formatted error response
   * Useful for API route handlers
   */
  static async logAndRespond(
    error: unknown,
    context?: ErrorContext
  ): Promise<{
    success: false;
    error: {
      code: string;
      message: string;
      details?: any;
    };
  }> {
    await this.log(error, context);

    const classified = ErrorClassifier.classify(error);
    const actionableInfo = ErrorClassifier.extractActionableInfo(
      classified.originalError
    );

    return {
      success: false,
      error: {
        code: classified.category,
        message: actionableInfo,
        details:
          process.env.NODE_ENV === 'development' ? classified.stack : undefined,
      },
    };
  }

  /**
   * Query error logs with filters
   * @param filters - Query filters
   * @returns Promise<ErrorLogEntry[]>
   */
  static async query(filters: ErrorLogFilter = {}) {
    const { level, startDate, endDate, search, limit = 100, skip = 0 } = filters;

    const where: any = {};

    if (level) {
      where.level = level;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    if (search) {
      where.message = {
        contains: search,
        mode: 'insensitive',
      };
    }

    return prisma.errorLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip,
    });
  }

  /**
   * Get error statistics
   * @returns Promise<ErrorStats>
   */
  static async getStats(): Promise<ErrorStats> {
    const [total, last24Hours, byLevel, topErrors] = await Promise.all([
      // Total error count
      prisma.errorLog.count(),

      // Errors in last 24 hours
      prisma.errorLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Count by level
      prisma.errorLog.groupBy({
        by: ['level'],
        _count: {
          level: true,
        },
      }),

      // Top error messages (group by message, count occurrences)
      prisma.$queryRaw<Array<{ message: string; count: bigint }>>`
        SELECT message, COUNT(*) as count
        FROM "ErrorLog"
        GROUP BY message
        ORDER BY count DESC
        LIMIT 10
      `,
    ]);

    // Calculate trend (compare last 24h with previous 24h)
    const previous24Hours = await prisma.errorLog.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 48 * 60 * 60 * 1000),
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    const trend =
      previous24Hours === 0
        ? 0
        : ((last24Hours - previous24Hours) / previous24Hours) * 100;

    // Convert byLevel to object
    const byLevelObj: Record<ErrorLevel, number> = {
      [ErrorLevel.ERROR]: 0,
      [ErrorLevel.WARN]: 0,
      [ErrorLevel.INFO]: 0,
    };

    byLevel.forEach((item) => {
      byLevelObj[item.level as ErrorLevel] = item._count.level;
    });

    return {
      total,
      byLevel: byLevelObj,
      byCategory: {}, // We don't store category in DB, could be added if needed
      last24Hours,
      trend: Math.round(trend * 10) / 10,
      topErrors: topErrors.map((e) => ({
        message: e.message,
        count: Number(e.count),
      })),
    };
  }

  /**
   * Clean up old error logs
   * @param daysToKeep - Number of days to keep error logs (default: 30)
   * @returns Promise<number> - Number of deleted records
   */
  static async cleanup(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.errorLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  /**
   * Delete all error logs
   * @returns Promise<number> - Number of deleted records
   */
  static async deleteAll(): Promise<number> {
    const result = await prisma.errorLog.deleteMany({});
    return result.count;
  }
}
