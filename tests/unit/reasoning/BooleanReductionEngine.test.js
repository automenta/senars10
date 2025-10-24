import { EvaluationEngine as BooleanReductionEngine } from '../../../src/reasoning/EvaluationEngine.js';
import { Term, TermType } from '../../../src/term/Term.js';
import {SYSTEM_ATOMS} from '../../../src/reasoning/SystemAtoms.js';

describe('BooleanReductionEngine (Unified)', () => {
    let reductionEngine;

    beforeEach(() => {
        reductionEngine = new BooleanReductionEngine(); // Using unified engine
    });

    test('reduces simple conjunction with True', () => {
        const andTerm = new Term(TermType.COMPOUND, null, [
            new Term(TermType.ATOM, 'A'),
            SYSTEM_ATOMS.True
        ], '&');

        const result = reductionEngine.reduce(andTerm);
        expect(result).toEqual(new Term(TermType.ATOM, 'A'));
    });

    test('reduces conjunction with False to False', () => {
        const andTerm = new Term(TermType.COMPOUND, null, [
            new Term(TermType.ATOM, 'A'),
            SYSTEM_ATOMS.False
        ], '&');

        const result = reductionEngine.reduce(andTerm);
        expect(result).toEqual(SYSTEM_ATOMS.False);
    });

    test('reduces conjunction with Null to Null', () => {
        const andTerm = new Term(TermType.COMPOUND, null, [
            new Term(TermType.ATOM, 'A'),
            SYSTEM_ATOMS.Null
        ], '&');

        const result = reductionEngine.reduce(andTerm);
        expect(result).toEqual(SYSTEM_ATOMS.Null);
    });

    test('reduces disjunction with True to True', () => {
        const orTerm = new Term(TermType.COMPOUND, null, [
            new Term(TermType.ATOM, 'A'),
            SYSTEM_ATOMS.True
        ], '|');

        const result = reductionEngine.reduce(orTerm);
        expect(result).toEqual(SYSTEM_ATOMS.True);
    });

    test('reduces disjunction with False', () => {
        const orTerm = new Term(TermType.COMPOUND, null, [
            new Term(TermType.ATOM, 'A'),
            SYSTEM_ATOMS.False
        ], '|');

        const result = reductionEngine.reduce(orTerm);
        expect(result).toEqual(new Term(TermType.ATOM, 'A'));
    });

    test('reduces double negation', () => {
        const doubleNegation = new Term(TermType.COMPOUND, null, [
            new Term(TermType.COMPOUND, null, [new Term(TermType.ATOM, 'A')], '--')
        ], '--');

        const result = reductionEngine.reduce(doubleNegation);
        expect(result).toEqual(new Term(TermType.ATOM, 'A'));
    });

    test('reduces negation of True to False', () => {
        const negation = new Term(TermType.COMPOUND, null, [SYSTEM_ATOMS.True], '--');

        const result = reductionEngine.reduce(negation);
        expect(result).toEqual(SYSTEM_ATOMS.False);
    });

    test('reduces negation of False to True', () => {
        const negation = new Term(TermType.COMPOUND, null, [SYSTEM_ATOMS.False], '--');

        const result = reductionEngine.reduce(negation);
        expect(result).toEqual(SYSTEM_ATOMS.True);
    });

    test('reduces implication with False antecedent', () => {
        const implication = new Term(TermType.COMPOUND, null, [
            SYSTEM_ATOMS.False,
            new Term(TermType.ATOM, 'B')
        ], '==>');

        const result = reductionEngine.reduce(implication);
        expect(result).toEqual(SYSTEM_ATOMS.True);
    });

    test('reduces equivalence with matching values', () => {
        const equiv = new Term(TermType.COMPOUND, null, [
            SYSTEM_ATOMS.True,
            SYSTEM_ATOMS.True
        ], '<=>');

        const result = reductionEngine.reduce(equiv);
        expect(result).toEqual(SYSTEM_ATOMS.True);
    });

    test('cascades reduction', () => {
        const nestedAnd = new Term(TermType.COMPOUND, null, [
            new Term(TermType.COMPOUND, null, [
                new Term(TermType.ATOM, 'A'),
                SYSTEM_ATOMS.True
            ], '&'),
            new Term(TermType.ATOM, 'B')
        ], '&');

        const result = reductionEngine.cascadeReduce(nestedAnd);
        // Should reduce (A & True) & B to A & B
        expect(result.operator).toBe('&');
        expect(result.components).toHaveLength(2);
        expect(result.components[0].name).toBe('A');
        expect(result.components[1].name).toBe('B');
    });

    test('returns non-compound terms unchanged', () => {
        const atom = new Term(TermType.ATOM, 'A');
        const result = reductionEngine.reduce(atom);
        expect(result).toBe(atom);
    });

    test('handles empty conjunction', () => {
        const emptyAnd = new Term(TermType.COMPOUND, null, [], '&');
        const result = reductionEngine.reduce(emptyAnd);
        expect(result).toEqual(SYSTEM_ATOMS.True);
    });

    test('handles empty disjunction', () => {
        const emptyOr = new Term(TermType.COMPOUND, null, [], '|');
        const result = reductionEngine.reduce(emptyOr);
        expect(result).toEqual(SYSTEM_ATOMS.False);
    });
});