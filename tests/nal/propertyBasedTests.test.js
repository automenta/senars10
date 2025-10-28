import fc from 'fast-check';
import {Truth} from '../../src/Truth.js';
import {TruthFunctions} from '../../src/reasoning/nal/TruthFunctions.js';

describe('TruthFunctions - Property Based Tests', () => {
    test('deduction should produce frequency values between 0 and 1', () => {
        fc.assert(
            fc.property(
                fc.float({min: 0, max: 1, noNaN: true}),
                fc.float({min: 0, max: 1, noNaN: true}),
                fc.float({min: 0, max: 1, noNaN: true}),
                fc.float({min: 0, max: 1, noNaN: true}),
                (f1, c1, f2, c2) => {
                    if (Number.isNaN(f1) || Number.isNaN(c1) || Number.isNaN(f2) || Number.isNaN(c2)) {
                        return true;
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
                    
                    return true;
                }
            )
        );
    });

    test('induction should produce frequency values between 0 and 1', () => {
        fc.assert(
            fc.property(
                fc.float({min: 0, max: 1, noNaN: true}),
                fc.float({min: 0, max: 1, noNaN: true}),
                fc.float({min: 0, max: 1, noNaN: true}),
                fc.float({min: 0, max: 1, noNaN: true}),
                (f1, c1, f2, c2) => {
                    if (Number.isNaN(f1) || Number.isNaN(c1) || Number.isNaN(f2) || Number.isNaN(c2)) {
                        return true;
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
                    
                    return true;
                }
            )
        );
    });

    test('abduction should produce frequency values between 0 and 1', () => {
        fc.assert(
            fc.property(
                fc.float({min: 0, max: 1, noNaN: true}),
                fc.float({min: 0, max: 1, noNaN: true}),
                fc.float({min: 0, max: 1, noNaN: true}),
                fc.float({min: 0, max: 1, noNaN: true}),
                (f1, c1, f2, c2) => {
                    if (Number.isNaN(f1) || Number.isNaN(c1) || Number.isNaN(f2) || Number.isNaN(c2)) {
                        return true;
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
                    
                    return true;
                }
            )
        );
    });

    test('revision should properly combine identical truth values', () => {
        fc.assert(
            fc.property(
                fc.float({min: 0, max: 1, noNaN: true}),
                fc.float({min: 0, max: 1, noNaN: true}),
                (f, c) => {
                    if (Number.isNaN(f) || Number.isNaN(c)) {
                        return true;
                    }
                    
                    const t1 = new Truth(f, c);
                    const t2 = new Truth(f, c);
                    const result = TruthFunctions.revision(t1, t2);
                    
                    if (result) {
                        expect(result.frequency).toBeCloseTo(f, 5);
                        
                        expect(result.confidence).toBeGreaterThanOrEqual(0);
                        expect(result.confidence).toBeLessThanOrEqual(1);
                    }
                    
                    return true;
                }
            )
        );
    });

    test('negation should complement the frequency while preserving confidence', () => {
        fc.assert(
            fc.property(
                fc.float({min: 0, max: 1, noNaN: true}),
                fc.float({min: 0, max: 1, noNaN: true}),
                (f, c) => {
                    if (Number.isNaN(f) || Number.isNaN(c)) {
                        return true;
                    }
                    
                    const t = new Truth(f, c);
                    const result = TruthFunctions.negation(t);
                    
                    if (result) {
                        expect(result.frequency).toBeCloseTo(1 - f, 5);
                        expect(result.confidence).toBeCloseTo(c, 5);
                    }
                    
                    return true;
                }
            )
        );
    });

    test('expectation should return value between 0 and 1', () => {
        fc.assert(
            fc.property(
                fc.float({min: 0, max: 1, noNaN: true}),
                fc.float({min: 0, max: 1, noNaN: true}),
                (f, c) => {
                    if (Number.isNaN(f) || Number.isNaN(c)) {
                        return true;
                    }
                    
                    const t = new Truth(f, c);
                    const expectation = TruthFunctions.expectation(t);
                    
                    expect(expectation).toBeGreaterThanOrEqual(0);
                    expect(expectation).toBeLessThanOrEqual(1);
                    
                    return true;
                }
            )
        );
    });

    test('conversion should not increase confidence beyond frequency', () => {
        fc.assert(
            fc.property(
                fc.float({min: 0, max: 1, noNaN: true}),
                fc.float({min: 0, max: 1, noNaN: true}),
                (f, c) => {
                    if (Number.isNaN(f) || Number.isNaN(c)) {
                        return true;
                    }
                    
                    const t = new Truth(f, c);
                    const result = TruthFunctions.conversion(t);
                    
                    if (result) {
                        expect(result.confidence).toBeLessThanOrEqual(f);
                    }
                    
                    return true;
                }
            )
        );
    });
});

describe('NAL Rules - Property Based Tests', () => {
    test('deduction with high confidence inputs should produce high confidence output', () => {
        fc.assert(
            fc.property(
                fc.float({min: Math.fround(0.8), max: Math.fround(1.0), noNaN: true}),
                fc.float({min: Math.fround(0.8), max: Math.fround(1.0), noNaN: true}),
                fc.float({min: Math.fround(0.8), max: Math.fround(1.0), noNaN: true}),
                fc.float({min: Math.fround(0.8), max: Math.fround(1.0), noNaN: true}),
                (f1, c1, f2, c2) => {
                    if (Number.isNaN(f1) || Number.isNaN(c1) || Number.isNaN(f2) || Number.isNaN(c2)) {
                        return true;
                    }
                    
                    const t1 = new Truth(f1, c1);
                    const t2 = new Truth(f2, c2);
                    const result = TruthFunctions.deduction(t1, t2);
                    
                    if (result) {
                        const expectedConfidence = c1 * c2;
                        expect(result.confidence).toBeCloseTo(expectedConfidence, 5);
                        
                        expect(result.confidence).toBeGreaterThan(0.64);
                    }
                    
                    return true;
                }
            )
        );
    });

    test('induction should have lower confidence than inputs', () => {
        fc.assert(
            fc.property(
                fc.float({min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true}),
                fc.float({min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true}),
                fc.float({min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true}),
                fc.float({min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true}),
                (f1, c1, f2, c2) => {
                    if (Number.isNaN(f1) || Number.isNaN(c1) || Number.isNaN(f2) || Number.isNaN(c2)) {
                        return true;
                    }
                    
                    const t1 = new Truth(f1, c1);
                    const t2 = new Truth(f2, c2);
                    const result = TruthFunctions.induction(t1, t2);
                    
                    if (result) {
                        const expectedMaxConfidence = c1 * c2;
                        expect(result.confidence).toBeLessThanOrEqual(expectedMaxConfidence);
                    }
                    
                    return true;
                }
            )
        );
    });

    test('abduction should maintain reasonable bounds based on input confidences', () => {
        fc.assert(
            fc.property(
                fc.float({min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true}),
                fc.float({min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true}),
                fc.float({min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true}),
                fc.float({min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true}),
                (f1, c1, f2, c2) => {
                    if (Number.isNaN(f1) || Number.isNaN(c1) || Number.isNaN(f2) || Number.isNaN(c2)) {
                        return true;
                    }
                    
                    const t1 = new Truth(f1, c1);
                    const t2 = new Truth(f2, c2);
                    const result = TruthFunctions.abduction(t1, t2);
                    
                    if (result) {
                        const expectedMaxConfidence = Math.min(c1 * c2, c2);
                        expect(result.confidence).toBeLessThanOrEqual(expectedMaxConfidence);
                    }
                    
                    return true;
                }
            )
        );
    });
});

describe('NAL Reasoning Edge Cases - Property Based Tests', () => {
    test('zero confidence inputs should produce appropriate results', () => {
        fc.assert(
            fc.property(
                fc.float({min: 0, max: 1, noNaN: true}),
                (f) => {
                    if (Number.isNaN(f)) {
                        return true;
                    }
                    
                    const t1 = new Truth(f, 0);
                    const t2 = new Truth(f, 0.9);
                    
                    const deductionResult = TruthFunctions.deduction(t1, t2);
                    if (deductionResult) {
                        expect(deductionResult.confidence).toBeCloseTo(0, 5);
                    }
                    
                    const inductionResult = TruthFunctions.induction(t1, t2);
                    if (inductionResult) {
                        expect(inductionResult.confidence).toBeCloseTo(0, 5);
                    }
                    
                    const abductionResult = TruthFunctions.abduction(t1, t2);
                    if (abductionResult) {
                        expect(abductionResult.confidence).toBeCloseTo(0, 5);
                    }
                    
                    return true;
                }
            )
        );
    });

    test('frequency of 0 or 1 should produce stable results', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(0, 1),
                fc.float({min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true}),
                fc.constantFrom(0, 1),
                fc.float({min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true}),
                (f1, c1, f2, c2) => {
                    if (Number.isNaN(c1) || Number.isNaN(c2)) {
                        return true;
                    }
                    
                    const t1 = new Truth(f1, c1);
                    const t2 = new Truth(f2, c2);
                    
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
                    
                    return true;
                }
            )
        );
    });
});