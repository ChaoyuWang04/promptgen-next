/**
 * Google Gemini Image Generation Provider
 * Uses REST API for image generation with Gemini 2.5 Flash Image model
 */

import axios, { AxiosError } from 'axios';
import {
  IImageProvider,
  ProviderError,
  PROVIDER_TIMEOUT,
  DEFAULT_MODELS,
} from './types';

/**
 * Gemini API response structure for image generation
 */
interface GeminiGenerateContentResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string; // Base64 encoded image
        };
      }>;
    };
    finishReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    blockReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  };
}

/**
 * Google Gemini Provider implementation
 * Matches old Python system's configuration
 */
export class GeminiProvider implements IImageProvider {
  public readonly name = 'gemini';
  public readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private readonly aspectRatio: string;

  constructor(apiKey: string, model?: string, aspectRatio?: string) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.apiKey = apiKey;
    this.model = model || DEFAULT_MODELS.GEMINI;
    this.aspectRatio = aspectRatio || process.env.GEMINI_ASPECT_RATIO || '9:16';
  }

  /**
   * Generate an image using Gemini API
   */
  async generate(prompt: string, contextImage?: Buffer): Promise<Buffer> {
    const startTime = Date.now();

    try {
      const endpoint = `${this.baseUrl}/models/${this.model}:generateContent`;

      // Build request payload
      const payload = this.buildPayload(prompt, contextImage);

      // Make API request
      const response = await axios.post<GeminiGenerateContentResponse>(
        endpoint,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          timeout: PROVIDER_TIMEOUT.GEMINI,
        }
      );

      // Extract image from response
      const imageBuffer = this.extractImage(response.data);

      const generationTimeMs = Date.now() - startTime;
      console.log(
        `[Gemini] Image generated successfully in ${generationTimeMs}ms`
      );

      return imageBuffer;
    } catch (error) {
      const generationTimeMs = Date.now() - startTime;
      console.error(
        `[Gemini] Generation failed after ${generationTimeMs}ms:`,
        error
      );

      throw this.handleError(error);
    }
  }

  /**
   * Check if Gemini API is accessible and healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Use a minimal request to check API availability
      const endpoint = `${this.baseUrl}/models/${this.model}`;

      const response = await axios.get(endpoint, {
        headers: {
          'x-goog-api-key': this.apiKey,
        },
        timeout: PROVIDER_TIMEOUT.HEALTH_CHECK,
      });

      // Check if model exists and is available
      return response.status === 200;
    } catch (error) {
      console.error('[Gemini] Health check failed:', error);
      return false;
    }
  }

  /**
   * Build request payload for Gemini API
   * Matches old Python system's configuration
   */
  private buildPayload(
    prompt: string,
    contextImage?: Buffer
  ): Record<string, unknown> {
    const parts: Array<{
      text?: string;
      inlineData?: { mimeType: string; data: string };
    }> = [];

    // Add text prompt
    parts.push({ text: prompt });

    // Add context image if provided (for diff generation)
    if (contextImage) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: contextImage.toString('base64'),
        },
      });
    }

    return {
      contents: [
        {
          parts,
        },
      ],
      generationConfig: {
        temperature: 1.0,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseModalities: ['image'],
      },
      // TODO: Verify correct REST API format for aspect_ratio
      // Python SDK uses: ImageConfig(aspect_ratio='9:16')
      // REST API format may differ - needs testing
      imageConfig: {
        aspectRatio: this.aspectRatio, // e.g., '9:16'
      },
    };
  }

  /**
   * Extract image buffer from Gemini API response
   */
  private extractImage(response: GeminiGenerateContentResponse): Buffer {
    // Check for prompt feedback (safety blocks)
    if (response.promptFeedback?.blockReason) {
      throw new ProviderError(
        `Content blocked: ${response.promptFeedback.blockReason}`,
        this.name
      );
    }

    // Check for candidates
    if (!response.candidates || response.candidates.length === 0) {
      throw new ProviderError('No candidates returned from Gemini', this.name);
    }

    const candidate = response.candidates[0];

    // Check finish reason
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      throw new ProviderError(
        `Generation stopped: ${candidate.finishReason}`,
        this.name
      );
    }

    // Find image data in response parts
    const imagePart = candidate.content.parts.find(
      (part) => part.inlineData?.mimeType?.startsWith('image/')
    );

    if (!imagePart || !imagePart.inlineData) {
      throw new ProviderError('No image data in response', this.name);
    }

    // Decode base64 image
    try {
      return Buffer.from(imagePart.inlineData.data, 'base64');
    } catch (error) {
      throw new ProviderError(
        'Failed to decode image data',
        this.name,
        error
      );
    }
  }

  /**
   * Handle and normalize errors from Gemini API
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
              'Gemini service unavailable',
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
