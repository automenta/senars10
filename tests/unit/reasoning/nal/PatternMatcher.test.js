import {PatternMatcher} from '../../../../src/reasoning/nal/PatternMatcher.js';
import {Term, TermType} from '../../../../src/term/Term.js';

describe('PatternMatcher', () => {
    let patternMatcher;

    beforeEach(() => {
        patternMatcher = new PatternMatcher();
    });

    describe('Basic Unification', () => {
        it('should unify identical atomic terms', () => {
            const term1 = new Term(TermType.ATOM, 'A');
            const term2 = new Term(TermType.ATOM, 'A');

            const result = patternMatcher.unify(term1, term2);
            expect(result).not.toBeNull();
            expect(result.size).toBe(0); // No variables to bind
        });

        it('should fail to unify different atomic terms', () => {
            const pattern = new Term(TermType.ATOM, 'A');
            const term = new Term(TermType.ATOM, 'B');

            const result = patternMatcher.unify(pattern, term);
            expect(result).toBeNull();
        });

        it('should bind variables to terms', () => {
            const pattern = new Term(TermType.ATOM, '?X');  // Variable
            const term = new Term(TermType.ATOM, 'A');

            const result = patternMatcher.unify(pattern, term);
            expect(result).not.toBeNull();
            expect(result.size).toBe(1);
            expect(result.get('?X')).toEqual(term);
        });

        it('should handle variable consistency', () => {
            const bindings = new Map();
            bindings.set('?X', new Term(TermType.ATOM, 'A'));

            // Try to bind ?X to a different value
            const pattern = new Term(TermType.ATOM, '?X');
            const term = new Term(TermType.ATOM, 'B');

            const result = patternMatcher.unify(pattern, term, bindings);
            expect(result).toBeNull(); // Should fail due to inconsistent binding
        });
    });

    describe('Compound Term Unification', () => {
        it('should unify simple compound terms', () => {
            const pattern = new Term(TermType.COMPOUND, null, [
                new Term(TermType.ATOM, 'A'),
                new Term(TermType.ATOM, 'B')
            ], '&');

            const term = new Term(TermType.COMPOUND, null, [
                new Term(TermType.ATOM, 'A'),
                new Term(TermType.ATOM, 'B')
            ], '&');

            const result = patternMatcher.unify(pattern, term);
            expect(result).not.toBeNull();
            expect(result.size).toBe(0);
        });

        it('should unify compound terms with variables', () => {
            const pattern = new Term(TermType.COMPOUND, null, [
                new Term(TermType.ATOM, '?X'),
                new Term(TermType.ATOM, 'B')
            ], '&');

            const term = new Term(TermType.COMPOUND, null, [
                new Term(TermType.ATOM, 'A'),
                new Term(TermType.ATOM, 'B')
            ], '&');

            const result = patternMatcher.unify(pattern, term);
            expect(result).not.toBeNull();
            expect(result.size).toBe(1);
            expect(result.get('?X').name).toBe('A');
        });
    });

    describe('Multiple Unification', () => {
        it('should unify multiple pattern-term pairs', () => {
            const patternTermPairs = [
                {
                    pattern: new Term(TermType.ATOM, '?X'),
                    term: new Term(TermType.ATOM, 'A')
                },
                {
                    pattern: new Term(TermType.ATOM, '?Y'),
                    term: new Term(TermType.ATOM, 'B')
                }
            ];

            const result = patternMatcher.unifyMultiple(patternTermPairs);
            expect(result).not.toBeNull();
            expect(result.size).toBe(2);
            expect(result.get('?X').name).toBe('A');
            expect(result.get('?Y').name).toBe('B');
        });

        it('should fail when one unification fails', () => {
            const patternTermPairs = [
                {
                    pattern: new Term(TermType.ATOM, '?X'),
                    term: new Term(TermType.ATOM, 'A')
                },
                {
                    pattern: new Term(TermType.ATOM, 'B'),  // Not a variable - should match exactly
                    term: new Term(TermType.ATOM, 'C')     // Different from B
                }
            ];

            const result = patternMatcher.unifyMultiple(patternTermPairs);
            expect(result).toBeNull(); // Should fail due to inconsistent match
        });
    });

    describe('Substitution', () => {
        it('should substitute variables in terms', () => {
            const bindings = new Map();
            bindings.set('?X', new Term(TermType.ATOM, 'A'));

            const term = new Term(TermType.ATOM, '?X');
            const result = patternMatcher.substitute(term, bindings);

            expect(result.name).toBe('A');
        });

        it('should substitute variables in compound terms', () => {
            const bindings = new Map();
            bindings.set('?X', new Term(TermType.ATOM, 'A'));
            bindings.set('?Y', new Term(TermType.ATOM, 'B'));

            const term = new Term(TermType.COMPOUND, null, [
                new Term(TermType.ATOM, '?X'),
                new Term(TermType.ATOM, '?Y')
            ], '&');

            const result = patternMatcher.substitute(term, bindings);

            expect(result.isCompound).toBe(true);
            expect(result.components.length).toBe(2);
            expect(result.components[0].name).toBe('A');
            expect(result.components[1].name).toBe('B');
        });
    });
});