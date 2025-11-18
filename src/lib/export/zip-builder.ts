/**
 * ZIP Builder
 * Creates ZIP archives for bulk exports
 */

import JSZip from 'jszip';
import { format } from 'date-fns';

/**
 * ZIP Builder class
 */
export class ZIPBuilder {
  private zip: JSZip;

  constructor() {
    this.zip = new JSZip();
  }

  /**
   * Add file to ZIP
   */
  addFile(fileName: string, content: string | Buffer): void {
    this.zip.file(fileName, content);
  }

  /**
   * Add JSON file to ZIP
   */
  addJSONFile(fileName: string, data: any, prettyPrint: boolean = true): void {
    const content = prettyPrint
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
    this.zip.file(fileName, content);
  }

  /**
   * Add text file to ZIP
   */
  addTextFile(fileName: string, content: string): void {
    this.zip.file(fileName, content);
  }

  /**
   * Generate ZIP as Buffer
   */
  async generateBuffer(): Promise<Buffer> {
    const content = await this.zip.generateAsync({ type: 'nodebuffer' });
    return content;
  }

  /**
   * Generate ZIP as base64
   */
  async generateBase64(): Promise<string> {
    const content = await this.zip.generateAsync({ type: 'base64' });
    return content;
  }

  /**
   * Create a ZIP archive from multiple files
   */
  static async create(files: { name: string; content: string | Buffer }[]): Promise<Buffer> {
    const builder = new ZIPBuilder();

    for (const file of files) {
      builder.addFile(file.name, file.content);
    }

    return builder.generateBuffer();
  }

  /**
   * Generate timestamped filename
   */
  static generateFileName(prefix: string = 'export'): string {
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    return `${prefix}_${timestamp}.zip`;
  }
}
