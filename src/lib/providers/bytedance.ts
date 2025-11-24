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
 * Follows old Flask system's implementation pattern exactly:
 * - Round 1: Generate main image, save returned URL
 * - Round 2: Use saved URL as context image (not base64/data URI)
 */
export class BytedanceProvider implements IImageProvider {
  public readonly name = 'bytedance';
  public readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly size: string;
  private readonly watermark: boolean;

  /**
   * Stores Round 1 generated image URL for use in Round 2
   * This is safe in sequential execution mode (like old Python system)
   * Key insight: ByteDance API works better with its own URLs than with base64
   */
  private _lastGeneratedUrl: string | null = null;

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
   * Matches old Python system exactly:
   * - Round 1 (contextImage=undefined): Generate main image, save URL
   * - Round 2 (contextImage=Buffer): Use saved URL as context (ignores buffer content)
   */
  async generate(prompt: string, contextImage?: Buffer): Promise<Buffer> {
    const startTime = Date.now();
    const isRound2 = contextImage !== undefined;

    try {
      const endpoint = `${this.baseUrl}/images/generate`;

      // Build request payload
      const payload = this.buildPayload(prompt, isRound2);

      console.log(`[ByteDance] Calling API: ${endpoint}`);
      if (isRound2) {
        console.log(`[ByteDance] Round 2 generation with context URL: ${this._lastGeneratedUrl?.substring(0, 80)}...`);
      } else {
        console.log(`[ByteDance] Round 1 generation (main image)`);
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
        // On error, clear saved URL
        this._lastGeneratedUrl = null;
        throw new ProviderError(
          `ByteDance API error: ${response.data.error.message}`,
          this.name
        );
      }

      // Extract image from response and handle URL storage
      const { imageBuffer, imageUrl } = await this.extractImageWithUrl(response.data);

      // Round 1: Save URL for Round 2
      if (!isRound2) {
        this._lastGeneratedUrl = imageUrl;
        console.log(`[ByteDance] Saved URL for Round 2`);
      } else {
        // Round 2 completed, clear URL cache
        this._lastGeneratedUrl = null;
        console.log(`[ByteDance] Round 2 completed, cleared URL cache`);
      }

      const generationTimeMs = Date.now() - startTime;
      console.log(
        `[ByteDance] Image generated successfully in ${generationTimeMs}ms`
      );

      return imageBuffer;
    } catch (error) {
      const generationTimeMs = Date.now() - startTime;
      // Clear URL on any error
      this._lastGeneratedUrl = null;
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
   * Matches old Python system's payload structure exactly:
   * - Round 1: No image parameter
   * - Round 2: Uses saved URL from Round 1 (not base64)
   */
  private buildPayload(
    prompt: string,
    isRound2: boolean
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      model: this.model,
      prompt: prompt,
      size: this.size, // 1440x2560 (9:16 ratio)
      response_format: 'url', // Get URL like old system
      watermark: this.watermark,
    };

    // Round 2: Add context image URL (matches old Python system exactly)
    if (isRound2 && this._lastGeneratedUrl) {
      // Use ByteDance's own URL from Round 1 - this is the key insight
      // ByteDance API works much better with its own URLs than with base64
      payload.image = [this._lastGeneratedUrl];
      console.log(`[ByteDance] Using saved URL as context image`);
    } else if (isRound2 && !this._lastGeneratedUrl) {
      console.warn(`[ByteDance] Round 2 requested but no saved URL available`);
      // Continue without context image - API may fail but that's expected
    }

    return payload;
  }

  /**
   * Extract image buffer and URL from ByteDance Ark API response
   * Matches old Python system: downloads from URL and returns both
   */
  private async extractImageWithUrl(response: BytedanceGenerateResponse): Promise<{
    imageBuffer: Buffer;
    imageUrl: string;
  }> {
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
      return {
        imageBuffer: Buffer.from(downloadResponse.data),
        imageUrl: imageUrl, // Return URL for Round 2 usage
      };
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
