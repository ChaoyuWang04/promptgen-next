/**
 * Error Management Types
 * Defines types for centralized error logging and classification
 */

/**
 * Error classification levels
 */
export enum ErrorLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  PROVIDER_ERROR = 'PROVIDER_ERROR',           // AI provider failures
  TEMPLATE_ERROR = 'TEMPLATE_ERROR',           // Template parsing/rendering errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',       // Zod validation errors
  DATABASE_ERROR = 'DATABASE_ERROR',           // Prisma/database errors
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',     // File I/O errors
  NETWORK_ERROR = 'NETWORK_ERROR',             // HTTP/network errors
  QUEUE_ERROR = 'QUEUE_ERROR',                 // BullMQ queue errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',             // Unclassified errors
}

/**
 * Error context interface
 */
export interface ErrorContext {
  /**
   * HTTP request method (GET, POST, etc.)
   */
  method?: string;

  /**
   * Request URL/path
   */
  url?: string;

  /**
   * Request parameters
   */
  params?: Record<string, any>;

  /**
   * Request body
   */
  body?: Record<string, any>;

  /**
   * User identifier (if available)
   */
  userId?: string;

  /**
   * Additional context data
   */
  metadata?: Record<string, any>;
}

/**
 * Error log entry (matches Prisma ErrorLog model)
 */
export interface ErrorLogEntry {
  id: string;
  level: string;
  message: string;
  stack?: string;
  context?: ErrorContext;
  createdAt: Date;
}

/**
 * Error statistics
 */
export interface ErrorStats {
  /**
   * Total error count
   */
  total: number;

  /**
   * Error count by level
   */
  byLevel: Record<ErrorLevel, number>;

  /**
   * Error count by category
   */
  byCategory: Record<string, number>;

  /**
   * Errors in last 24 hours
   */
  last24Hours: number;

  /**
   * Error rate trend (% change from previous period)
   */
  trend: number;

  /**
   * Most common error messages
   */
  topErrors: Array<{
    message: string;
    count: number;
  }>;
}

/**
 * Error log query filters
 */
export interface ErrorLogFilter {
  /**
   * Filter by error level
   */
  level?: ErrorLevel;

  /**
   * Filter by date range (start)
   */
  startDate?: Date;

  /**
   * Filter by date range (end)
   */
  endDate?: Date;

  /**
   * Search in error message
   */
  search?: string;

  /**
   * Limit results
   */
  limit?: number;

  /**
   * Skip results (for pagination)
   */
  skip?: number;
}

/**
 * Classified error result
 */
export interface ClassifiedError {
  /**
   * Error category
   */
  category: ErrorCategory;

  /**
   * Error level
   */
  level: ErrorLevel;

  /**
   * Error message
   */
  message: string;

  /**
   * Stack trace
   */
  stack?: string;

  /**
   * Original error
   */
  originalError: Error;
}
