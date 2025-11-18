/**
 * Export Types
 * Defines types for export functionality
 */

/**
 * Export format
 */
export enum ExportFormat {
  JSON = 'json',
  TXT = 'txt',
  ZIP = 'zip',
}

/**
 * Export options
 */
export interface ExportOptions {
  /**
   * Export format
   */
  format: ExportFormat;

  /**
   * Include related data
   */
  includeRelated?: boolean;

  /**
   * Pretty print JSON
   */
  prettyPrint?: boolean;

  /**
   * File name (without extension)
   */
  fileName?: string;
}

/**
 * Export result
 */
export interface ExportResult {
  /**
   * Export success
   */
  success: boolean;

  /**
   * File name
   */
  fileName: string;

  /**
   * File size in bytes
   */
  fileSize: number;

  /**
   * Number of items exported
   */
  itemCount: number;

  /**
   * Export timestamp
   */
  timestamp: Date;

  /**
   * Download URL or file path
   */
  downloadUrl?: string;

  /**
   * Error message (if failed)
   */
  error?: string;
}
