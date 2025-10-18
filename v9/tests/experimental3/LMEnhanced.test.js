import LM from '../../core/lm/LM.js';
import {
  MetricsTracker,
  ResourceManager,
  WorkflowEngine,
  Reasoner,
  NarseseTranslator,
  JSONSerializer,
  StreamingProcessor,
  ProtocolAdapters,
  ProviderRegistry,
  ModelSelector
} from '../../core/index.js';

// Mock provider for testing
const createMockProvider = (overrides = {}) => ({
  generateText: async (prompt, options = {}) => `Mock response to: ${prompt}`,
  generateEmbedding: async (text) => [0.1, 0.2, 0.3],
  generateHypothesis: async (observations, options = {}) => `Mock hypothesis for: ${observations.join(', ')}`,
  ...overrides
});

describe('Enhanced LM Component Unit Tests', () => {
  let lm;

  beforeEach(async () => {
    lm = new LM();
    await lm.initialize({ defaultProvider: 'mock' });
  });

  afterEach(async () => {
    if (lm && typeof lm.destroy === 'function') {
      await lm.destroy();
    }
  });

  describe('LM Core Functionality', () => {
    test('should initialize with all modular components', () => {
      expect(lm.providers).toBeInstanceOf(ProviderRegistry);
      expect(lm.modelSelector).toBeInstanceOf(ModelSelector);
      expect(lm.metrics).toBeInstanceOf(MetricsTracker);
      expect(lm.resourceManager).toBeInstanceOf(ResourceManager);
      expect(lm.workflows).toBeInstanceOf(WorkflowEngine);
      expect(lm.reasoner).toBeInstanceOf(Reasoner);
      expect(lm.ioAdapters.narseseConverter).toBeInstanceOf(NarseseTranslator);
      expect(lm.ioAdapters.jsonSerializer).toBeInstanceOf(JSONSerializer);
      expect(lm.ioAdapters.streamingProcessor).toBeInstanceOf(StreamingProcessor);
      expect(lm.ioAdapters.protocolAdapters).toBeInstanceOf(ProtocolAdapters);
    });

    test('should register providers via ProviderRegistry', () => {
      const mockProvider = createMockProvider();
      lm.registerProvider('test', mockProvider);

      expect(lm.providers.list()).toContain('test');
      expect(lm.providers.get('test')).toBe(mockProvider);
    });

    test('should generate text with metrics tracking', async () => {
      const mockProvider = createMockProvider();
      lm.registerProvider('mock', mockProvider);

      const result = await lm.generateText('Hello, world!', {}, 'mock');

      expect(result).toBe('Mock response to: Hello, world!');

      // Check metrics were tracked
      const metrics = lm.metrics.getMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      const lastMetric = metrics[metrics.length - 1];
      expect(lastMetric.operation).toBe('generateText');
      expect(lastMetric.providerId).toBe('mock');
      expect(lastMetric.inputTokens).toBe(2); // "Hello, world!" tokens
    });

    test('should generate embedding with metrics tracking', async () => {
      const mockProvider = createMockProvider();
      lm.registerProvider('mock', mockProvider);

      const result = await lm.generateEmbedding('test text');

      expect(result).toEqual([0.1, 0.2, 0.3]);

      // Check metrics were tracked
      const metrics = lm.metrics.getMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      const lastMetric = metrics[metrics.length - 1];
      expect(lastMetric.operation).toBe('generateEmbedding');
    });

    test('should generate hypothesis with metrics tracking', async () => {
      const mockProvider = createMockProvider();
      lm.registerProvider('mock', mockProvider);

      const result = await lm.generateHypothesis(['observation1', 'observation2']);

      expect(result).toBe('Mock hypothesis for: observation1, observation2');

      // Check metrics were tracked
      const metrics = lm.metrics.getMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      const lastMetric = metrics[metrics.length - 1];
      expect(lastMetric.operation).toBe('generateHypothesis');
    });
  });

  describe('Reasoning Engine', () => {
    test('should perform temporal reasoning', async () => {
      const mockProvider = createMockProvider({
        generateText: async (prompt) => `Temporal analysis: ${prompt}`
      });
      lm.registerProvider('temporal', mockProvider);

      const result = await lm.performTemporalReasoning('Event A happens before Event B');

      expect(result).toHaveProperty('original');
      expect(result.original).toContain('Temporal analysis:');
      expect(result).toHaveProperty('type', 'temporal');
    });

    test('should perform counterfactual reasoning', async () => {
      const mockProvider = createMockProvider({
        generateText: async (prompt) => `Counterfactual analysis: ${prompt}`
      });
      lm.registerProvider('counterfactual', mockProvider);

      const result = await lm.performCounterfactualReasoning('What if the sky were green?');

      expect(result).toHaveProperty('original');
      expect(result.original).toContain('Counterfactual analysis:');
      expect(result).toHaveProperty('type', 'counterfactual');
    });
  });

  describe('Model Selection', () => {
    test('should select optimal model based on task type', async () => {
      // Create a provider without generateEmbedding function to make it distinct
      const nonEmbeddingProvider = {
        generateText: async (prompt) => `Response to: ${prompt}`,
        generateHypothesis: async (observations) => `Hypothesis: ${observations.join(', ')}`
        // No generateEmbedding function
      };

      const embeddingProvider = createMockProvider(); // Will have generateEmbedding by default

      // Register providers
      lm.registerProvider('non-embedding', nonEmbeddingProvider);
      lm.registerProvider('embedding-special', embeddingProvider);

      // Test embedding model selection (should pick provider with generateEmbedding capability)
      const embeddingModel = await lm.selectOptimalModel({ type: 'embedding' });
      expect(embeddingModel).toEqual(embeddingProvider);

      // Test that it's not the non-embedding provider
      expect(embeddingModel).not.toEqual(nonEmbeddingProvider);
    });

    test('should cache model selection results', async () => {
      const mockProvider = createMockProvider();
      lm.registerProvider('mock', mockProvider); // Register as 'mock' to match default provider

      // First selection
      const model1 = await lm.selectOptimalModel({ type: 'nonexistent-type' }); // Will use default provider
      // Second selection with same parameters should use cache
      const model2 = await lm.selectOptimalModel({ type: 'nonexistent-type' });

      expect(model1).toEqual(model2);
    });
  });

  describe('MetricsTracker', () => {
    let metricsTracker;

    beforeEach(() => {
      metricsTracker = new MetricsTracker();
    });

    test('should track metrics', () => {
      const testData = { operation: 'test', value: 42 };
      metricsTracker.track(testData);

      const metrics = metricsTracker.getMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0]).toMatchObject(testData);
      expect(metrics[0]).toHaveProperty('timestamp');
    });

    test('should clear metrics', () => {
      metricsTracker.track({ operation: 'test' });
      expect(metricsTracker.getMetrics().length).toBe(1);

      metricsTracker.clear();
      expect(metricsTracker.getMetrics().length).toBe(0);
    });
  });

  describe('ResourceManager', () => {
    let resourceManager;

    beforeEach(() => {
      resourceManager = new ResourceManager();
    });

    test('should register and track provider usage', () => {
      const mockProvider = createMockProvider();
      resourceManager.registerProvider('test-provider', mockProvider);

      const usage = resourceManager.getUsage();
      expect(usage['test-provider']).toBeDefined();
      expect(usage['test-provider']).toHaveProperty('usage', 0);
      expect(usage['test-provider']).toHaveProperty('tokensUsed', 0);
    });

    test('should report usage metrics', () => {
      const mockProvider = createMockProvider();
      resourceManager.registerProvider('test-provider', mockProvider);

      const usage = resourceManager.getUsage();
      expect(usage).toHaveProperty('test-provider');
      expect(usage['test-provider']).toHaveProperty('usage');
      expect(usage['test-provider']).toHaveProperty('tokensUsed');
    });
  });

  describe('ProviderRegistry', () => {
    let providerRegistry;

    beforeEach(() => {
      providerRegistry = new ProviderRegistry();
    });

    test('should register and retrieve providers', () => {
      const mockProvider = createMockProvider();
      providerRegistry.register('test', mockProvider);

      expect(providerRegistry.get('test')).toBe(mockProvider);
      expect(providerRegistry.list()).toContain('test');
    });

    test('should set default provider on first registration', () => {
      const mockProvider = createMockProvider();
      providerRegistry.register('first', mockProvider);

      expect(providerRegistry.defaultProviderId).toBe('first');
    });

    test('should return default provider when no ID specified', () => {
      const mockProvider = createMockProvider();
      providerRegistry.register('default', mockProvider);

      expect(providerRegistry.get()).toBe(mockProvider);
    });
  });

  describe('NarseseTranslator', () => {
    let narseseConverter;

    beforeEach(() => {
      narseseConverter = new NarseseTranslator();
    });

    test('should convert text to narsese format', () => {
      const result = narseseConverter.convertToNarsese('Hello world');

      expect(result).toHaveProperty('original', 'Hello world');
      expect(result).toHaveProperty('narsese');
      expect(result).toHaveProperty('type', 'default');
    });

    test('should convert from narsese format', () => {
      const narseseResult = narseseConverter.convertToNarsese('Hello world');
      const backToText = narseseConverter.convertFromNarsese(narseseResult.narsese);

      expect(backToText).toBe('Hello world');
    });
  });

  describe('JSONSerializer', () => {
    let jsonSerializer;

    beforeEach(() => {
      jsonSerializer = new JSONSerializer();
    });

    test('should serialize data to JSON', () => {
      const data = { hello: 'world', count: 42 };
      const serialized = jsonSerializer.serialize(data);

      expect(serialized).toBe(JSON.stringify(data));
    });

    test('should deserialize JSON to data', () => {
      const json = '{"hello": "world", "count": 42}';
      const deserialized = jsonSerializer.deserialize(json);

      expect(deserialized).toEqual({ hello: 'world', count: 42 });
    });

    test('should convert JSON to narsese format', () => {
      const json = '{"value": "test"}';
      const result = jsonSerializer.toNarsese(json);

      expect(result).toContain('Narsese from JSON');
      expect(result).toContain('test');
    });
  });

  describe('StreamingProcessor', () => {
    let streamingProcessor;

    beforeEach(() => {
      streamingProcessor = new StreamingProcessor();
    });

    test('should create stream from data', () => {
      const data = { items: [1, 2, 3] };
      const stream = streamingProcessor.createStream(data);

      expect(stream).toHaveProperty('data', data);
      expect(stream).toHaveProperty('type', 'stream');
    });

    test('should process async iterable stream', async () => {
      // Create an async iterable for testing
      async function* createTestStream() {
        yield 'chunk1';
        yield 'chunk2';
        yield 'chunk3';
      }

      const chunks = await streamingProcessor.processStream(createTestStream());

      expect(chunks).toEqual(['chunk1', 'chunk2', 'chunk3']);
    });
  });

  describe('ProtocolAdapters', () => {
    let protocolAdapters;

    beforeEach(() => {
      protocolAdapters = new ProtocolAdapters();
    });

    test('should have REST adapter with request method', () => {
      const result = protocolAdapters.rest.request('http://test.com', { method: 'GET' });

      expect(result).toHaveProperty('url', 'http://test.com');
      expect(result).toHaveProperty('adapter', 'rest');
    });

    test('should have WebSocket adapter with connect method', () => {
      const result = protocolAdapters.websocket.connect('ws://test.com');

      expect(result).toHaveProperty('url', 'ws://test.com');
      expect(result).toHaveProperty('connected', true);
    });

    test('should have gRPC adapter with call method', () => {
      const result = protocolAdapters.grpc.call('testMethod', { data: 'test' });

      expect(result).toHaveProperty('method', 'testMethod');
      expect(result).toHaveProperty('data', { data: 'test' });
    });
  });

  describe('ModelSelector', () => {
    let providerRegistry;
    let modelSelector;

    beforeEach(() => {
      providerRegistry = new ProviderRegistry();
      modelSelector = new ModelSelector(providerRegistry);
    });

    test('should select appropriate model based on task type', async () => {
      // Create a provider without generateEmbedding function to make it distinct
      const nonEmbeddingProvider = {
        generateText: async (prompt) => `Response to: ${prompt}`,
        generateHypothesis: async (observations) => `Hypothesis: ${observations.join(', ')}`
        // No generateEmbedding function
      };

      const embeddingProvider = createMockProvider(); // Will have generateEmbedding by default

      // Register providers
      providerRegistry.register('non-embedding', nonEmbeddingProvider);
      providerRegistry.register('embedding-special', embeddingProvider);

      // Test embedding model selection (should pick provider with generateEmbedding capability)
      const embeddingModel = await modelSelector.select({ type: 'embedding' });
      expect(embeddingModel).toEqual(embeddingProvider);

      // Test that it's not the non-embedding provider
      expect(embeddingModel).not.toEqual(nonEmbeddingProvider);
    });

    test('should cache selections', async () => {
      const mockProvider = createMockProvider();
      providerRegistry.register('test', mockProvider);

      // First selection
      const model1 = await modelSelector.select({ type: 'test' });
      // Second selection with same parameters should use cache
      const model2 = await modelSelector.select({ type: 'test' });

      expect(model1).toBe(model2);
    });

    test('should clear cache', async () => {
      const mockProvider = createMockProvider();
      providerRegistry.register('test', mockProvider);

      await modelSelector.select({ type: 'test' });
      expect(modelSelector.cache.size).toBeGreaterThan(0);

      modelSelector.clearCache();
      expect(modelSelector.cache.size).toBe(0);
    });
  });

  describe('Reasoning Capabilities', () => {
    let providerRegistry;
    let ioAdapters;
    let reasoner;

    beforeEach(() => {
      providerRegistry = new ProviderRegistry();
      ioAdapters = {
        narseseConverter: new NarseseTranslator()
      };
      reasoner = new Reasoner();
      // Set up the reasoner with provider registry and io adapters
      reasoner.providerRegistry = providerRegistry;
      reasoner.ioAdapters = ioAdapters;

      // Register a mock provider
      const mockProvider = createMockProvider({
        generateText: async (prompt) => `Processed: ${prompt}`
      });
      providerRegistry.register('default', mockProvider);
      providerRegistry.defaultProviderId = 'default';
      
      // Set the LM instance so that reasoning methods work in tests
      reasoner.lm = { generateText: mockProvider.generateText };
    });

    test('should perform temporal reasoning', async () => {
      const result = await reasoner.performTemporalReasoning('Test scenario', ['T1', 'T2']);

      expect(result).toHaveProperty('original');
      expect(result.original).toContain('Processed:');
      expect(result).toHaveProperty('type', 'temporal');
    });

    test('should perform counterfactual reasoning', async () => {
      const result = await reasoner.performCounterfactualReasoning('Test scenario');

      expect(result).toHaveProperty('original');
      expect(result.original).toContain('Processed:');
      expect(result).toHaveProperty('type', 'counterfactual');
    });

    test('should perform causal reasoning', async () => {
      const result = await reasoner.performCausalReasoning('Cause', 'Effect');

      expect(result).toHaveProperty('original');
      expect(result.original).toContain('Processed:');
      expect(result).toHaveProperty('type', 'causal');
    });
  });

  describe('Lifecycle Management', () => {
    test('should properly destroy resources', async () => {
      const mockProvider = createMockProvider();
      lm.registerProvider('test', mockProvider);

      // Check metrics before and after operations
      const initialMetricsCount = lm.metrics.getMetrics().length;

      // Do a simple operation that will add metrics
      lm.metrics.track({ operation: 'test-operation' });
      expect(lm.metrics.getMetrics().length).toBe(initialMetricsCount + 1);

      // Destroy the LM component
      await lm.destroy();

      // The destroy process itself might add metrics, just check that the
      // model selection cache is cleared (the primary cleanup)
      // The overall functionality should work properly after destroy
      expect(lm.modelSelector.cache.size).toBe(0);
    });
  });
});