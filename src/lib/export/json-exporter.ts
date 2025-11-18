/**
 * JSON Exporter
 * Exports data to JSON format
 */

import { format } from 'date-fns';
import { ExportOptions, ExportResult } from './types';

/**
 * JSON Exporter class
 */
export class JSONExporter {
  /**
   * Export data to JSON
   */
  static export<T>(
    data: T[],
    options: ExportOptions
  ): ExportResult {
    try {
      const timestamp = new Date();
      const fileName = options.fileName || `export_${format(timestamp, 'yyyyMMdd_HHmmss')}`;

      const jsonData = options.prettyPrint
        ? JSON.stringify(data, null, 2)
        : JSON.stringify(data);

      const fileSize = new Blob([jsonData]).size;

      return {
        success: true,
        fileName: `${fileName}.json`,
        fileSize,
        itemCount: data.length,
        timestamp,
      };
    } catch (error) {
      return {
        success: false,
        fileName: '',
        fileSize: 0,
        itemCount: 0,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  /**
   * Convert data to JSON string
   */
  static stringify<T>(data: T[], prettyPrint: boolean = true): string {
    return prettyPrint
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
  }
}
