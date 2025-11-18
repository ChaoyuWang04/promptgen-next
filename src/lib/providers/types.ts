/**
 * Provider Types and Interfaces
 * Defines the contract for AI image generation providers (Gemini, ByteDance, etc.)
 */

/**
 * Core provider interface that all image generation providers must implement
 */
export interface IImageProvider {
  /**
   * Generate an image from a text prompt
   * @param prompt - Text prompt in English for image generation
   * @param contextImage - Optional context image (used for diff generation)
   * @returns Promise resolving to image buffer
   * @throws ProviderError if generation fails
   */
  generate(prompt: string, contextImage?: Buffer): Promise<Buffer>;

  /**
   * Check if the provider is healthy and accessible
   * @returns Promise resolving to true if healthy, false otherwise
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get the provider name
   */
  readonly name: string;

  /**
   * Get the model identifier being used
   */
  readonly model: string;
}

/**
 * Provider configuration from environment variables
 */
export interface ProviderConfig {
  /**
   * Comma-separated list of enabled providers (e.g., "gemini,bytedance")
   */
  providers: string;

  /**
   * Gemini API configuration
   */
  gemini?: {
    apiKey: string;
    model: string; // Default: "gemini-2.5-flash-image"
  };

  /**
   * ByteDance API configuration
   */
  bytedance?: {
    apiKey: string;
    model: string; // Default: "doubao-seedream-4-0-250828"
  };
}

/**
 * Provider attempt record for database logging
 */
export interface ProviderAttempt {
  /**
   * Provider name that was attempted
   */
  provider: string;

  /**
   * Whether the attempt was successful
   */
  success: boolean;

  /**
   * Error message if attempt failed
   */
  error?: string;

  /**
   * Timestamp of the attempt
   */
  attemptedAt: Date;

  /**
   * Response time in milliseconds
   */
  responseTimeMs?: number;
}

/**
 * Result of a successful image generation with provider information
 */
export interface GenerationResult {
  /**
   * Generated image as buffer
   */
  image: Buffer;

  /**
   * Provider name that generated the image
   */
  provider: string;

  /**
   * Generation time in milliseconds
   */
  generationTimeMs: number;
}

/**
 * Provider health status
 */
export interface ProviderHealthStatus {
  /**
   * Provider name
   */
  name: string;

  /**
   * Whether the provider is healthy
   */
  healthy: boolean;

  /**
   * Last check timestamp
   */
  lastChecked: Date;

  /**
   * Error message if unhealthy
   */
  error?: string;
}

/**
 * Custom error class for provider-specific errors
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'ProviderError';
    Object.setPrototypeOf(this, ProviderError.prototype);
  }
}

/**
 * Error thrown when all providers in the fallback chain fail
 */
export class AllProvidersFailedError extends Error {
  constructor(
    message: string,
    public readonly attempts: ProviderAttempt[]
  ) {
    super(message);
    this.name = 'AllProvidersFailedError';
    Object.setPrototypeOf(this, AllProvidersFailedError.prototype);
  }
}

/**
 * Provider names enum for type safety
 */
export enum ProviderName {
  GEMINI = 'gemini',
  BYTEDANCE = 'bytedance',
}

/**
 * Provider timeout configuration (in milliseconds)
 */
export const PROVIDER_TIMEOUT = {
  GEMINI: 60000, // 60 seconds
  BYTEDANCE: 60000, // 60 seconds
  HEALTH_CHECK: 10000, // 10 seconds
} as const;

/**
 * Maximum retry attempts per provider
 */
export const MAX_RETRY_ATTEMPTS = 1;

/**
 * Default models for each provider
 */
export const DEFAULT_MODELS = {
  GEMINI: 'gemini-2.5-flash-image',
  BYTEDANCE: 'doubao-seedream-4-0-250828',
} as const;
