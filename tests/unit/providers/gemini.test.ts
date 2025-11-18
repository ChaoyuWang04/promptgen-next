/**
 * Gemini Provider Unit Tests
 * Tests for Google Gemini image generation provider
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GeminiProvider } from '@/lib/providers/gemini';
import { ProviderError } from '@/lib/providers/types';

describe('GeminiProvider', () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    // Use a test API key (will fail but allows testing constructor/validation)
    provider = new GeminiProvider('test-api-key', 'gemini-2.5-flash-image');
  });

  describe('Constructor', () => {
    it('should create provider with API key', () => {
      expect(provider).toBeInstanceOf(GeminiProvider);
      expect(provider.name).toBe('gemini');
      expect(provider.model).toBe('gemini-2.5-flash-image');
    });

    it('should throw error if API key is missing', () => {
      expect(() => new GeminiProvider('')).toThrow('Gemini API key is required');
    });

    it('should use default model if not specified', () => {
      const defaultProvider = new GeminiProvider('test-key');
      expect(defaultProvider.model).toBe('gemini-2.5-flash-image');
    });

    it('should accept custom model', () => {
      const customProvider = new GeminiProvider('test-key', 'custom-model');
      expect(customProvider.model).toBe('custom-model');
    });
  });

  describe('Configuration', () => {
    it('should have correct provider name', () => {
      expect(provider.name).toBe('gemini');
    });

    it('should accept aspect ratio configuration', () => {
      const providerWithRatio = new GeminiProvider(
        'test-key',
        'gemini-2.5-flash-image',
        '16:9'
      );
      // Aspect ratio is stored internally, verify it doesn't throw
      expect(providerWithRatio).toBeDefined();
    });
  });

  // Note: Actual API tests require valid API keys and should be run separately
  // These would be integration tests, not unit tests
  describe('API Integration (requires valid API key)', () => {
    it.skip('should generate image from text prompt', async () => {
      // Skip in CI/CD, only run with real API key
      const realProvider = new GeminiProvider(process.env.GEMINI_API_KEY!);
      const result = await realProvider.generate('A red apple');
      expect(result).toBeInstanceOf(Buffer);
    });

    it.skip('should generate image with context image', async () => {
      // Skip in CI/CD, only run with real API key
      const realProvider = new GeminiProvider(process.env.GEMINI_API_KEY!);
      const contextImage = Buffer.from('fake-image-data');
      const result = await realProvider.generate('Make it blue', contextImage);
      expect(result).toBeInstanceOf(Buffer);
    });

    it.skip('should perform health check', async () => {
      // Skip in CI/CD, only run with real API key
      const realProvider = new GeminiProvider(process.env.GEMINI_API_KEY!);
      const healthy = await realProvider.healthCheck();
      expect(healthy).toBe(true);
    });
  });
});
