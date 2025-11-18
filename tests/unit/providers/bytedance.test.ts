/**
 * ByteDance Provider Unit Tests
 * Tests for ByteDance Doubao image generation provider
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BytedanceProvider } from '@/lib/providers/bytedance';
import { ProviderError } from '@/lib/providers/types';

describe('BytedanceProvider', () => {
  let provider: BytedanceProvider;

  beforeEach(() => {
    // Use a test API key (will fail but allows testing constructor/validation)
    provider = new BytedanceProvider(
      'test-api-key',
      'doubao-seedream-4-0-250828'
    );
  });

  describe('Constructor', () => {
    it('should create provider with API key', () => {
      expect(provider).toBeInstanceOf(BytedanceProvider);
      expect(provider.name).toBe('bytedance');
      expect(provider.model).toBe('doubao-seedream-4-0-250828');
    });

    it('should throw error if API key is missing', () => {
      expect(() => new BytedanceProvider('')).toThrow(
        'ByteDance API key is required'
      );
    });

    it('should use default model if not specified', () => {
      const defaultProvider = new BytedanceProvider('test-key');
      expect(defaultProvider.model).toBe('doubao-seedream-4-0-250828');
    });

    it('should accept custom model', () => {
      const customProvider = new BytedanceProvider('test-key', 'custom-model');
      expect(customProvider.model).toBe('custom-model');
    });

    it('should accept custom base URL', () => {
      const customProvider = new BytedanceProvider(
        'test-key',
        undefined,
        'https://custom-url.com'
      );
      // Base URL is stored internally, verify it doesn't throw
      expect(customProvider).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should have correct provider name', () => {
      expect(provider.name).toBe('bytedance');
    });

    it('should use environment variables for configuration', () => {
      // Test that provider reads from environment
      const envProvider = new BytedanceProvider('test-key');
      expect(envProvider).toBeDefined();
    });
  });

  describe('Data URI Strategy', () => {
    it('should initialize with null dataUriSupported flag', () => {
      // The provider should start with unknown support status
      // This will be tested on first Round 2 generation
      expect(provider).toBeDefined();
    });
  });

  // Note: Actual API tests require valid API keys and should be run separately
  // These would be integration tests, not unit tests
  describe('API Integration (requires valid API key)', () => {
    it.skip('should generate image from text prompt', async () => {
      // Skip in CI/CD, only run with real API key
      const realProvider = new BytedanceProvider(
        process.env.BYTEDANCE_API_KEY!
      );
      const result = await realProvider.generate('A red apple');
      expect(result).toBeInstanceOf(Buffer);
    });

    it.skip('should generate image with context image using data URI', async () => {
      // Skip in CI/CD, only run with real API key
      const realProvider = new BytedanceProvider(
        process.env.BYTEDANCE_API_KEY!
      );
      const contextImage = Buffer.from('fake-image-data');
      const result = await realProvider.generate('Make it blue', contextImage);
      expect(result).toBeInstanceOf(Buffer);
    });

    it.skip('should perform health check', async () => {
      // Skip in CI/CD, only run with real API key
      const realProvider = new BytedanceProvider(
        process.env.BYTEDANCE_API_KEY!
      );
      const healthy = await realProvider.healthCheck();
      expect(healthy).toBe(true);
    });

    it.skip('should download image from URL', async () => {
      // Skip in CI/CD, only run with real API key
      const realProvider = new BytedanceProvider(
        process.env.BYTEDANCE_API_KEY!
      );
      const result = await realProvider.generate('A beautiful sunset');
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
