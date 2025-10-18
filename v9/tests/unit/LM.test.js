import LM from '../../core/lm/LM.js';
import LangChainProvider from '../../core/lm/LangChainProvider.js';
import XenovaProvider from '../../core/lm/XenovaProvider.js';

describe('LM Component', () => {
  let lm;

  beforeEach(() => {
    lm = new LM();
  });

  test('registers provider and sets as default', () => {
    const provider = {
      generateText: async () => 'generated text',
      generateEmbedding: async () => [0.1, 0.2, 0.3],
      generateHypothesis: async () => 'hypothesis',
    };

    lm.initialize({ defaultProvider: 'test' });
    lm.registerProvider('test', provider);

    expect(lm.providers.defaultProviderId).toBe('test');
    expect(lm.providers.get('test')).toEqual(provider);
  });

  test('generates text using default provider', async () => {
    const provider = {
      generateText: async (prompt) => `Response to: ${prompt}`,
      generateEmbedding: async () => [0.1, 0.2, 0.3],
      generateHypothesis: async () => 'hypothesis',
    };

    lm.registerProvider('test', provider);
    lm.initialize({ defaultProvider: 'test' });

    const result = await lm.generateText('test prompt');
    expect(result).toBe('Response to: test prompt');
  });

  test('generates embedding using specified provider', async () => {
    const provider = {
      generateText: async () => 'text',
      generateEmbedding: async (text) => [`embedding for: ${text}`],
      generateHypothesis: async () => 'hypothesis',
    };

    lm.registerProvider('embedding', provider);

    const result = await lm.generateEmbedding('test text', 'embedding');
    expect(result).toEqual(['embedding for: test text']);
  });

  test('generates hypothesis', async () => {
    const provider = {
      generateText: async () => 'hypothesis text',
      generateEmbedding: async () => [0.1, 0.2, 0.3],
      generateHypothesis: async (observations) => `Hypothesis from: ${observations.join(', ')}`,
    };

    lm.registerProvider('hypothesis', provider);

    const result = await lm.generateHypothesis(['obs1', 'obs2'], {}, 'hypothesis');
    expect(result).toBe('Hypothesis from: obs1, obs2');
  });

  test('throws error if provider not found', async () => {
    await expect(lm.generateText('prompt', {}, 'nonexistent')).rejects.toThrow('Provider "nonexistent" not found or no default provider is set.');
  });

  test('throws error if hypothesis generation not supported', async () => {
    const provider = {
      generateText: async () => 'text',
      generateEmbedding: async () => [0.1, 0.2, 0.3],
    };

    lm.registerProvider('simple', provider);
    await expect(lm.generateHypothesis([], {}, 'simple')).rejects.toThrow('LM: Provider "simple" does not support hypothesis generation.');
  });

  test('integrates with LangChain provider', () => {
    const config = {
      apiKey: 'test-key',
      baseURL: 'https://test-api.com/v1',
      modelName: 'test-model',
    };

    expect(() => new LangChainProvider(config)).toBeInstanceOf(Function);
  });

  test('does not throw error for local LangChain config', () => {
    expect(() => new LangChainProvider({})).not.toThrow();
  });

  test('integrates with Xenova provider for local models', () => {
    const config = {
      modelName: 'Xenova/distilgpt2',
      temperature: 0.8,
      maxTokens: 50,
    };

    const provider = new XenovaProvider(config);
    expect(provider).toBeInstanceOf(XenovaProvider);
    expect(provider.modelName).toBe('Xenova/distilgpt2');
    expect(provider.temperature).toBe(0.8);
  });

});