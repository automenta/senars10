import {Term, TermType} from '../../../src/term/Term.js';
import {TermFactory} from '../../../src/term/TermFactory.js';

describe('Term', () => {
    let termFactory;

    beforeEach(() => {
        termFactory = new TermFactory();
    });

    const newAtom = name => termFactory.create({components: [name]});
    const createCompound = (operator, components) => termFactory.create({operator, components});

    test('should create atomic terms with correct properties', () => {
        const atomA = newAtom('A');
        expect(atomA.type).toBe(TermType.ATOM);
        expect(atomA.name).toBe('A');
        expect(atomA.components).toEqual(['A']); // The component of an atom is its name
        expect(atomA.complexity).toBe(1);
        expect(atomA.hash).toBeDefined();
    });

    test('should create compound terms with correct properties', () => {
        const atomA = newAtom('A');
        const atomB = newAtom('B');
        const inheritanceTerm = createCompound('-->', [atomA, atomB]);

        expect(inheritanceTerm.type).toBe(TermType.COMPOUND);
        expect(inheritanceTerm.name).toBe('(-->, A, B)');
        expect(inheritanceTerm.components).toEqual([atomA, atomB]);
        expect(inheritanceTerm.complexity).toBe(3); // 1 (op) + 1 (A) + 1 (B)
        expect(inheritanceTerm.hash).toBeDefined();
    });

    test('should maintain strict immutability', () => {
        const atom = newAtom('A');
        expect(() => {
            atom.name = 'B';
        }).toThrow(); // Should throw error in strict mode

        const compound = createCompound('-->', [newAtom('A'), newAtom('B')]);
        expect(() => {
            compound.components.push(newAtom('C'));
        }).toThrow();
    });

    test('should provide correct string representation', () => {
        const atom = newAtom('A');
        expect(atom.toString()).toBe('A');

        const compound = createCompound('-->', [newAtom('A'), newAtom('B')]);
        expect(compound.toString()).toBe('(-->, A, B)');
    });

    test('should correctly compare terms with equals()', () => {
        const atomA1 = newAtom('A');
        const atomA2 = newAtom('A');
        const atomB = newAtom('B');
        const compound1 = createCompound('-->', [atomA1, atomB]);
        const compound2 = createCompound('-->', [atomA1, atomB]);
        const compound3 = createCompound('<->', [atomA1, atomB]);

        expect(atomA1.equals(atomA2)).toBe(true);
        expect(atomA1.equals(atomB)).toBe(false);
        expect(compound1.equals(compound2)).toBe(true);
        expect(compound1.equals(compound3)).toBe(false);
        expect(atomA1.equals(null)).toBe(false);
        expect(atomA1.equals('A')).toBe(false);
    });

    test('should generate consistent hash codes', () => {
        const atomA1 = newAtom('A');
        const atomA2 = newAtom('A');
        expect(atomA1.hash).toBe(atomA2.hash);

        const compound1 = createCompound('-->', [newAtom('A'), newAtom('B')]);
        const compound2 = createCompound('-->', [newAtom('A'), newAtom('B')]);
        expect(compound1.hash).toBe(compound2.hash);
    });

    test('should handle complex nested terms', () => {
        const atomA = newAtom('A');
        const atomB = newAtom('B');
        const atomC = newAtom('C');

        const innerTerm = createCompound('-->', [atomA, atomB]);
        const outerTerm = createCompound('<->', [innerTerm, atomC]);

        expect(outerTerm.name).toBe('(<->, (-->, A, B), C)');
        expect(outerTerm.components).toEqual([innerTerm, atomC]);
        expect(outerTerm.complexity).toBe(5); // 1 (op) + 3 (inner) + 1 (C)
    });

    test('should handle commutative operators by sorting components', () => {
        const atomA = newAtom('A');
        const atomB = newAtom('B');

        // Factory sorts components for commutative operators
        const term1 = createCompound('&', [atomA, atomB]);
        const term2 = createCompound('&', [atomB, atomA]);

        // Name should be identical due to canonical sorting
        expect(term1.name).toBe('(&, A, B)');
        expect(term2.name).toBe('(&, A, B)');
        expect(term1.equals(term2)).toBe(true);
    });

    test('should implement visitor pattern correctly', () => {
        const atomA = newAtom('A');
        const atomB = newAtom('B');
        const term = createCompound('-->', [atomA, atomB]);

        const visited = [];
        const visitorFn = t => visited.push(t.name);

        term.visit(visitorFn, 'pre-order');
        expect(visited).toEqual(['(-->, A, B)', 'A', 'B']);

        visited.length = 0;
        term.visit(visitorFn, 'post-order');
        expect(visited).toEqual(['A', 'B', '(-->, A, B)']);
    });

    test('should implement reduce pattern correctly', () => {
        const atomA = newAtom('A');
        const atomB = newAtom('B');
        const term = createCompound('-->', [atomA, atomB]);

        const complexitySum = term.reduce((sum, t) => sum + t.complexity, 0);
        // (--> A, B) is 3, A is 1, B is 1. Total = 5.
        expect(complexitySum).toBe(5);

        const termNames = term.reduce((names, t) => [...names, t.name], []);
        expect(termNames).toEqual(['(-->, A, B)', 'A', 'B']);
    });

    test('should handle associativity', () => {
        const atomA = newAtom('A');
        const atomB = newAtom('B');
        const atomC = newAtom('C');

        const term1 = createCompound('&', [
            atomA,
            createCompound('&', [atomB, atomC])
        ]);

        expect(term1.name).toBe('(&, A, B, C)');
    });

    test('should handle redundancy', () => {
        const atomA = newAtom('A');

        const term = createCompound('&', [atomA, atomA]);
        expect(term.name).toBe('(&, A)');
    });

    test('should cache identical terms', () => {
        const term1 = newAtom('A');
        const term2 = newAtom('A');
        expect(term1).toBe(term2);
    });
});