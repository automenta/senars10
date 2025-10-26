import {NAR} from '../../../src/nar/NAR.js';
import {DummyProvider} from '../../../src/lm/DummyProvider.js';

describe('LM Integration Tests', () => {
    test('NAR should initialize with LM when enabled in config', () => {
        const config = {
            lm: {enabled: true}
        };

        const nar = new NAR(config);

        expect(nar.lm).toBeDefined();
        expect(typeof nar.registerLMProvider).toBe('function');
        expect(typeof nar.generateWithLM).toBe('function');
        expect(typeof nar.translateToNarsese).toBe('function');
        expect(typeof nar.translateFromNarsese).toBe('function');
    });

    test('NAR should work without LM when disabled in config', () => {
        const config = {
            lm: {enabled: false}
        };

        const nar = new NAR(config);

        expect(nar.lm).toBeNull();
    });

    test('Should be able to register LM provider and use it through NAR', async () => {
        const config = {
            lm: {enabled: true}
        };

        const nar = new NAR(config);
        const provider = new DummyProvider({id: 'test-provider', responseTemplate: 'Response: {prompt}'});

        nar.registerLMProvider('test-provider', provider);

        const result = await nar.generateWithLM('Hello, world!');
        expect(result).toBe('Response: Hello, world!');
    });

    test('Should be able to use Narsese translation through NAR', () => {
        const config = {
            lm: {enabled: true}
        };

        const nar = new NAR(config);
        const provider = new DummyProvider({id: 'test-provider'});
        nar.registerLMProvider('test-provider', provider);

        const toNarsese = nar.translateToNarsese('dog is an animal');
        expect(toNarsese).toContain('dog');
        expect(toNarsese).toContain('animal');

        const fromNarsese = nar.translateFromNarsese('(cat --> mammal).');
        expect(fromNarsese).toContain('cat');
        expect(fromNarsese).toContain('mammal');
    });

    test('NAR stats should include LM metrics when LM is enabled', () => {
        const config = {
            lm: {enabled: true}
        };

        const nar = new NAR(config);
        const provider = new DummyProvider({id: 'test-provider'});
        nar.registerLMProvider('test-provider', provider);

        const stats = nar.getStats();
        expect(stats.lmStats).toBeDefined();
        expect(stats.lmStats.providerCount).toBe(1);
    });

    test('NAR stats should not include LM metrics when LM is disabled', () => {
        const config = {
            lm: {enabled: false}
        };

        const nar = new NAR(config);

        const stats = nar.getStats();
        expect(stats.lmStats).toBeUndefined();
    });
});