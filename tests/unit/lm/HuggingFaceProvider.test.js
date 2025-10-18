/**
 * @file tests/unit/lm/HuggingFaceProvider.test.js
 * @description Unit tests for HuggingFaceProvider
 */

import { HuggingFaceProvider } from '../../../src/lm/HuggingFaceProvider.js';

describe('HuggingFaceProvider', () => {
  test('should initialize with correct configuration', () => {
    const provider = new HuggingFaceProvider({
      modelName: 'sshleifer/distilbart-cnn-12-6',
      temperature: 0.7,
      maxTokens: 100
    });
    
    expect(provider.modelName).toBe('sshleifer/distilbart-cnn-12-6');
    expect(provider.temperature).toBe(0.7);
    expect(provider.maxTokens).toBe(100);
    expect(provider.modelType).toBe('generic');
  });

  test('should initialize MobileBERT model type', () => {
    const mobileProvider = new HuggingFaceProvider({
      modelName: 'MobileBERT/mobilebert-uncased'
    });
    expect(mobileProvider.modelType).toBe('mobilebert');
  });

  test('should initialize SmolLM model type', () => {
    const smolProvider = new HuggingFaceProvider({
      modelName: 'HuggingFaceTB/SmolLM-135M'
    });
    expect(smolProvider.modelType).toBe('smollm');
  });

  test('should return model name', () => {
    const provider = new HuggingFaceProvider({
      modelName: 'sshleifer/distilbart-cnn-12-6',
      temperature: 0.7,
      maxTokens: 100
    });
    expect(provider.getModelName()).toBe('sshleifer/distilbart-cnn-12-6');
  });

  test('should have default values when not specified', () => {
    const provider = new HuggingFaceProvider({});
    
    // Test that default values are properly set
    expect(provider.modelName).toBeDefined();
    expect(provider.temperature).toBeDefined();
    expect(provider.maxTokens).toBeDefined();
  });
});