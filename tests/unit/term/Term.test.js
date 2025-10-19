import {Term, TermType} from '../../../src/term/Term.js';
import {createCompoundTerm, createTerm} from '../../support/factories.js';

describe('Term', () => {
    test('should create atomic terms with correct properties', () => {
        const atomA = createTerm('A');
        expect(atomA.type).toBe(TermType.ATOM);
        expect(atomA.name).toBe('A');
        expect(atomA.components).toEqual(['A']); // The component of an atom is its name
        expect(atomA.complexity).toBe(1);
        expect(atomA.hash).toBeDefined();
    });

    test('should create compound terms with correct properties', () => {
        const atomA = createTerm('A');
        const atomB = createTerm('B');
        const inheritanceTerm = createCompoundTerm('-->', [atomA, atomB]);

        expect(inheritanceTerm.type).toBe(TermType.COMPOUND);
        expect(inheritanceTerm.name).toBe('(-->, A, B)');
        expect(inheritanceTerm.components).toEqual([atomA, atomB]);
        expect(inheritanceTerm.complexity).toBe(3); // 1 (op) + 1 (A) + 1 (B)
        expect(inheritanceTerm.hash).toBeDefined();
    });

    test('should maintain strict immutability', () => {
        const atom = createTerm('A');
        expect(() => {
            atom.name = 'B';
        }).toThrow(); // Should throw error in strict mode

        const compound = createCompoundTerm('-->', [createTerm('A'), createTerm('B')]);
        expect(() => {
            compound.components.push(createTerm('C'));
        }).toThrow();
    });

    test('should provide correct string representation', () => {
        const atom = createTerm('A');
        expect(atom.toString()).toBe('A');

        const compound = createCompoundTerm('-->', [createTerm('A'), createTerm('B')]);
        expect(compound.toString()).toBe('(-->, A, B)');
    });

    test('should correctly compare terms with equals()', () => {
        const atomA1 = createTerm('A');
        const atomA2 = createTerm('A');
        const atomB = createTerm('B');
        const compound1 = createCompoundTerm('-->', [atomA1, atomB]);
        const compound2 = createCompoundTerm('-->', [atomA1, atomB]);
        const compound3 = createCompoundTerm('<->', [atomA1, atomB]);

        expect(atomA1.equals(atomA2)).toBe(true);
        expect(atomA1.equals(atomB)).toBe(false);
        expect(compound1.equals(compound2)).toBe(true);
        expect(compound1.equals(compound3)).toBe(false);
        expect(atomA1.equals(null)).toBe(false);
        expect(atomA1.equals('A')).toBe(false);
    });

    test('should generate consistent hash codes', () => {
        const atomA1 = createTerm('A');
        const atomA2 = createTerm('A');
        expect(atomA1.hash).toBe(atomA2.hash);

        const compound1 = createCompoundTerm('-->', [createTerm('A'), createTerm('B')]);
        const compound2 = createCompoundTerm('-->', [createTerm('A'), createTerm('B')]);
        expect(compound1.hash).toBe(compound2.hash);
    });

    test('should handle complex nested terms', () => {
        const atomA = createTerm('A');
        const atomB = createTerm('B');
        const atomC = createTerm('C');

        const innerTerm = createCompoundTerm('-->', [atomA, atomB]);
        const outerTerm = createCompoundTerm('<->', [innerTerm, atomC]);

        expect(outerTerm.name).toBe('(<->, (-->, A, B), C)');
        expect(outerTerm.components).toEqual([innerTerm, atomC]);
        expect(outerTerm.complexity).toBe(5); // 1 (op) + 3 (inner) + 1 (C)
    });

    test('should handle commutative operators by sorting components', () => {
        const atomA = createTerm('A');
        const atomB = createTerm('B');

        // Factory sorts components for commutative operators
        const term1 = createCompoundTerm('&', [atomA, atomB]);
        const term2 = createCompoundTerm('&', [atomB, atomA]);

        // Name should be identical due to canonical sorting
        expect(term1.name).toBe('(&, A, B)');
        expect(term2.name).toBe('(&, A, B)');
        expect(term1.equals(term2)).toBe(true);
    });

    test('should implement visitor pattern correctly', () => {
        const atomA = createTerm('A');
        const atomB = createTerm('B');
        const term = createCompoundTerm('-->', [atomA, atomB]);

        const visited = [];
        const visitorFn = t => visited.push(t.name);

        term.visit(visitorFn, 'pre-order');
        expect(visited).toEqual(['(-->, A, B)', 'A', 'B']);

        visited.length = 0;
        term.visit(visitorFn, 'post-order');
        expect(visited).toEqual(['A', 'B', '(-->, A, B)']);
    });

    test('should implement reduce pattern correctly', () => {
        const atomA = createTerm('A');
        const atomB = createTerm('B');
        const term = createCompoundTerm('-->', [atomA, atomB]);

        const complexitySum = term.reduce((sum, t) => sum + t.complexity, 0);
        // (--> A, B) is 3, A is 1, B is 1. Total = 5.
        expect(complexitySum).toBe(5);

        const termNames = term.reduce((names, t) => [...names, t.name], []);
        expect(termNames).toEqual(['(-->, A, B)', 'A', 'B']);
    });

    test('should handle associativity', () => {
        const atomA = createTerm('A');
        const atomB = createTerm('B');
        const atomC = createTerm('C');

        const term1 = createCompoundTerm('&', [
            atomA,
            createCompoundTerm('&', [atomB, atomC])
        ]);

        expect(term1.name).toBe('(&, A, B, C)');
    });

    test('should handle redundancy', () => {
        const atomA = createTerm('A');

        const term = createCompoundTerm('&', [atomA, atomA]);
        expect(term.name).toBe('(&, A)');
    });

    test('should cache identical terms', () => {
        const term1 = createTerm('A');
        const term2 = createTerm('A');
        expect(term1).toBe(term2);
    });
});
