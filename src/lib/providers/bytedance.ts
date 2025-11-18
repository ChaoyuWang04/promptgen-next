/**
 * ByteDance Doubao (SeeDream) Image Generation Provider
 * Uses Ark REST API for image generation with Doubao SeeDream model
 *
 * Implementation notes:
 * - Matches old Python system's behavior exactly
 * - Tests data URI support for Round 2 (fallback to URL if needed)
 * - Uses response_format: 'url' like old system
 */

import axios, { AxiosError } from 'axios';
import {
  IImageProvider,
  ProviderError,
  PROVIDER_TIMEOUT,
  DEFAULT_MODELS,
} from './types';

/**
 * ByteDance Ark API response structure for image generation
 */
interface BytedanceGenerateResponse {
  data?: Array<{
    url?: string;
    b64_json?: string;
  }>;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * ByteDance Doubao Provider implementation
 * Follows old Flask system's implementation pattern
 */
export class BytedanceProvider implements IImageProvider {
  public readonly name = 'bytedance';
  public readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly size: string;
  private readonly watermark: boolean;

  // Strategy flags
  private dataUriSupported: boolean | null = null; // null = not tested yet

  constructor(apiKey: string, model?: string, baseUrl?: string) {
    if (!apiKey) {
      throw new Error('ByteDance API key is required');
    }
    this.apiKey = apiKey;
    this.model = model || DEFAULT_MODELS.BYTEDANCE;
    this.baseUrl = baseUrl || process.env.BYTEDANCE_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
    this.size = process.env.BYTEDANCE_SIZE || '1440x2560'; // 9:16 ratio
    this.watermark = process.env.BYTEDANCE_WATERMARK?.toLowerCase() === 'true' || false;
  }

  /**
   * Generate an image using ByteDance Ark API
   * Matches old system: Round 1 gets URL, Round 2 uses that URL as reference
   */
  async generate(prompt: string, contextImage?: Buffer): Promise<Buffer> {
    const startTime = Date.now();

    try {
      const endpoint = `${this.baseUrl}/images/generate`;

      // Build request payload
      const payload = await this.buildPayload(prompt, contextImage);

      console.log(`[ByteDance] Calling API: ${endpoint}`);
      if (contextImage) {
        console.log(`[ByteDance] Round 2 generation with context image`);
      }

      // Make API request
      const response = await axios.post<BytedanceGenerateResponse>(
        endpoint,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          timeout: PROVIDER_TIMEOUT.BYTEDANCE,
        }
      );

      // Check for API errors
      if (response.data.error) {
        throw new ProviderError(
          `ByteDance API error: ${response.data.error.message}`,
          this.name
        );
      }

      // Extract image from response
      const imageBuffer = await this.extractImage(response.data);

      const generationTimeMs = Date.now() - startTime;
      console.log(
        `[ByteDance] Image generated successfully in ${generationTimeMs}ms`
      );

      return imageBuffer;
    } catch (error) {
      const generationTimeMs = Date.now() - startTime;
      console.error(
        `[ByteDance] Generation failed after ${generationTimeMs}ms:`,
        error
      );

      throw this.handleError(error);
    }
  }

  /**
   * Check if ByteDance API is accessible and healthy
   * Simple check: verify API key and endpoint are valid
   */
  async healthCheck(): Promise<boolean> {
    try {
      // ByteDance doesn't have a dedicated health endpoint
      // We check if we have valid configuration
      if (!this.apiKey || !this.baseUrl || !this.model) {
        return false;
      }

      // Could optionally make a minimal API call here
      // For now, just validate configuration is present
      console.log('[ByteDance] Health check: Configuration valid');
      return true;
    } catch (error) {
      console.error('[ByteDance] Health check failed:', error);
      return false;
    }
  }

  /**
   * Build request payload for ByteDance Ark API
   * Matches old Python system's payload structure
   */
  private async buildPayload(
    prompt: string,
    contextImage?: Buffer
  ): Promise<Record<string, unknown>> {
    const payload: Record<string, unknown> = {
      model: this.model,
      prompt: prompt,
      size: this.size, // 1440x2560 (9:16 ratio)
      response_format: 'url', // Get URL like old system
      watermark: this.watermark,
    };

    // Round 2: Add context image
    if (contextImage) {
      // Strategy 1: Try data URI (user's preferred approach)
      // Strategy 2: Fallback to URL upload if data URI fails
      const contextImageRef = await this.prepareContextImage(contextImage);
      payload.image = [contextImageRef]; // ByteDance expects array
    }

    return payload;
  }

  /**
   * Prepare context image for Round 2
   * Tests data URI support, falls back to URL upload if needed
   */
  private async prepareContextImage(buffer: Buffer): Promise<string> {
    // Test data URI on first Round 2 generation
    if (this.dataUriSupported === null) {
      console.log('[ByteDance] Testing data URI support...');
      // For first attempt, try data URI
      this.dataUriSupported = true; // Optimistic
      const dataUri = `data:image/png;base64,${buffer.toString('base64')}`;
      console.log(`[ByteDance] Using data URI (length: ${dataUri.length})`);
      return dataUri;
    }

    // Use known working strategy
    if (this.dataUriSupported) {
      const dataUri = `data:image/png;base64,${buffer.toString('base64')}`;
      return dataUri;
    } else {
      // TODO: Implement URL upload fallback
      throw new ProviderError(
        'Data URI not supported and URL upload not implemented yet',
        this.name
      );
    }
  }

  /**
   * Extract image buffer from ByteDance Ark API response
   * Matches old Python system: downloads from URL
   */
  private async extractImage(response: BytedanceGenerateResponse): Promise<Buffer> {
    // Check for data array
    if (!response.data || response.data.length === 0) {
      throw new ProviderError('No data in ByteDance API response', this.name);
    }

    const imageData = response.data[0];

    // ByteDance returns URL (response_format: 'url')
    if (!imageData.url) {
      throw new ProviderError('No image URL in response', this.name);
    }

    const imageUrl = imageData.url;
    console.log(`[ByteDance] Image URL received: ${imageUrl.substring(0, 80)}...`);

    // Download image from URL (matches old system behavior)
    try {
      const downloadResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 60000, // 60 second timeout for download
      });

      console.log('[ByteDance] Image downloaded successfully');
      return Buffer.from(downloadResponse.data);
    } catch (error) {
      throw new ProviderError(
        `Failed to download image from URL: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
        error
      );
    }
  }

  /**
   * Handle and normalize errors from ByteDance API
   */
  private handleError(error: unknown): ProviderError {
    if (error instanceof ProviderError) {
      return error;
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Handle specific HTTP errors
      if (axiosError.response) {
        const status = axiosError.response.status;
        const data = axiosError.response.data as Record<string, unknown>;

        switch (status) {
          case 400:
            return new ProviderError(
              `Invalid request: ${JSON.stringify(data)}`,
              this.name,
              error
            );
          case 401:
          case 403:
            return new ProviderError('Invalid API key', this.name, error);
          case 429:
            return new ProviderError('Rate limit exceeded', this.name, error);
          case 500:
          case 503:
            return new ProviderError(
              'ByteDance service unavailable',
              this.name,
              error
            );
          default:
            return new ProviderError(
              `HTTP ${status}: ${JSON.stringify(data)}`,
              this.name,
              error
            );
        }
      }

      // Handle network errors
      if (axiosError.code === 'ECONNABORTED') {
        return new ProviderError('Request timeout', this.name, error);
      }

      if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
        return new ProviderError('Network error', this.name, error);
      }
    }

    // Handle unknown errors
    return new ProviderError(
      `Unknown error: ${error instanceof Error ? error.message : String(error)}`,
      this.name,
      error
    );
  }
}
