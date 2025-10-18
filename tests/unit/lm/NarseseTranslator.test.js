import {NarseseTranslator} from '../../../src/core/lm/NarseseTranslator.js';

describe('NarseseTranslator', () => {
    let translator;

    beforeEach(() => {
        translator = new NarseseTranslator();
    });

    test('should convert simple English to basic Narsese', () => {
        const result = translator.toNarsese('cat is a mammal');
        expect(result).toBe('(cat --> mammal).');
    });

    test('should convert "is similar to" patterns to similarity', () => {
        const result = translator.toNarsese('dog is similar to wolf');
        expect(result).toBe('(dog <-> wolf).');
    });

    test('should convert "relates to" patterns to similarity using alternative', () => {
        const result = translator.toNarsese('cat resembles dog');
        expect(result).toBe('(cat <-> dog).');
    });

    test('should convert "causes" patterns to implication', () => {
        const result = translator.toNarsese('fire causes smoke');
        expect(result).toBe('(fire ==> smoke).');
    });

    test('should handle unknown patterns gracefully', () => {
        const result = translator.toNarsese('Completely different pattern with no match');
        expect(result).toBe('(Completely_different_pattern_with_no_match --> statement).');
    });

    test('should throw error for non-string input to toNarsese', () => {
        expect(() => {
            translator.toNarsese(null);
        }).toThrow();

        expect(() => {
            translator.toNarsese(123);
        }).toThrow();
    });

    test('should convert Narsese back to English', () => {
        const result = translator.fromNarsese('(cat --> mammal).');
        expect(result).toBe('cat is a mammal');
    });

    test('should convert similarity back to English', () => {
        const result = translator.fromNarsese('(dog <-> wolf).');
        expect(result).toBe('dog is similar to wolf');
    });

    test('should convert implication back to English', () => {
        const result = translator.fromNarsese('(fire ==> smoke).');
        expect(result).toBe('if fire then smoke');
    });

    test('should handle non-string input to fromNarsese', () => {
        expect(() => {
            translator.fromNarsese(null);
        }).toThrow();

        expect(() => {
            translator.fromNarsese(123);
        }).toThrow();
    });

    test('should return original string for unrecognized Narsese', () => {
        const unrecognized = 'This is not valid Narsese';
        const result = translator.fromNarsese(unrecognized);
        expect(result).toBe(unrecognized);
    });
});