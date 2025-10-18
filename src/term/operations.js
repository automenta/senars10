import {Truth} from '../Truth.js';

// TruthFunctions consolidated to use methods in Truth class to eliminate duplication
export const TruthFunctions = {
    // Delegating to Truth class methods to avoid duplication
    validateInputs: (t1, t2) => Truth._validateInputs(t1, t2),
    validateInput: (t) => Truth._validateInput(t),
    combineConfidence: (c1, c2) => Truth._combineConfidence(c1, c2),
    averageFrequency: (f1, f2) => Truth._averageFrequency(f1, f2),
    safeDivide: (numerator, denominator) => Truth._safeDivide(numerator, denominator),

    // NAL truth value functions - delegate to Truth class where available
    revision: Truth.revision,
    deduction: Truth.deduction,
    induction: Truth.induction,
    abduction: Truth.abduction,
    exemplification: Truth.exemplification,
    comparison: Truth.comparison,
    negation: Truth.negation,
    contraposition: Truth.contraposition,
    analogy: Truth.analogy,
    resemblance: Truth.resemblance,
    expectation: Truth.expectation,

    // Functions that are unique to TruthFunctions
    isEqual: (t1, t2) => t1 && t2 && Math.abs(t1.f - t2.f) < 1e-10 && Math.abs(t1.c - t2.c) < 1e-10,
    isMoreConfident: Truth.isMoreConfident,
    isStronger: Truth.isStronger,

    _weak: Truth._weak
};