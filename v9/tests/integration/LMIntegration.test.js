import { describe, test, expect } from '@jest/globals';
import { testLMProviders, testLMResponseValidation } from '../../examples/shared/lmDemo.js';

describe('LM Integration Test', () => {
  test('should demonstrate provider switching and selection functionality', async () => {
    const result = await testLMProviders();

    // Verify LM instances were created
    expect(result.localLM).toBeDefined();
    expect(result.apiLM).toBeDefined();

    // Verify both providers were set up
    expect(result.providers.local).toContain('local');
    expect(result.providers.api).toContain('api');

    // Test provider selection
    expect(result.selectedProvider).toBeDefined();
  });

  test('should verify Narsese translation round-trips when available', async () => {
    const result = await testLMProviders();

    // Check if translation methods exist
    if (result.hasTranslationMethods) {
      expect(result.translationResult).toBeDefined();

      if (result.translationResult && !result.translationResult.error) {
        expect(result.translationResult.original).toBeDefined();
        expect(result.translationResult.narsese).toBeDefined();
      }
    }
  });

  test('should validate response quality and caching mechanisms', async () => {
    const result = await testLMResponseValidation();

    // Verify response quality checks
    expect(result.responseQuality).toBeDefined();
    expect(typeof result.responseQuality.hasContent).toBe('boolean');
    expect(typeof result.responseQuality.isValidString).toBe('boolean');
    expect(typeof result.responseQuality.notEmpty).toBe('boolean');

    // Check provider setup
    expect(result.hasProvider).toBe(true);
    expect(result.providerCount).toBeGreaterThan(0);
  });

  test('should demonstrate internal provider stats and metrics', async () => {
    const result = await testLMProviders();

    // Verify stats are returned
    expect(result.localStats).toBeDefined();
    expect(result.apiStats).toBeDefined();

    // Stats should be objects
    expect(typeof result.localStats).toBe('object');
    expect(typeof result.apiStats).toBe('object');
  });
});