import { Truth } from '../../../src/Truth.js';
import { TRUTH } from '../../../src/config/constants.js';
import { createTruth, TEST_CONSTANTS } from '../../support/factories.js';

describe('Truth', () => {
    test('initializes correctly', () => {
        const truth = createTruth();
        expect(truth.f).toBe(TEST_CONSTANTS.TRUTH.HIGH.f);
        expect(truth.c).toBe(TEST_CONSTANTS.TRUTH.HIGH.c);
    });

    test('uses defaults when empty', () => {
        const truth = new Truth();
        expect(truth.f).toBe(TRUTH.DEFAULT_FREQUENCY);
        expect(truth.c).toBe(TRUTH.DEFAULT_CONFIDENCE);
    });

    test('enforces immutability', () => {
        const truth = createTruth();
        expect(() => truth.f = 0.5).toThrow();
    });

    test('compares correctly', () => {
        const t1 = createTruth();
        const t2 = createTruth();
        const t3 = createTruth(0.5, 0.8);
        const t4 = createTruth(0.9, 0.7);

        expect(t1.equals(t2)).toBe(true);
        expect(t1.equals(t3)).toBe(false);
        expect(t1.equals(t4)).toBe(false);
    });

    test('handles precision in comparison', () => {
        const t1 = createTruth();
        const t2 = new Truth(0.9 + TRUTH.EPSILON / 2, 0.8 - TRUTH.EPSILON / 2);
        expect(t1.equals(t2)).toBe(true);
    });

    test('stringifies correctly', () => {
        const truth = createTruth();
        const expected = `%${TEST_CONSTANTS.TRUTH.HIGH.f.toFixed(TRUTH.PRECISION)};${TEST_CONSTANTS.TRUTH.HIGH.c.toFixed(TRUTH.PRECISION)}%`;
        expect(truth.toString()).toBe(expected);
    });

    describe('operations', () => {
        const t1 = createTruth(0.8, 0.9);
        const t2 = createTruth(0.6, 0.7);

        test('deduction', () => {
            const result = Truth.deduction(t1, t2);
            expect(result.f).toBeCloseTo(0.48);
            expect(result.c).toBeCloseTo(0.63);
        });

        test('revision', () => {
            const result = Truth.revision(t1, t2);
            const cSum = t1.c + t2.c;
            const expectedF = (t1.f * t1.c + t2.f * t2.c) / cSum;
            expect(result.f).toBeCloseTo(expectedF);
            expect(result.c).toBeCloseTo(cSum > 1 ? 1 : cSum);
        });

        test('negation', () => {
            const result = Truth.negation(t1);
            expect(result.f).toBeCloseTo(0.2);
            expect(result.c).toBe(0.9);
        });

        test('expectation', () => {
            const expectation = Truth.expectation(t1);
            expect(expectation).toBeCloseTo(0.72);
        });
    });
});
