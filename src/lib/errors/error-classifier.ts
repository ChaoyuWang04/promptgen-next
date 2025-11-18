/**
 * Error Classification Module
 * Automatically classifies errors into categories based on error type and message
 */

import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ErrorCategory, ErrorLevel, ClassifiedError } from './types';

/**
 * Classify an error into category and level
 */
export class ErrorClassifier {
  /**
   * Classify an error
   * @param error - The error to classify
   * @returns Classified error with category and level
   */
  static classify(error: unknown): ClassifiedError {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    // Determine category and level
    const category = this.determineCategory(errorObj);
    const level = this.determineLevel(errorObj, category);

    return {
      category,
      level,
      message: this.sanitizeMessage(errorObj.message),
      stack: errorObj.stack,
      originalError: errorObj,
    };
  }

  /**
   * Determine error category based on error type
   */
  private static determineCategory(error: Error): ErrorCategory {
    // Zod validation errors
    if (error instanceof ZodError) {
      return ErrorCategory.VALIDATION_ERROR;
    }

    // Prisma database errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return ErrorCategory.DATABASE_ERROR;
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      return ErrorCategory.DATABASE_ERROR;
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return ErrorCategory.VALIDATION_ERROR;
    }

    // Check error message for patterns
    const message = error.message.toLowerCase();

    // Provider errors (Gemini, ByteDance)
    if (
      message.includes('provider') ||
      message.includes('gemini') ||
      message.includes('bytedance') ||
      message.includes('api key') ||
      message.includes('rate limit')
    ) {
      return ErrorCategory.PROVIDER_ERROR;
    }

    // Template errors
    if (
      message.includes('template') ||
      message.includes('parse') ||
      message.includes('render') ||
      message.includes('module not found')
    ) {
      return ErrorCategory.TEMPLATE_ERROR;
    }

    // File system errors
    if (
      message.includes('enoent') ||
      message.includes('eacces') ||
      message.includes('file') ||
      message.includes('directory')
    ) {
      return ErrorCategory.FILE_SYSTEM_ERROR;
    }

    // Network errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('econnreset')
    ) {
      return ErrorCategory.NETWORK_ERROR;
    }

    // Queue errors (BullMQ)
    if (
      message.includes('queue') ||
      message.includes('job') ||
      message.includes('redis')
    ) {
      return ErrorCategory.QUEUE_ERROR;
    }

    return ErrorCategory.UNKNOWN_ERROR;
  }

  /**
   * Determine error level based on category and error
   */
  private static determineLevel(
    error: Error,
    category: ErrorCategory
  ): ErrorLevel {
    // Validation errors are usually warnings (user input issues)
    if (category === ErrorCategory.VALIDATION_ERROR) {
      return ErrorLevel.WARN;
    }

    // Database errors are critical
    if (category === ErrorCategory.DATABASE_ERROR) {
      return ErrorLevel.ERROR;
    }

    // Provider errors depend on the message
    if (category === ErrorCategory.PROVIDER_ERROR) {
      if (error.message.includes('rate limit')) {
        return ErrorLevel.WARN; // Rate limits are expected
      }
      return ErrorLevel.ERROR;
    }

    // Queue errors are usually errors
    if (category === ErrorCategory.QUEUE_ERROR) {
      return ErrorLevel.ERROR;
    }

    // File not found can be a warning
    if (
      category === ErrorCategory.FILE_SYSTEM_ERROR &&
      error.message.toLowerCase().includes('enoent')
    ) {
      return ErrorLevel.WARN;
    }

    // Default to ERROR for unknown categories
    return ErrorLevel.ERROR;
  }

  /**
   * Sanitize error message (remove sensitive data)
   */
  private static sanitizeMessage(message: string): string {
    // Remove API keys (pattern: key_xxxxx or any long alphanumeric after 'key')
    let sanitized = message.replace(
      /(['\"]?(?:api[_-]?)?key['\"]?\s*[:=]\s*['"]?)[\w-]{20,}(['"]?)/gi,
      '$1***REDACTED***$2'
    );

    // Remove passwords
    sanitized = sanitized.replace(
      /(['\"]?password['\"]?\s*[:=]\s*['"]?)[\w-]+(['"]?)/gi,
      '$1***REDACTED***$2'
    );

    // Remove tokens
    sanitized = sanitized.replace(
      /(['\"]?token['\"]?\s*[:=]\s*['"]?)[\w.-]+(['"]?)/gi,
      '$1***REDACTED***$2'
    );

    // Remove database connection strings
    sanitized = sanitized.replace(
      /postgresql:\/\/[^@]+@[^\s]+/gi,
      'postgresql://***REDACTED***'
    );

    return sanitized;
  }

  /**
   * Extract actionable information from error
   */
  static extractActionableInfo(error: Error): string {
    if (error instanceof ZodError) {
      return `Validation failed: ${error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')}`;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return 'Unique constraint violation';
        case 'P2003':
          return 'Foreign key constraint violation';
        case 'P2025':
          return 'Record not found';
        default:
          return `Database error: ${error.code}`;
      }
    }

    return error.message;
  }
}
