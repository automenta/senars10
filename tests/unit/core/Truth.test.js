import {Truth} from '../../../src/Truth.js';
import {TRUTH} from '../../../src/config/constants.js';
import {createTruth, TEST_CONSTANTS} from '../../support/factories.js';

describe('Truth', () => {
    describe('constructor', () => {
        test.each([
            {
                name: 'initializes with given values',
                truth: createTruth(),
                expected: {f: TEST_CONSTANTS.TRUTH.HIGH.f, c: TEST_CONSTANTS.TRUTH.HIGH.c}
            },
            {
                name: 'uses defaults for empty constructor',
                truth: new Truth(),
                expected: {f: TRUTH.DEFAULT_FREQUENCY, c: TRUTH.DEFAULT_CONFIDENCE}
            },
        ])('$name', ({truth, expected}) => {
            expect(truth.f).toBe(expected.f);
            expect(truth.c).toBe(expected.c);
        });

        test('is immutable', () => {
            const truth = createTruth();
            expect(() => truth.f = 0.5).toThrow();
        });
    });

    describe('equals', () => {
        test('compares values correctly', () => {
            const t1 = createTruth();
            const t2 = createTruth();
            const t3 = createTruth(0.5, 0.8);

            expect(t1.equals(t2)).toBe(true);
            expect(t1.equals(t3)).toBe(false);
        });

        test('handles precision within epsilon', () => {
            const t1 = createTruth();
            const t2 = new Truth(
                TEST_CONSTANTS.TRUTH.HIGH.f + TRUTH.EPSILON / 2,
                TEST_CONSTANTS.TRUTH.HIGH.c - TRUTH.EPSILON / 2
            );
            expect(t1.equals(t2)).toBe(true);
        });
    });

    test('toString', () => {
        const truth = createTruth();
        const {f, c} = TEST_CONSTANTS.TRUTH.HIGH;
        const expected = `%${f.toFixed(TRUTH.PRECISION)};${c.toFixed(TRUTH.PRECISION)}%`;
        expect(truth.toString()).toBe(expected);
    });

    describe('operations', () => {
        const t1 = createTruth(0.8, 0.9);
        const t2 = createTruth(0.6, 0.7);

        test.each([
            {name: 'deduction', args: [t1, t2], expected: {f: 0.48, c: 0.63}},
            {name: 'revision', args: [t1, t2], expected: {f: 0.7125, c: 1.0}},
            {name: 'negation', args: [t1], expected: {f: 0.2, c: 0.9}},
            {name: 'expectation', args: [t1], expected: 0.72},
        ])('$name', ({name, args, expected}) => {
            const result = Truth[name](...args);
            if (typeof expected === 'object') {
                expect(result.f).toBeCloseTo(expected.f, 5);
                expect(result.c).toBeCloseTo(expected.c, 5);
            } else {
                expect(result).toBeCloseTo(expected, 5);
            }
        });
    });
});