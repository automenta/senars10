import {LM} from '../../../src/lm/LM.js';
import {DummyProvider} from '../../../src/lm/DummyProvider.js';

describe('LM', () => {
    let lm;

    beforeEach(async () => {
        lm = new LM();
        await lm.initialize();

        // Register a test provider for tests that need it
        const provider = new DummyProvider({id: 'test-provider'});
        lm.registerProvider('test-provider', provider);
    });

    test('should initialize with default properties', () => {
        expect(lm.providers).toBeDefined();
        expect(lm.modelSelector).toBeDefined();
        expect(lm.narseseTranslator).toBeDefined();
        expect(lm.metrics).toBeDefined();
        expect(lm.activeWorkflows).toBeDefined();
        expect(lm.config).toEqual({});
        expect(lm.lmStats).toBeDefined();
    });

    test('should register a provider', () => {
        const provider = new DummyProvider({id: 'test-provider'});
        lm.registerProvider('additional-provider', provider);

        expect(lm.providers.has('additional-provider')).toBe(true);
        expect(lm.providers.get('additional-provider')).toBe(provider);
    });

    test('should get metrics', () => {
        const metrics = lm.getMetrics();
        expect(metrics.providerCount).toBe(1); // One provider registered in beforeEach
        expect(metrics.lmStats).toBeDefined();
        expect(metrics.providerUsage).toBeDefined();
    });

    test('should handle generateText when provider exists', async () => {
        const provider = new DummyProvider({id: 'test-provider', responseTemplate: 'Generated: {prompt}'});
        lm.registerProvider('test-provider', provider);

        const result = await lm.generateText('Hello, world!', {}, 'test-provider');
        expect(result).toBe('Generated: Hello, world!');
    });

    test('should throw error when provider does not exist', async () => {
        await expect(lm.generateText('Hello', {}, 'non-existent')).rejects.toThrow();
    });

    test('should handle generateEmbedding when provider exists', async () => {
        const provider = new DummyProvider({id: 'embedding-provider'});
        lm.registerProvider('embedding-provider', provider);

        const result = await lm.generateEmbedding('Hello, world!', 'embedding-provider');
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(16); // 16-dimensions as defined in DummyProvider
    });

    test('should process text with provider', async () => {
        const provider = new DummyProvider({id: 'test-provider', responseTemplate: 'Processed: {prompt}'});
        lm.registerProvider('test-provider', provider);

        const result = await lm.process('Hello, world!', {}, 'test-provider');
        expect(result).toBe('Processed: Hello, world!');
    });

    test('should translate to Narsese', () => {
        const result = lm.translateToNarsese('cat is a mammal');
        // Use flexible assertion since translation might have variations
        expect(result).toContain('cat');
        expect(result).toContain('-->');
    });

    test('should translate from Narsese', () => {
        const result = lm.translateFromNarsese('(dog --> animal).');
        // Use flexible assertion since translation might have variations
        expect(result).toContain('dog');
        expect(result).toContain('animal');
    });

    test('should select optimal model', () => {
        const task = {type: 'test'};
        const result = lm.selectOptimalModel(task);
        // Since we have a provider registered in beforeEach, it should return the first provider
        expect(result).toBe('test-provider');
    });

    test('should get available models', () => {
        const models = lm.getAvailableModels();
        expect(Array.isArray(models)).toBe(true);
        expect(models.length).toBe(1); // One provider registered in beforeEach
    });

    test('should count tokens correctly', () => {
        expect(lm._countTokens('hello world')).toBe(2);
        expect(lm._countTokens('')).toBe(0);
        expect(lm._countTokens(null)).toBe(0);
        expect(lm._countTokens('hello  world')).toBe(2); // multiple spaces
    });
});