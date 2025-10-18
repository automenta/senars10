import {Truth} from '../../../src/Truth.js';
import {TRUTH} from '../../../src/config/constants.js';

describe('Truth', () => {
    test('should create a new Truth instance with correct properties', () => {
        const truth = new Truth(0.9, 0.8);
        expect(truth.f).toBe(0.9);
        expect(truth.c).toBe(0.8);
    });

    test('should use default values when none are provided', () => {
        const truth = new Truth();
        expect(truth.f).toBe(TRUTH.DEFAULT_FREQUENCY);
        expect(truth.c).toBe(TRUTH.DEFAULT_CONFIDENCE);
    });

    test('should enforce immutability', () => {
        const truth = new Truth(0.9, 0.8);
        expect(() => {
            truth.f = 0.5;
        }).toThrow();
    });

    test('should correctly compare two Truth instances', () => {
        const truth1 = new Truth(0.9, 0.8);
        const truth2 = new Truth(0.9, 0.8);
        const truth3 = new Truth(0.5, 0.8);
        const truth4 = new Truth(0.9, 0.7);

        expect(truth1.equals(truth2)).toBe(true);
        expect(truth1.equals(truth3)).toBe(false);
        expect(truth1.equals(truth4)).toBe(false);
    });

    test('should handle floating point precision issues in comparison', () => {
        const truth1 = new Truth(0.9, 0.8);
        const truth2 = new Truth(0.9 + TRUTH.EPSILON / 2, 0.8 - TRUTH.EPSILON / 2);
        expect(truth1.equals(truth2)).toBe(true);
    });

    test('should produce a correct string representation', () => {
        const truth = new Truth(0.9, 0.8);
        const expected = `%${(0.9).toFixed(TRUTH.PRECISION)};${(0.8).toFixed(TRUTH.PRECISION)}%`;
        expect(truth.toString()).toBe(expected);
    });

    describe('Truth Operations', () => {
        const t1 = new Truth(0.8, 0.9);
        const t2 = new Truth(0.6, 0.7);

        test('should calculate deduction correctly', () => {
            const result = Truth.deduction(t1, t2);
            expect(result.f).toBeCloseTo(0.48);
            expect(result.c).toBeCloseTo(0.63);
        });

        test('should calculate revision correctly', () => {
            const result = Truth.revision(t1, t2);
            expect(result.f).toBeCloseTo((0.8 * 0.9 + 0.6 * 0.7) / (0.9 + 0.7));
            expect(result.c).toBeCloseTo(1.0); // 0.9 + 0.7 > 1
        });

        test('should calculate negation correctly', () => {
            const result = Truth.negation(t1);
            expect(result.f).toBeCloseTo(0.2);
            expect(result.c).toBe(0.9);
        });

        test('should calculate expectation correctly', () => {
            const expectation = Truth.expectation(t1);
            expect(expectation).toBeCloseTo(0.72);
        });
    });
});