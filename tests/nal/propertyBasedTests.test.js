/**
 * @file tests/nal/propertyBasedTests.test.js
 * @description Property-based tests for NAL rules using fast-check
 */

import fc from 'fast-check';
import {Truth} from '../../src/Truth.js';
import {TruthFunctions} from '../../src/reasoning/nal/TruthFunctions.js';

/**
 * Property-based tests for TruthFunctions
 */
describe('TruthFunctions - Property Based Tests', () => {
    /**
     * Test that frequency values are always between 0 and 1 after any operation
     */
    test('deduction should produce frequency values between 0 and 1', () => {
        fc.assert(
            fc.property(
                fc.float({min: 0, max: 1, noNaN: true}), // frequency 1
                fc.float({min: 0, max: 1, noNaN: true}), // confidence 1
                fc.float({min: 0, max: 1, noNaN: true}), // frequency 2
                fc.float({min: 0, max: 1, noNaN: true}), // confidence 2
                (f1, c1, f2, c2) => {
                    // Handle potential NaN values
                    if (Number.isNaN(f1) || Number.isNaN(c1) || Number.isNaN(f2) || Number.isNaN(c2)) {
                        return true; // Skip this test case
                    }
                    
                    const t1 = new Truth(f1, c1);
                    const t2 = new Truth(f2, c2);
                    const result = TruthFunctions.deduction(t1, t2);
                    
                    if (result) {
                        expect(result.frequency).toBeGreaterThanOrEqual(0);
                        expect(result.frequency).toBeLessThanOrEqual(1);
                        expect(result.confidence).toBeGreaterThanOrEqual(0);
                        expect(result.confidence).toBeLessThanOrEqual(1);
                    }
                    
                    return true; // Indicate test passed
                }
            )
        );
    });

    test('induction should produce frequency values between 0 and 1', () => {
        fc.assert(
            fc.property(
                fc.float({min: 0, max: 1, noNaN: true}), // frequency 1
                fc.float({min: 0, max: 1, noNaN: true}), // confidence 1
                fc.float({min: 0, max: 1, noNaN: true}), // frequency 2
                fc.float({min: 0, max: 1, noNaN: true}), // confidence 2
                (f1, c1, f2, c2) => {
                    if (Number.isNaN(f1) || Number.isNaN(c1) || Number.isNaN(f2) || Number.isNaN(c2)) {
                        return true; // Skip this test case
                    }
                    
                    const t1 = new Truth(f1, c1);
                    const t2 = new Truth(f2, c2);
                    const result = TruthFunctions.induction(t1, t2);
                    
                    if (result) {
                        expect(result.frequency).toBeGreaterThanOrEqual(0);
                        expect(result.frequency).toBeLessThanOrEqual(1);
                        expect(result.confidence).toBeGreaterThanOrEqual(0);
                        expect(result.confidence).toBeLessThanOrEqual(1);
                    }
                    
                    return true; // Indicate test passed
                }
            )
        );
    });

    test('abduction should produce frequency values between 0 and 1', () => {
        fc.assert(
            fc.property(
                fc.float({min: 0, max: 1, noNaN: true}), // frequency 1
                fc.float({min: 0, max: 1, noNaN: true}), // confidence 1
                fc.float({min: 0, max: 1, noNaN: true}), // frequency 2
                fc.float({min: 0, max: 1, noNaN: true}), // confidence 2
                (f1, c1, f2, c2) => {
                    if (Number.isNaN(f1) || Number.isNaN(c1) || Number.isNaN(f2) || Number.isNaN(c2)) {
                        return true; // Skip this test case
                    }
                    
                    const t1 = new Truth(f1, c1);
                    const t2 = new Truth(f2, c2);
                    const result = TruthFunctions.abduction(t1, t2);
                    
                    if (result) {
                        expect(result.frequency).toBeGreaterThanOrEqual(0);
                        expect(result.frequency).toBeLessThanOrEqual(1);
                        expect(result.confidence).toBeGreaterThanOrEqual(0);
                        expect(result.confidence).toBeLessThanOrEqual(1);
                    }
                    
                    return true; // Indicate test passed
                }
            )
        );
    });

    test('revision should properly combine identical truth values', () => {
        fc.assert(
            fc.property(
                fc.float({min: 0, max: 1, noNaN: true}), // frequency
                fc.float({min: 0, max: 1, noNaN: true}), // confidence
                (f, c) => {
                    if (Number.isNaN(f) || Number.isNaN(c)) {
                        return true; // Skip this test case
                    }
                    
                    const t1 = new Truth(f, c);
                    const t2 = new Truth(f, c);
                    const result = TruthFunctions.revision(t1, t2);
                    
                    if (result) {
                        // When both truth values are identical, revision should preserve frequency
                        expect(result.frequency).toBeCloseTo(f, 5);
                        
                        // Confidence should be calculated based on the revision formula
                        // For identical values, confidence = (c1*weight1 + c2*weight2) / (weight1 + weight2)
                        // Where weights are typically based on confidence values
                        // The result confidence would be the weighted average
                        expect(result.confidence).toBeGreaterThanOrEqual(0);
                        expect(result.confidence).toBeLessThanOrEqual(1);
                    }
                    
                    return true; // Indicate test passed
                }
            )
        );
    });

    test('negation should complement the frequency while preserving confidence', () => {
        fc.assert(
            fc.property(
                fc.float({min: 0, max: 1, noNaN: true}), // frequency
                fc.float({min: 0, max: 1, noNaN: true}), // confidence
                (f, c) => {
                    if (Number.isNaN(f) || Number.isNaN(c)) {
                        return true; // Skip this test case
                    }
                    
                    const t = new Truth(f, c);
                    const result = TruthFunctions.negation(t);
                    
                    if (result) {
                        // Negation should complement the frequency
                        expect(result.frequency).toBeCloseTo(1 - f, 5);
                        // Confidence should be preserved
                        expect(result.confidence).toBeCloseTo(c, 5);
                    }
                    
                    return true; // Indicate test passed
                }
            )
        );
    });

    test('expectation should return value between 0 and 1', () => {
        fc.assert(
            fc.property(
                fc.float({min: 0, max: 1, noNaN: true}), // frequency
                fc.float({min: 0, max: 1, noNaN: true}), // confidence
                (f, c) => {
                    if (Number.isNaN(f) || Number.isNaN(c)) {
                        return true; // Skip this test case
                    }
                    
                    const t = new Truth(f, c);
                    const expectation = TruthFunctions.expectation(t);
                    
                    expect(expectation).toBeGreaterThanOrEqual(0);
                    expect(expectation).toBeLessThanOrEqual(1);
                    
                    return true; // Indicate test passed
                }
            )
        );
    });

    test('conversion should not increase confidence beyond frequency', () => {
        fc.assert(
            fc.property(
                fc.float({min: 0, max: 1, noNaN: true}), // frequency
                fc.float({min: 0, max: 1, noNaN: true}), // confidence
                (f, c) => {
                    if (Number.isNaN(f) || Number.isNaN(c)) {
                        return true; // Skip this test case
                    }
                    
                    const t = new Truth(f, c);
                    const result = TruthFunctions.conversion(t);
                    
                    if (result) {
                        // In conversion, confidence cannot exceed frequency
                        expect(result.confidence).toBeLessThanOrEqual(f);
                    }
                    
                    return true; // Indicate test passed
                }
            )
        );
    });
});

/**
 * Property-based tests for specific NAL rule behaviors
 */
describe('NAL Rules - Property Based Tests', () => {
    test('deduction with high confidence inputs should produce high confidence output', () => {
        fc.assert(
            fc.property(
                fc.float({min: Math.fround(0.8), max: Math.fround(1.0), noNaN: true}), // high frequency 1
                fc.float({min: Math.fround(0.8), max: Math.fround(1.0), noNaN: true}), // high confidence 1
                fc.float({min: Math.fround(0.8), max: Math.fround(1.0), noNaN: true}), // high frequency 2
                fc.float({min: Math.fround(0.8), max: Math.fround(1.0), noNaN: true}), // high confidence 2
                (f1, c1, f2, c2) => {
                    if (Number.isNaN(f1) || Number.isNaN(c1) || Number.isNaN(f2) || Number.isNaN(c2)) {
                        return true; // Skip this test case
                    }
                    
                    const t1 = new Truth(f1, c1);
                    const t2 = new Truth(f2, c2);
                    const result = TruthFunctions.deduction(t1, t2);
                    
                    if (result) {
                        // Deduction confidence is the product of input confidences
                        const expectedConfidence = c1 * c2;
                        expect(result.confidence).toBeCloseTo(expectedConfidence, 5);
                        
                        // High confidence inputs should produce reasonably high confidence output
                        expect(result.confidence).toBeGreaterThan(0.64); // 0.8 * 0.8
                    }
                    
                    return true; // Indicate test passed
                }
            )
        );
    });

    test('induction should have lower confidence than inputs', () => {
        fc.assert(
            fc.property(
                fc.float({min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true}), // frequency 1
                fc.float({min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true}), // confidence 1
                fc.float({min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true}), // frequency 2
                fc.float({min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true}), // confidence 2
                (f1, c1, f2, c2) => {
                    if (Number.isNaN(f1) || Number.isNaN(c1) || Number.isNaN(f2) || Number.isNaN(c2)) {
                        return true; // Skip this test case
                    }
                    
                    const t1 = new Truth(f1, c1);
                    const t2 = new Truth(f2, c2);
                    const result = TruthFunctions.induction(t1, t2);
                    
                    if (result) {
                        // Induction typically has lower confidence than inputs
                        // The confidence is weakened by some factor based on frequency
                        const expectedMaxConfidence = c1 * c2; // Upper bound
                        expect(result.confidence).toBeLessThanOrEqual(expectedMaxConfidence);
                    }
                    
                    return true; // Indicate test passed
                }
            )
        );
    });

    test('abduction should maintain reasonable bounds based on input confidences', () => {
        fc.assert(
            fc.property(
                fc.float({min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true}), // frequency 1
                fc.float({min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true}), // confidence 1
                fc.float({min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true}), // frequency 2
                fc.float({min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true}), // confidence 2
                (f1, c1, f2, c2) => {
                    if (Number.isNaN(f1) || Number.isNaN(c1) || Number.isNaN(f2) || Number.isNaN(c2)) {
                        return true; // Skip this test case
                    }
                    
                    const t1 = new Truth(f1, c1);
                    const t2 = new Truth(f2, c2);
                    const result = TruthFunctions.abduction(t1, t2);
                    
                    if (result) {
                        // Abduction confidence is based on both input confidences and the other frequency
                        const expectedMaxConfidence = Math.min(c1 * c2, c2); // Upper bound
                        expect(result.confidence).toBeLessThanOrEqual(expectedMaxConfidence);
                    }
                    
                    return true; // Indicate test passed
                }
            )
        );
    });
});

/**
 * Edge case property tests for NAL reasoning
 */
describe('NAL Reasoning Edge Cases - Property Based Tests', () => {
    test('zero confidence inputs should produce appropriate results', () => {
        fc.assert(
            fc.property(
                fc.float({min: 0, max: 1, noNaN: true}), // frequency
                (f) => {
                    if (Number.isNaN(f)) {
                        return true; // Skip this test case
                    }
                    
                    const t1 = new Truth(f, 0); // Zero confidence
                    const t2 = new Truth(f, 0.9);
                    
                    // Deduction with zero confidence should result in zero confidence
                    const deductionResult = TruthFunctions.deduction(t1, t2);
                    if (deductionResult) {
                        expect(deductionResult.confidence).toBeCloseTo(0, 5);
                    }
                    
                    // Induction with zero confidence should result in zero confidence
                    const inductionResult = TruthFunctions.induction(t1, t2);
                    if (inductionResult) {
                        expect(inductionResult.confidence).toBeCloseTo(0, 5);
                    }
                    
                    // Abduction with zero confidence should result in zero confidence
                    const abductionResult = TruthFunctions.abduction(t1, t2);
                    if (abductionResult) {
                        expect(abductionResult.confidence).toBeCloseTo(0, 5);
                    }
                    
                    return true; // Indicate test passed
                }
            )
        );
    });

    test('frequency of 0 or 1 should produce stable results', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(0, 1), // Edge frequencies
                fc.float({min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true}), // Middle confidence
                fc.constantFrom(0, 1), // Edge frequencies for second value
                fc.float({min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true}), // Middle confidence for second value
                (f1, c1, f2, c2) => {
                    if (Number.isNaN(c1) || Number.isNaN(c2)) {
                        return true; // Skip this test case
                    }
                    
                    const t1 = new Truth(f1, c1);
                    const t2 = new Truth(f2, c2);
                    
                    // All functions should handle edge frequencies properly
                    const deduction = TruthFunctions.deduction(t1, t2);
                    const induction = TruthFunctions.induction(t1, t2);
                    const abduction = TruthFunctions.abduction(t1, t2);
                    
                    [deduction, induction, abduction].forEach(result => {
                        if (result) {
                            expect(result.frequency).toBeGreaterThanOrEqual(0);
                            expect(result.frequency).toBeLessThanOrEqual(1);
                            expect(result.confidence).toBeGreaterThanOrEqual(0);
                            expect(result.confidence).toBeLessThanOrEqual(1);
                        }
                    });
                    
                    return true; // Indicate test passed
                }
            )
        );
    });
});