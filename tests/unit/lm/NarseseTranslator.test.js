import {NarseseTranslator} from '../../../src/lm/NarseseTranslator.js';

describe('NarseseTranslator', () => {
    let translator;

    beforeEach(() => {
        translator = new NarseseTranslator();
    });

    describe('toNarsese', () => {
        test.each([
            ['cat is a mammal', '(cat --> mammal).'],
            ['dog is similar to wolf', '(dog <-> wolf).'],
            ['cat resembles dog', '(cat <-> dog).'],
            ['fire causes smoke', '(fire ==> smoke).']
        ])('converts "%s" to "%s"', (english, narsese) => {
            expect(translator.toNarsese(english)).toBe(narsese);
        });

        test('handles unknown patterns gracefully', () => {
            const result = translator.toNarsese('An unknown pattern');
            expect(result).toBe('(An_unknown_pattern --> statement).');
        });

        test('throws an error for non-string input', () => {
            expect(() => translator.toNarsese(null)).toThrow();
            expect(() => translator.toNarsese(123)).toThrow();
        });
    });

    describe('fromNarsese', () => {
        test.each([
            ['(cat --> mammal).', 'cat is a mammal'],
            ['(dog <-> wolf).', 'dog is similar to wolf'],
            ['(fire ==> smoke).', 'if fire then smoke']
        ])('converts "%s" to "%s"', (narsese, english) => {
            expect(translator.fromNarsese(narsese)).toBe(english);
        });

        test('returns the original string for unrecognized Narsese', () => {
            const unrecognized = '(unrecognized --> format)';
            expect(translator.fromNarsese(unrecognized)).toBe(unrecognized);
        });

        test('throws an error for non-string input', () => {
            expect(() => translator.fromNarsese(null)).toThrow();
            expect(() => translator.fromNarsese(123)).toThrow();
        });
    });
});
