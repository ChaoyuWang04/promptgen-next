import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export interface PythonStitchOptions {
  mainImagePath: string;
  diffImagePath: string;
  outputPath: string;
  languageId: number;
}

export interface PythonStitchResult {
  success: boolean;
  output_path?: string;
  language?: string;
  tries?: number;
  diffs?: number;
  dimensions?: { width: number; height: number };
  error?: string;
  stage?: string;
}

export class PythonStitcher {
  private pythonScript: string;

  constructor() {
    // Path to Python CLI script
    this.pythonScript = path.join(process.cwd(), 'scripts', 'stitch-cli.py');
  }

  /**
   * Stitch images using Python script
   */
  async stitch(options: PythonStitchOptions): Promise<string> {
    const { mainImagePath, diffImagePath, outputPath, languageId } = options;

    console.log(`[PythonStitcher] Calling Python script...`);
    console.log(`  Main: ${mainImagePath}`);
    console.log(`  Diff: ${diffImagePath}`);
    console.log(`  Output: ${outputPath}`);
    console.log(`  Language: ${languageId}`);

    try {
      // Execute Python script
      const command = `python3 "${this.pythonScript}" "${mainImagePath}" "${diffImagePath}" "${outputPath}" ${languageId}`;

      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      if (stderr) {
        console.warn(`[PythonStitcher] Python stderr:`, stderr);
      }

      // Parse JSON result
      const result: PythonStitchResult = JSON.parse(stdout.trim());

      if (!result.success) {
        throw new Error(result.error || 'Python stitching failed');
      }

      console.log(`[PythonStitcher] ✅ Success: ${result.output_path}`);
      return outputPath;

    } catch (error) {
      console.error('[PythonStitcher] Error:', error);

      if (error instanceof Error) {
        if (error.message.includes('ENOENT')) {
          throw new Error('Python 3 not found. Please install Python 3 and Pillow (pip install pillow)');
        }
        throw error;
      }

      throw new Error(`Python stitching failed: ${String(error)}`);
    }
  }
}
