import {ModelSelector} from '../../../src/core/lm/ModelSelector.js';
import {ProviderRegistry} from '../../../src/core/lm/ProviderRegistry.js';
import {DummyProvider} from '../../../src/core/lm/DummyProvider.js';

describe('ModelSelector', () => {
    let registry;
    let selector;

    beforeEach(() => {
        registry = new ProviderRegistry();
        registry.register('model1', new DummyProvider({id: 'model1'}));
        registry.register('model2', new DummyProvider({id: 'model2'}));
        selector = new ModelSelector(registry);
    });

    test('should initialize with provider registry reference', () => {
        expect(selector.providerRegistry).toBe(registry);
        expect(selector.cache).toBeDefined();
    });

    test('should select default provider when no constraints', () => {
        const selected = selector.select({type: 'test'});
        expect(selected).toBe('model1'); // First available or default
    });

    test('should get available models', () => {
        const models = selector.getAvailableModels();
        expect(models).toEqual(['model1', 'model2']);
    });

    test('should cache results for same input', () => {
        const task = {type: 'test'};
        const constraints = {performance: 'high'};

        const firstResult = selector.select(task, constraints);
        const cachedResult = selector.select(task, constraints);

        expect(firstResult).toBe(cachedResult);
    });

    test('should clear cache', () => {
        selector.select({type: 'test'}, {performance: 'high'});
        expect(selector.cache.size).toBe(1);

        selector.clearCache();
        expect(selector.cache.size).toBe(0);
    });

    test('should handle task without type', () => {
        const selected = selector.select({}); // No type property
        expect(selected).toBeDefined();
    });
});