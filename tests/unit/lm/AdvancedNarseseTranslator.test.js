/**
 * @file tests/unit/lm/AdvancedNarseseTranslator.test.js
 * @description Unit tests for AdvancedNarseseTranslator
 */

import {AdvancedNarseseTranslator} from '../../../src/lm/AdvancedNarseseTranslator.js';

describe('AdvancedNarseseTranslator', () => {
    let translator;

    beforeEach(() => {
        translator = new AdvancedNarseseTranslator();
    });

    describe('Narsese to Natural Language Translation', () => {
        test('should translate inheritance statements', () => {
            const result = translator.fromNarsese('(cat --> animal).');
            expect(result.text).toBe('cat is a animal');
            expect(result.confidence).toBeGreaterThan(0.8);
        });

        test('should translate similarity statements', () => {
            const result = translator.fromNarsese('(cat <-> dog).');
            expect(result.text).toBe('cat is similar to dog');
            expect(result.confidence).toBeGreaterThan(0.8);
        });

        test('should handle implication statements', () => {
            const result = translator.fromNarsese('(rainy ==> wet).');
            expect(result.text).toBe('if rainy then wet');
            expect(result.confidence).toBeGreaterThan(0.8);
        });

        test('should return original with low confidence for invalid Narsese', () => {
            const result = translator.fromNarsese('invalid narsese');
            expect(result.text).toBe('invalid narsese');
            expect(result.confidence).toBe(0.2);
        });
    });

    describe('Natural Language to Narsese Translation', () => {
        test('should translate "is a" statements', () => {
            const result = translator.toNarsese('cat is a animal');
            expect(result.narsese).toBe('(cat --> animal).');
            expect(result.confidence).toBeGreaterThan(0.8);
        });

        test('should translate "and" statements', () => {
            const result = translator.toNarsese('cat and dog');
            expect(result.narsese).toBe('(&, cat, dog).');
            expect(result.confidence).toBeGreaterThan(0.8);
        });

        test('should translate "or" statements', () => {
            const result = translator.toNarsese('cat or dog');
            expect(result.narsese).toBe('(|, cat, dog).');
            expect(result.confidence).toBeGreaterThan(0.8);
        });

        test('should handle basic text with fallback', () => {
            const result = translator.toNarsese('simple statement');
            expect(result.narsese).toContain('-->');
            expect(result.confidence).toBe(0.3);
        });
    });

    describe('Context and Quality Features', () => {
        test('should add context correctly', () => {
            const initialLength = translator.contextBuffer.length;
            translator.addContext('test context');
            expect(translator.contextBuffer.length).toBe(initialLength + 1);
            expect(translator.contextBuffer[translator.contextBuffer.length - 1]).toBe('test context');
        });

        test('should maintain context buffer size limit', () => {
            for (let i = 0; i < 15; i++) {
                translator.addContext(`context ${i}`);
            }
            expect(translator.contextBuffer.length).toBe(translator.maxContextSize);
        });

        test('should provide quality metrics', () => {
            // Perform a few translations to populate history
            translator.toNarsese('test 1');
            translator.fromNarsese('<test --> example>.');

            const metrics = translator.getQualityMetrics();
            expect(metrics.totalTranslations).toBeGreaterThanOrEqual(2);
            expect(typeof metrics.averageConfidence).toBe('number');
            expect(typeof metrics.highConfidenceRate).toBe('number');
            expect(typeof metrics.lowConfidenceRate).toBe('number');
        });

        test('should validate semantic preservation', () => {
            const result = translator.validateSemanticPreservation(
                'cats are animals',
                '<cats --> animals>.',
                'cats are animals'
            );
            expect(result.similar).toBe(true);
            expect(result.preserved).toBe(true);
            expect(result.similarity).toBeGreaterThan(0.5);
        });
    });

    describe('Error Correction', () => {
        test('should add punctuation if missing', () => {
            const result = {
                narsese: '(cat --> animal)',
                confidence: 0.9
            };
            const corrected = translator.applyErrorCorrection(result);
            expect(corrected.narsese).toBe('(cat --> animal).');
        });

        test('should identify empty parentheses', () => {
            const result = {
                narsese: '()',
                confidence: 0.9
            };
            const corrected = translator.applyErrorCorrection(result);
            expect(corrected.confidence).toBeLessThanOrEqual(0.3);
        });
    });

    describe('Iterative Translation', () => {
        test('should return initial result for high confidence translations', async () => {
            const result = await translator.iterativeTranslate('cat is a animal');
            expect(result.narsese).toBe('(cat --> animal).');
            // Since we're not actually implementing refinement in this basic version, we return the initial result
            // So refined property might not exist, so we don't check it
            expect(result.confidence).toBeGreaterThan(0.5);
        });

        test('should return refinement note for low confidence translations', async () => {
            const result = await translator.iterativeTranslate('very ambiguous input');
            expect(result.confidence).toBe(0.3);
            expect(result.notes).toContain('Low confidence');
        });
    });
});