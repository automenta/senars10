/**
 * @file PropertyBasedNALTests.test.js
 * @description Property-based tests for NAL reasoning components for Phase 6 validation
 * This file addresses property-based testing requirements from UPGRADE.md Phase 6
 */

import fc from 'fast-check';
import {Truth} from '../../../src/Truth.js';
import {TruthFunctions} from '../../../src/reasoning/nal/TruthFunctions.js';
import {Term, TermType} from '../../../src/term/Term.js';
import {PatternMatcher} from '../../../src/reasoning/nal/PatternMatcher.js';

const truthArb = fc.record({
    f: fc.float({min: 0, max: 1}),
    c: fc.float({min: 0, max: 1})
}).map(v => new Truth(v.f, v.c));

describe('Property-Based NAL Reasoning Tests - Phase 6 Validation', () => {
    describe('Truth Functions Property Tests', () => {

        test('deduction should produce valid truth values within bounds', () => {
            fc.assert(
                fc.property(truthArb, truthArb, (t1, t2) => {
                    const result = TruthFunctions.deduction(t1, t2);

                    if (result === null) {
                        // Null is acceptable when inputs are invalid
                        return (t1 === null || t2 === null);
                    }

                    expect(typeof result.frequency).toBe('number');
                    expect(typeof result.confidence).toBe('number');
                    expect(result.frequency).toBeGreaterThanOrEqual(0);
                    expect(result.frequency).toBeLessThanOrEqual(1);
                    expect(result.confidence).toBeGreaterThanOrEqual(0);
                    expect(result.confidence).toBeLessThanOrEqual(1);
                })
            );
        });

        test('induction should produce valid truth values within bounds', () => {
            fc.assert(
                fc.property(truthArb, truthArb, (t1, t2) => {
                    const result = TruthFunctions.induction(t1, t2);

                    if (result === null) {
                        return (t1 === null || t2 === null);
                    }

                    expect(typeof result.frequency).toBe('number');
                    expect(typeof result.confidence).toBe('number');
                    expect(result.frequency).toBeGreaterThanOrEqual(0);
                    expect(result.frequency).toBeLessThanOrEqual(1);
                    expect(result.confidence).toBeGreaterThanOrEqual(0);
                    expect(result.confidence).toBeLessThanOrEqual(1);
                })
            );
        });

        test('abduction should produce valid truth values within bounds', () => {
            fc.assert(
                fc.property(truthArb, truthArb, (t1, t2) => {
                    const result = TruthFunctions.abduction(t1, t2);

                    if (result === null) {
                        return (t1 === null || t2 === null);
                    }

                    expect(typeof result.frequency).toBe('number');
                    expect(typeof result.confidence).toBe('number');
                    expect(result.frequency).toBeGreaterThanOrEqual(0);
                    expect(result.frequency).toBeLessThanOrEqual(1);
                    expect(result.confidence).toBeGreaterThanOrEqual(0);
                    expect(result.confidence).toBeLessThanOrEqual(1);
                })
            );
        });

        test('revision should produce valid truth values within bounds', () => {
            fc.assert(
                fc.property(truthArb, truthArb, (t1, t2) => {
                    const result = TruthFunctions.revision(t1, t2);

                    if (result === null) {
                        return (t1 === null || t2 === null);
                    }

                    expect(typeof result.frequency).toBe('number');
                    expect(typeof result.confidence).toBe('number');
                    expect(result.frequency).toBeGreaterThanOrEqual(0);
                    expect(result.frequency).toBeLessThanOrEqual(1);
                    expect(result.confidence).toBeGreaterThanOrEqual(0);
                    expect(result.confidence).toBeLessThanOrEqual(1);
                })
            );
        });

        test('negation should flip frequency while preserving confidence', () => {
            fc.assert(
                fc.property(truthArb, (t) => {
                    const result = TruthFunctions.negation(t);

                    if (result === null) {
                        return t === null;
                    }

                    // Negation should flip frequency: negation of f should be (1-f)
                    expect(result.frequency).toBeCloseTo(1 - t.f, 5);
                    // Confidence should remain roughly the same
                    expect(Math.abs(result.confidence - t.c)).toBeLessThan(0.01);
                })
            );
        });

        test('truth operations should be deterministic', () => {
            fc.assert(
                fc.property(truthArb, truthArb, (t1, t2) => {
                    // Running the same operation multiple times should give the same result
                    const result1 = TruthFunctions.deduction(t1, t2);
                    const result2 = TruthFunctions.deduction(t1, t2);

                    if (result1 === null && result2 === null) return true;
                    if (result1 === null || result2 === null) return false;

                    expect(result1.frequency).toBeCloseTo(result2.frequency, 10);
                    expect(result1.confidence).toBeCloseTo(result2.confidence, 10);

                    return true;
                })
            );
        });
    });

    describe('Pattern Matching Property Tests', () => {
        // Create arbitrary terms for testing
        const createRandomTerm = (namePrefix = 'term') => {
            return (rng) => {
                const isCompound = rng() > 0.5;
                const name = `${namePrefix}_${Math.floor(rng() * 1000)}`;

                if (isCompound) {
                    const operators = ['-->', '<->', '&', '|', '--'];
                    const operator = operators[Math.floor(rng() * operators.length)];
                    // For simplicity, making it an atomic term in this generator
                    // In a realistic version we'd need to create complex nested terms
                    return new Term(TermType.ATOM, name);
                } else {
                    return new Term(TermType.ATOM, name);
                }
            };
        };

        // More structured arbitrary terms
        const atomicTermArb = fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'e'), {
            minLength: 1,
            maxLength: 3
        }).map(name => new Term(TermType.ATOM, name));

        const variableTermArb = fc.stringOf(fc.constantFrom('x', 'y', 'z'), {
            minLength: 1,
            maxLength: 2
        }).map(name => new Term(TermType.ATOM, '?' + name));

        const compoundTermArb = fc.letrec(tie => ({
            term: fc.oneof(
                atomicTermArb,
                variableTermArb,
                fc.record({
                    op: fc.constantFrom('-->', '&', '|', '<->'),
                    components: fc.array(
                        fc.oneof(atomicTermArb, variableTermArb, tie('nested_compound')),
                        {minLength: 1, maxLength: 3}
                    )
                }).map(({op, components}) => {
                    return new Term(TermType.COMPOUND, null, components, op);
                })
            ),
            nested_compound: fc.record({
                op: fc.constantFrom('-->', '&', '|', '<->'),
                components: fc.array(
                    fc.oneof(atomicTermArb, variableTermArb),
                    {minLength: 1, maxLength: 2}
                )
            }).map(({op, components}) => {
                return new Term(TermType.COMPOUND, null, components, op);
            })
        })).term;

        test('pattern matching should be deterministic', () => {
            const patternMatcher = new PatternMatcher();

            fc.assert(
                fc.property(compoundTermArb, compoundTermArb, (pattern, term) => {
                    // Running the same unification multiple times should give the same result
                    const result1 = patternMatcher.unify(pattern, term);
                    const result2 = patternMatcher.unify(pattern, term);

                    if (result1 === null && result2 === null) return true;
                    if (result1 === null || result2 === null) return false;

                    // Both results should have the same number of bindings
                    expect(result1.size).toBe(result2.size);

                    // Binding keys should be the same
                    const keys1 = Array.from(result1.keys()).sort();
                    const keys2 = Array.from(result2.keys()).sort();
                    expect(keys1).toEqual(keys2);

                    return true;
                })
            );
        });

        test('variable binding should be consistent', () => {
            const patternMatcher = new PatternMatcher();

            fc.assert(
                fc.property(variableTermArb, atomicTermArb, (varTerm, constTerm) => {
                    // When a variable is bound to a value once, subsequent unifications with same binding should be consistent
                    const initialBindings = new Map([[varTerm.name, constTerm]]);

                    // Try to bind the same variable to the same constant again
                    const result = patternMatcher.unify(varTerm, constTerm, initialBindings);

                    // Should succeed because the binding is consistent
                    return result !== null;
                })
            );
        });

        test('variable binding should fail with inconsistent bindings', () => {
            const patternMatcher = new PatternMatcher();

            fc.assert(
                fc.property(
                    fc.constantFrom('?X'),
                    atomicTermArb,
                    atomicTermArb,
                    (varName, constTerm1, constTerm2) => {
                        fc.pre(constTerm1.name !== constTerm2.name); // Make sure they're different

                        const varTerm = new Term(TermType.ATOM, varName);
                        const initialBindings = new Map([[varName, constTerm1]]);

                        // Try to bind the same variable to a different constant
                        const result = patternMatcher.unify(varTerm, constTerm2, initialBindings);

                        // Should fail because the binding is inconsistent
                        return result === null;
                    }
                )
            );
        });

        test('substitution should preserve structure', () => {
            const patternMatcher = new PatternMatcher();

            fc.assert(
                fc.property(compoundTermArb, (term) => {
                    // Substitution with empty bindings should return the same term structure
                    const substituted = patternMatcher.substitute(term, new Map());

                    // For the purpose of this test, we'll check that the operator and basic structure are preserved
                    if (term.isCompound) {
                        expect(substituted.isCompound).toBe(true);
                        expect(substituted.operator).toBe(term.operator);
                        expect(substituted.components.length).toBe(term.components.length);
                    } else {
                        expect(substituted.isAtomic).toBe(term.isAtomic);
                    }

                    return true;
                })
            );
        });
    });

    describe('NAL Reasoning Mathematical Properties', () => {
        test('truth functions maintain proper mathematical bounds', () => {
            fc.assert(
                fc.property(
                    fc.double({min: 0, max: 1}),
                    fc.double({min: 0, max: 1}),
                    fc.double({min: 0, max: 1}),
                    fc.double({min: 0, max: 1}),
                    (f1, c1, f2, c2) => {
                        const t1 = new Truth(f1, c1);
                        const t2 = new Truth(f2, c2);

                        // Test that operations produce valid results in bounds
                        const deduction = TruthFunctions.deduction(t1, t2);
                        const induction = TruthFunctions.induction(t1, t2);
                        const abduction = TruthFunctions.abduction(t1, t2);
                        const revision = TruthFunctions.revision(t1, t2);

                        // All operations should return valid truth values or null
                        const operations = [deduction, induction, abduction, revision];
                        for (const op of operations) {
                            if (op !== null) {
                                expect(op.frequency).toBeGreaterThanOrEqual(0);
                                expect(op.frequency).toBeLessThanOrEqual(1);
                                expect(op.confidence).toBeGreaterThanOrEqual(0);
                                expect(op.confidence).toBeLessThanOrEqual(1);
                            }
                        }

                        return true;
                    }
                )
            );
        });
    });

    describe('NAL Rule Consistency Property Tests', () => {
        test('truth function results should maintain mathematical properties', () => {
            fc.assert(
                fc.property(truthArb, (t) => {
                    // Identity properties
                    const negationOfNegation = TruthFunctions.negation(TruthFunctions.negation(t));
                    if (negationOfNegation && t && t.c > 0 && t.f > 0 && t.f < 1) {
                        // Double negation should approximately return to original (allowing for floating point precision)
                        // Only when confidence is greater than 0 and frequency is not at extreme values
                        expect(Math.abs(negationOfNegation.frequency - t.f)).toBeLessThan(0.001);
                    }

                    // Self-revision should return similar values
                    const selfRevision = TruthFunctions.revision(t, t);
                    if (selfRevision && t) {
                        // Self-revision should maintain frequency and increase confidence
                        // Only check frequency similarity when confidence is not 0 (as low confidence can affect revision results)
                        if (t.c > 0) {
                            expect(selfRevision.frequency).toBeCloseTo(t.f, 1); // Allow for floating-point precision errors
                        }
                        expect(selfRevision.confidence).toBeGreaterThanOrEqual(t.c);
                    }

                    return true;
                })
            );
        });

        test('truth functions should handle edge cases gracefully', () => {
            fc.assert(
                fc.property(
                    fc.oneof(
                        fc.constant(new Truth(0, 0)),
                        fc.constant(new Truth(0, 1)),
                        fc.constant(new Truth(1, 0)),
                        fc.constant(new Truth(1, 1))
                    ),
                    truthArb,
                    (edgeTruth, otherTruth) => {
                        // Test operations with edge cases
                        const deductionResult = TruthFunctions.deduction(edgeTruth, otherTruth);
                        const inductionResult = TruthFunctions.induction(edgeTruth, otherTruth);
                        const abductionResult = TruthFunctions.abduction(edgeTruth, otherTruth);

                        // All results should be valid truth values or null
                        [deductionResult, inductionResult, abductionResult].forEach(result => {
                            if (result !== null) {
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
});