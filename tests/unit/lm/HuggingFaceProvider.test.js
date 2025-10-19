/**
 * @file tests/unit/lm/HuggingFaceProvider.test.js
 * @description Unit tests for HuggingFaceProvider
 */

import {HuggingFaceProvider} from '../../../src/lm/HuggingFaceProvider.js';

describe('HuggingFaceProvider', () => {
    describe('constructor', () => {
        test('initializes with correct configuration and defaults', () => {
            const provider = new HuggingFaceProvider({
                modelName: 'sshleifer/distilbart-cnn-12-6',
                temperature: 0.7,
                maxTokens: 100
            });

            expect(provider.getModelName()).toBe('sshleifer/distilbart-cnn-12-6');
            expect(provider.temperature).toBe(0.7);
            expect(provider.maxTokens).toBe(100);
            expect(provider.modelType).toBe('generic');
        });

        test('uses default values when not specified', () => {
            const provider = new HuggingFaceProvider({});
            expect(provider.modelName).toBeDefined();
            expect(provider.temperature).toBeDefined();
            expect(provider.maxTokens).toBeDefined();
        });

        test.each([
            ['MobileBERT/mobilebert-uncased', 'mobilebert'],
            ['HuggingFaceTB/SmolLM-135M', 'smollm'],
            ['sshleifer/distilbart-cnn-12-6', 'generic']
        ])('identifies model type for %s as %s', (modelName, expectedType) => {
            const provider = new HuggingFaceProvider({modelName});
            expect(provider.modelType).toBe(expectedType);
        });
    });
});
