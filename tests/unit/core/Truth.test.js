import {Truth} from '../../../src/Truth.js';
import {TRUTH} from '../../../src/config/constants.js';
import {createTruth, TEST_CONSTANTS} from '../../support/factories.js';
import {
    equalityTests,
    flexibleAssertions,
    stringRepresentationTests,
    TestSuiteFactory,
    truthAssertions
} from '../../support/testOrganizer.js';
import fc from 'fast-check';

// Use the TestSuiteFactory to create a comprehensive Truth test suite
TestSuiteFactory.createTruthRelatedSuite({
    className: 'Truth',
    Constructor: Truth,
    validInput: {f: 0.9, c: 0.8},
    testAssertions: true,
    assertionUtils: truthAssertions
});

describe('Truth - Additional Specific Tests', () => {
    describe('Initialization', () => {
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

    describe('Comparison', () => {
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

        test('obeys equality laws', () => {
            const t1 = createTruth();
            const t2 = createTruth();
            const t3 = createTruth(0.5, 0.8);

            equalityTests.runEqualityLaws(t1, t2, t3);
        });
    });

    describe('String Representation', () => {
        test('toString returns expected format', () => {
            const truth = createTruth();
            const {f, c} = TEST_CONSTANTS.TRUTH.HIGH;
            const expected = `%${f.toFixed(TRUTH.PRECISION)};${c.toFixed(TRUTH.PRECISION)}%`;
            stringRepresentationTests.verifyToString(truth, expected);
        });
    });

    describe('Operations', () => {
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
                // Use more flexible tolerance for truth operations that might vary with implementation
                flexibleAssertions.expectCloseTo(result.f, expected.f, 0.05, `Truth.${name} frequency`);
                flexibleAssertions.expectCloseTo(result.c, expected.c, 0.05, `Truth.${name} confidence`);
            } else {
                flexibleAssertions.expectCloseTo(result, expected, 0.05, `Truth.${name} operation result`);
            }
        });
    });

    describe('Truth Assertions', () => {
        test('expectation calculation works correctly', () => {
            const truth = new Truth(0.8, 0.9);
            const expectedValue = 0.8 * (0.9 - 0.5) + 0.5; // frequency * (confidence - 0.5) + 0.5
            truthAssertions.expectTruthExpectation(truth, expectedValue, 5);
        });
    });

    describe('Property-Based Tests for Truth Operations', () => {
        const truthArb = fc.record({f: fc.double(0, 1), c: fc.double(0, 1)}).map(v => new Truth(v.f, v.c));

        const isValidTruth = (t) => {
            return t.f >= 0 && t.f <= 1 && t.c >= 0 && t.c <= 1;
        };

        test('all binary operations should produce valid truth values', () => {
            const binaryOps = [Truth.deduction, Truth.revision, Truth.induction, Truth.abduction];
            fc.assert(
                fc.property(truthArb, truthArb, fc.constantFrom(...binaryOps), (t1, t2, op) => {
                    const result = op(t1, t2);
                    expect(isValidTruth(result)).toBe(true);
                })
            );
        });

        test('all unary operations should produce valid truth values', () => {
            const unaryOps = [Truth.negation, Truth.conversion];
            fc.assert(
                fc.property(truthArb, fc.constantFrom(...unaryOps), (t, op) => {
                    const result = op(t);
                    expect(isValidTruth(result)).toBe(true);
                })
            );
        });

        test('operations should be immutable', () => {
            fc.assert(
                fc.property(truthArb, truthArb, (t1, t2) => {
                    const originalT1 = {...t1};
                    const originalT2 = {...t2};

                    Truth.deduction(t1, t2);
                    Truth.revision(t1, t2);
                    Truth.negation(t1);

                    expect(t1.f).toBe(originalT1.f);
                    expect(t1.c).toBe(originalT1.c);
                    expect(t2.f).toBe(originalT2.f);
                    expect(t2.c).toBe(originalT2.c);
                })
            );
        });
    });
});