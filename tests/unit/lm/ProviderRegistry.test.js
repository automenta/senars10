import {ProviderRegistry} from '../../../src/lm/ProviderRegistry.js';
import {DummyProvider} from '../../../src/lm/DummyProvider.js';

describe('ProviderRegistry', () => {
    let registry;

    beforeEach(() => {
        registry = new ProviderRegistry();
    });

    test('should initialize with empty registry', () => {
        expect(registry.size).toBe(0);
        expect(registry.getAll().size).toBe(0);
        expect(registry.defaultProviderId).toBeNull();
    });

    test('should register a provider', () => {
        const provider = new DummyProvider({id: 'test-provider'});
        registry.register('test-provider', provider);

        expect(registry.size).toBe(1);
        expect(registry.has('test-provider')).toBe(true);
        expect(registry.get('test-provider')).toBe(provider);
    });

    test('should set first provider as default', () => {
        const provider = new DummyProvider({id: 'first-provider'});
        registry.register('first-provider', provider);

        expect(registry.defaultProviderId).toBe('first-provider');
    });

    test('should allow setting a different default provider', () => {
        const provider1 = new DummyProvider({id: 'first-provider'});
        const provider2 = new DummyProvider({id: 'second-provider'});

        registry.register('first-provider', provider1);
        registry.register('second-provider', provider2);
        registry.setDefault('second-provider');

        expect(registry.defaultProviderId).toBe('second-provider');
    });

    test('should remove a provider', () => {
        const provider = new DummyProvider({id: 'test-provider'});
        registry.register('test-provider', provider);

        expect(registry.size).toBe(1);

        registry.remove('test-provider');

        expect(registry.size).toBe(0);
        expect(registry.has('test-provider')).toBe(false);
    });

    test('should handle removal of non-existent provider gracefully', () => {
        expect(() => {
            registry.remove('non-existent');
        }).not.toThrow();

        expect(registry.size).toBe(0);
    });

    test('should throw error when registering without proper parameters', () => {
        expect(() => {
            registry.register();
        }).toThrow();

        expect(() => {
            registry.register('test-id');
        }).toThrow();
    });
});