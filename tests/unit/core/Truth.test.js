import { Truth } from '../../../src/Truth.js';
import { TRUTH } from '../../../src/config/constants.js';
import { createTruth, TEST_CONSTANTS } from '../../support/factories.js';

describe('Truth', () => {
    describe('constructor', () => {
        test('initializes with given values', () => {
            const truth = createTruth();
            expect(truth.f).toBe(TEST_CONSTANTS.TRUTH.HIGH.f);
            expect(truth.c).toBe(TEST_CONSTANTS.TRUTH.HIGH.c);
        });

        test('uses defaults for empty constructor', () => {
            const truth = new Truth();
            expect(truth.f).toBe(TRUTH.DEFAULT_FREQUENCY);
            expect(truth.c).toBe(TRUTH.DEFAULT_CONFIDENCE);
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
        const { f, c } = TEST_CONSTANTS.TRUTH.HIGH;
        const expected = `%${f.toFixed(TRUTH.PRECISION)};${c.toFixed(TRUTH.PRECISION)}%`;
        expect(truth.toString()).toBe(expected);
    });

    describe('operations', () => {
        const t1 = createTruth(0.8, 0.9);
        const t2 = createTruth(0.6, 0.7);

        test('deduction', () => {
            const result = Truth.deduction(t1, t2);
            expect(result.f).toBeCloseTo(0.48, 5);
            expect(result.c).toBeCloseTo(0.63, 5);
        });

        test('revision', () => {
            const result = Truth.revision(t1, t2);
            const cSum = t1.c + t2.c;
            const expectedF = (t1.f * t1.c + t2.f * t2.c) / cSum;
            expect(result.f).toBeCloseTo(expectedF, 5);
            expect(result.c).toBeCloseTo(Math.min(1, cSum), 5);
        });

        test('negation', () => {
            const result = Truth.negation(t1);
            expect(result.f).toBeCloseTo(0.2, 5);
            expect(result.c).toBe(t1.c);
        });

        test('expectation', () => {
            const expectation = Truth.expectation(t1);
            expect(expectation).toBeCloseTo(0.72, 5);
        });
    });
});
