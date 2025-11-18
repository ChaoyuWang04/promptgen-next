/**
 * Provider Manager
 * Manages multiple AI image generation providers with fallback mechanism
 */

import { GeminiProvider } from './gemini';
import { BytedanceProvider } from './bytedance';
import {
  IImageProvider,
  ProviderConfig,
  GenerationResult,
  ProviderAttempt,
  ProviderHealthStatus,
  AllProvidersFailedError,
  ProviderName,
} from './types';

/**
 * Provider Manager - coordinates multiple providers with fallback
 */
export class ProviderManager {
  private providers: Map<string, IImageProvider>;
  private fallbackChain: string[];

  constructor(config: ProviderConfig) {
    this.providers = new Map();
    this.fallbackChain = config.providers
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);

    this.initializeProviders(config);
  }

  /**
   * Initialize providers based on configuration
   */
  private initializeProviders(config: ProviderConfig): void {
    // Initialize Gemini provider if configured
    if (this.fallbackChain.includes(ProviderName.GEMINI) && config.gemini) {
      try {
        const provider = new GeminiProvider(
          config.gemini.apiKey,
          config.gemini.model
        );
        this.providers.set(ProviderName.GEMINI, provider);
        console.log(
          `[ProviderManager] Initialized Gemini provider with model: ${provider.model}`
        );
      } catch (error) {
        console.error('[ProviderManager] Failed to initialize Gemini:', error);
      }
    }

    // Initialize ByteDance provider if configured
    if (
      this.fallbackChain.includes(ProviderName.BYTEDANCE) &&
      config.bytedance
    ) {
      try {
        const provider = new BytedanceProvider(
          config.bytedance.apiKey,
          config.bytedance.model
        );
        this.providers.set(ProviderName.BYTEDANCE, provider);
        console.log(
          `[ProviderManager] Initialized ByteDance provider with model: ${provider.model}`
        );
      } catch (error) {
        console.error(
          '[ProviderManager] Failed to initialize ByteDance:',
          error
        );
      }
    }

    console.log(
      `[ProviderManager] ${this.providers.size} provider(s) initialized, fallback chain: ${this.fallbackChain.join(' → ')}`
    );
  }

  /**
   * Generate image with automatic fallback to next provider on failure
   */
  async generateWithFallback(
    prompt: string,
    contextImage?: Buffer
  ): Promise<GenerationResult> {
    const attempts: ProviderAttempt[] = [];

    // Try each provider in the fallback chain
    for (const providerName of this.fallbackChain) {
      const provider = this.providers.get(providerName);

      if (!provider) {
        console.warn(
          `[ProviderManager] Provider ${providerName} not found in initialized providers, skipping`
        );
        continue;
      }

      const startTime = Date.now();

      try {
        console.log(`[ProviderManager] Attempting generation with ${providerName}...`);

        const image = await provider.generate(prompt, contextImage);
        const generationTimeMs = Date.now() - startTime;

        // Record successful attempt
        attempts.push({
          provider: providerName,
          success: true,
          attemptedAt: new Date(),
          responseTimeMs: generationTimeMs,
        });

        console.log(
          `[ProviderManager] ✅ Success with ${providerName} (${generationTimeMs}ms)`
        );

        return {
          image,
          provider: providerName,
          generationTimeMs,
        };
      } catch (error) {
        const generationTimeMs = Date.now() - startTime;

        // Record failed attempt
        attempts.push({
          provider: providerName,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          attemptedAt: new Date(),
          responseTimeMs: generationTimeMs,
        });

        console.error(
          `[ProviderManager] ❌ Failed with ${providerName} (${generationTimeMs}ms):`,
          error instanceof Error ? error.message : error
        );

        // Continue to next provider in fallback chain
        continue;
      }
    }

    // All providers failed
    throw new AllProvidersFailedError(
      `All ${attempts.length} provider(s) failed: ${attempts
        .map((a) => `${a.provider}: ${a.error || 'unknown error'}`)
        .join('; ')}`,
      attempts
    );
  }

  /**
   * Generate image using a specific provider (no fallback)
   * Used in Round 2 to ensure same provider is used as Round 1
   */
  async generateWithProvider(
    providerName: string,
    prompt: string,
    contextImage?: Buffer
  ): Promise<Buffer> {
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(
        `Provider ${providerName} not found. Available: ${Array.from(this.providers.keys()).join(', ')}`
      );
    }

    console.log(
      `[ProviderManager] Generating with specific provider: ${providerName}`
    );

    return provider.generate(prompt, contextImage);
  }

  /**
   * Get a specific provider instance
   */
  getProvider(providerName: string): IImageProvider | undefined {
    return this.providers.get(providerName);
  }

  /**
   * Get all available provider names
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check health of all providers
   */
  async checkHealthAll(): Promise<ProviderHealthStatus[]> {
    const healthChecks: Promise<ProviderHealthStatus>[] = [];

    for (const [name, provider] of this.providers) {
      healthChecks.push(
        (async () => {
          try {
            const healthy = await provider.healthCheck();
            return {
              name,
              healthy,
              lastChecked: new Date(),
            };
          } catch (error) {
            return {
              name,
              healthy: false,
              lastChecked: new Date(),
              error: error instanceof Error ? error.message : String(error),
            };
          }
        })()
      );
    }

    return Promise.all(healthChecks);
  }

  /**
   * Check if any provider is healthy
   */
  async isAnyProviderHealthy(): Promise<boolean> {
    const statuses = await this.checkHealthAll();
    return statuses.some((status) => status.healthy);
  }

  /**
   * Get provider statistics summary
   */
  getProvidersSummary(): {
    total: number;
    available: string[];
    fallbackChain: string[];
  } {
    return {
      total: this.providers.size,
      available: Array.from(this.providers.keys()),
      fallbackChain: this.fallbackChain,
    };
  }
}

/**
 * Create ProviderManager from environment variables
 */
export function createProviderManagerFromEnv(): ProviderManager {
  const config: ProviderConfig = {
    providers: process.env.IMAGE_PROVIDERS || 'gemini,bytedance',
    gemini: process.env.GEMINI_API_KEY
      ? {
          apiKey: process.env.GEMINI_API_KEY,
          model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-image',
        }
      : undefined,
    bytedance: process.env.BYTEDANCE_API_KEY
      ? {
          apiKey: process.env.BYTEDANCE_API_KEY,
          model:
            process.env.BYTEDANCE_MODEL || 'doubao-seedream-4-0-250828',
        }
      : undefined,
  };

  return new ProviderManager(config);
}
