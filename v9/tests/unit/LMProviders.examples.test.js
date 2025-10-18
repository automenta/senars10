import { describe, test, expect } from '@jest/globals';
import { LM } from '../../core/index.js';
import LangChainProvider from '../../core/lm/LangChainProvider.js';
import XenovaProvider from '../../core/lm/XenovaProvider.js';

const providerConfigs = {
  xenova: {
    provider: XenovaProvider,
    configs: [
      { modelName: 'Xenova/distilgpt2', temperature: 0.7, maxTokens: 50 },
      { modelName: 'Xenova/distilgpt2', temperature: 0.5, maxTokens: 100 },
      { modelName: 'Xenova/distilgpt2' }
    ]
  },
  langchain: {
    provider: LangChainProvider,
    configs: [
      { apiKey: 'test-key', baseURL: 'http://localhost:11434/v1', modelName: 'gpt-3.5-turbo', temperature: 0.7, maxTokens: 100, _testMode: true },
      { apiKey: 'test-key', baseURL: 'https://api.example.com/v1', modelName: 'test-model', temperature: 0.8, maxTokens: 200, _testMode: true },
      { apiKey: 'test-key', baseURL: 'http://localhost:11434/v1', modelName: 'test-model', _testMode: true },
      { apiKey: undefined, baseURL: 'http://localhost:11434/v1', modelName: 'test-model', _testMode: true }
    ]
  }
};

const createLM = () => new LM();

describe('LM Providers', () => {
  describe('Setup', () => {
    Object.entries(providerConfigs).forEach(([providerName, { provider, configs }]) => {
      test(`should set up ${providerName} provider correctly`, () => {
        configs.forEach(config => {
          const lm = createLM();
          expect(() => lm.registerProvider(`${providerName}-test`, new provider(config))).not.toThrow();
        });
      });
    });

    test('should handle LM instances correctly', () => {
      const lm1 = createLM();
      const lm2 = createLM();

      expect(lm1).toBeInstanceOf(LM);
      expect(lm2).toBeInstanceOf(LM);
      expect(lm1).not.toBe(lm2);
    });
  });

});