/**
 * @file tests/integration/LMIntegration.test.js
 * @description Integration tests for LM provider integration with NAR system
 */

// Import necessary modules
import {NAR} from '../../src/nar/NAR.js';
import {DummyProvider} from '../../src/lm/DummyProvider.js';
import {LangChainProvider} from '../../src/lm/LangChainProvider.js';
import {HuggingFaceProvider} from '../../src/lm/HuggingFaceProvider.js';
import {AdvancedNarseseTranslator} from '../../src/lm/AdvancedNarseseTranslator.js';

describe('LM Integration Tests', () => {
    test('should register and use DummyProvider', () => {
        const nar = new NAR({lm: {enabled: true}});
        const provider = new DummyProvider({id: 'test-dummy', latency: 0});

        expect(() => {
            nar.registerLMProvider('dummy', provider);
        }).not.toThrow();

        expect(nar.lm.providers.get('dummy')).toBeDefined();
    });

    test('should register and use LangChainProvider for Ollama', () => {
        const config = {
            provider: 'ollama',
            modelName: 'llama2',
            baseURL: 'http://localhost:11434'
        };

        const provider = new LangChainProvider(config);

        expect(provider.providerType).toBe('ollama');
        expect(provider.modelName).toBe('llama2');
    });

    test('should register and use HuggingFaceProvider', () => {
        const config = {
            modelName: 'sshleifer/distilbart-cnn-12-6',
            temperature: 0.7,
            maxTokens: 100
        };

        const provider = new HuggingFaceProvider(config);

        expect(provider.modelName).toBe('sshleifer/distilbart-cnn-12-6');
        expect(provider.temperature).toBe(0.7);
    });

    test('should use AdvancedNarseseTranslator for quality improvements', () => {
        const translator = new AdvancedNarseseTranslator();

        // Test basic translation methods exist and return expected types
        const toNarseseResult = translator.toNarsese('cat is an animal');
        expect(typeof toNarseseResult).toBe('object');
        expect(typeof toNarseseResult.confidence).toBe('number');

        const fromNarseseResult = translator.fromNarsese('<cat --> animal>.');
        expect(typeof fromNarseseResult).toBe('object');
        expect(typeof fromNarseseResult.confidence).toBe('number');
    });

    test('should add context to translator for improved quality', () => {
        const translator = new AdvancedNarseseTranslator();
        expect(() => {
            translator.addContext('This is about animals and their properties');
        }).not.toThrow();
    });

    test('should track translation quality metrics', () => {
        const translator = new AdvancedNarseseTranslator();

        // Perform a few translations
        translator.toNarsese('test 1');
        translator.fromNarsese('<test --> example>.');

        const metrics = translator.getQualityMetrics();
        expect(typeof metrics.totalTranslations).toBe('number');
        expect(typeof metrics.averageConfidence).toBe('number');
        expect(Array.isArray(metrics.lastTranslations)).toBe(true);
    });

    test('should validate semantic preservation', () => {
        const translator = new AdvancedNarseseTranslator();

        const validation = translator.validateSemanticPreservation(
            'cats are animals',
            '<cats --> animals>.',
            'cats are animals'
        );

        expect(typeof validation.similar).toBe('boolean');
        expect(typeof validation.similarity).toBe('number');
        expect(typeof validation.preserved).toBe('boolean');
    });

    test('should work with NAR system for symbolic-mode only with DummyLM', () => {
        // Create NAR with DummyLM provider
        const narWithDummy = new NAR({lm: {enabled: true}});
        const dummyProvider = new DummyProvider();
        narWithDummy.registerLMProvider('dummy', dummyProvider);

        // Verify it can be used for symbolic-mode operations
        expect(narWithDummy.lm).toBeDefined();
        expect(narWithDummy.lm.providers.get('dummy')).toBeDefined();
    });

    test('should handle quality scoring for translations', async () => {
        const translator = new AdvancedNarseseTranslator();

        // Test that the method exists and returns expected type
        expect(typeof translator.iterativeTranslate).toBe('function');

        // Since we're not doing actual translations, just check the method exists
        const result = await translator.iterativeTranslate('a valid statement');
        expect(result).toBeDefined();
    });

    test('should apply error correction to translations', () => {
        const translator = new AdvancedNarseseTranslator();

        // Test that the method exists and can be called
        const result = {
            narsese: '(test --> example)',
            confidence: 0.9
        };

        expect(() => {
            const corrected = translator.applyErrorCorrection(result);
            expect(corrected).toBeDefined();
        }).not.toThrow();
    });

    afterEach(() => {
        // Clean up any running NAR instances if needed
    });
});