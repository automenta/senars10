import { EvaluationEngine as OperationEvaluationEngine } from '../../../src/reasoning/EvaluationEngine.js';
import {TermFactory} from '../../../src/term/TermFactory.js';

describe('OperationEvaluationEngine (Unified)', () => {
    let engine, termFactory;

    beforeEach(() => {
        engine = new OperationEvaluationEngine();
        termFactory = new TermFactory();
    });

    test('should initialize with default functors', () => {
        expect(engine.functorRegistry.has('True')).toBe(true);
        expect(engine.functorRegistry.has('False')).toBe(true);
        expect(engine.functorRegistry.has('Null')).toBe(true);
        expect(engine.functorRegistry.has('add')).toBe(true);
        expect(engine.functorRegistry.has('subtract')).toBe(true);
        expect(engine.functorRegistry.has('multiply')).toBe(true);
        expect(engine.functorRegistry.has('divide')).toBe(true);
        expect(engine.functorRegistry.has('cmp')).toBe(true);
    });

    test('should evaluate addition operation', async () => {
        const opTerm = termFactory.create({
            operator: '^', components: [
                'add',
                {operator: ',', components: ['2', '3']}
            ]
        });

        const result = await engine.evaluate(opTerm);
        expect(result.success).toBe(true);
        expect(result.result.name).toBe('5');
    });

    test('should evaluate subtraction operation', async () => {
        const opTerm = termFactory.create({
            operator: '^', components: [
                'subtract',
                {operator: ',', components: ['5', '2']}
            ]
        });

        const result = await engine.evaluate(opTerm);
        expect(result.success).toBe(true);
        expect(result.result.name).toBe('3');
    });

    test('should evaluate multiplication operation', async () => {
        const opTerm = termFactory.create({
            operator: '^', components: [
                'multiply',
                {operator: ',', components: ['4', '3']}
            ]
        });

        const result = await engine.evaluate(opTerm);
        expect(result.success).toBe(true);
        expect(result.result.name).toBe('12');
    });

    test('should evaluate division operation', async () => {
        const opTerm = termFactory.create({
            operator: '^', components: [
                'divide',
                {operator: ',', components: ['12', '4']}
            ]
        });

        const result = await engine.evaluate(opTerm);
        expect(result.success).toBe(true);
        expect(result.result.name).toBe('3');
    });

    test('should handle division by zero', async () => {
        const opTerm = termFactory.create({
            operator: '^', components: [
                'divide',
                {operator: ',', components: ['5', '0']}
            ]
        });

        const result = await engine.evaluate(opTerm);
        expect(result.success).toBe(false); // Division by zero results in failure
        expect(result.result.name).toBe('Null'); // Result is Null atom representing invalid operation
    });

    test('should solve simple addition equation', async () => {
        const leftTerm = termFactory.create({
            operator: '^', components: [
                'add',
                {operator: ',', components: ['2', '?x']}
            ]
        });
        const rightTerm = termFactory.create('5');

        const result = await engine.solveEquation(leftTerm, rightTerm, '?x');
        expect(result.success).toBe(true);
        expect(result.result.name).toBe('3');
    });

    test('should solve simple subtraction equation', async () => {
        const leftTerm = termFactory.create({
            operator: '^', components: [
                'subtract',
                {operator: ',', components: ['?x', '2']}
            ]
        });
        const rightTerm = termFactory.create('3');

        const result = await engine.solveEquation(leftTerm, rightTerm, '?x');
        expect(result.success).toBe(true);
        expect(result.result.name).toBe('5');
    });

    test('should solve equation with first argument as variable', async () => {
        const leftTerm = termFactory.create({
            operator: '^', components: [
                'subtract',
                {operator: ',', components: ['?y', '4']}
            ]
        });
        const rightTerm = termFactory.create('6');

        const result = await engine.solveEquation(leftTerm, rightTerm, '?y');
        expect(result.success).toBe(true);
        expect(result.result.name).toBe('10');
    });

    test('should solve multiplication equation', async () => {
        const leftTerm = termFactory.create({
            operator: '^', components: [
                'multiply',
                {operator: ',', components: ['?z', '5']}
            ]
        });
        const rightTerm = termFactory.create('20');

        const result = await engine.solveEquation(leftTerm, rightTerm, '?z');
        expect(result.success).toBe(true);
        expect(result.result.name).toBe('4');
    });

    test('should solve division equation', async () => {
        const leftTerm = termFactory.create({
            operator: '^', components: [
                'divide',
                {operator: ',', components: ['?w', '4']}
            ]
        });
        const rightTerm = termFactory.create('5');

        const result = await engine.solveEquation(leftTerm, rightTerm, '?w');
        expect(result.success).toBe(true);
        expect(result.result.name).toBe('20');
    });

    test('should handle non-operation terms', async () => {
        const term = termFactory.create('simpleTerm');
        const result = await engine.evaluate(term);
        expect(result.success).toBe(true);
        expect(result.result.name).toBe('simpleTerm');
    });

    test('should handle variable substitution in non-operation terms', async () => {
        const bindings = new Map();
        bindings.set('?x', termFactory.create('5'));
        const term = termFactory.create('?x');
        const result = await engine.evaluate(term, null, bindings);
        expect(result.success).toBe(true);
        expect(result.result.name).toBe('5');
    });

    test('should handle invalid operation format', async () => {
        const invalidTerm = termFactory.create({operator: '^', components: ['func']}); // Only one component
        const result = await engine.evaluate(invalidTerm);
        expect(result.success).toBe(false);
        expect(result.result.name).toBe('Null');
    });

    test('should handle unknown functor', async () => {
        const opTerm = termFactory.create({
            operator: '^', components: [
                'unknownFunctor',
                {operator: ',', components: ['1', '2']}
            ]
        });

        const result = await engine.evaluate(opTerm);
        expect(result.success).toBe(false);
        expect(result.result.name).toBe('Null');
    });

    test('should convert values to terms and vice versa', () => {
        const trueTerm = engine._valueToTerm(true);
        expect(trueTerm.name).toBe('True');

        const falseTerm = engine._valueToTerm(false);
        expect(falseTerm.name).toBe('False');

        const nullTerm = engine._valueToTerm(null);
        expect(nullTerm.name).toBe('Null');

        const numberTerm = engine._valueToTerm(42);
        expect(numberTerm.name).toBe('42');

        const backToValue = engine._termToValue(trueTerm);
        expect(backToValue).toBe(true);
    });

    test('should handle error during functor execution', async () => {
        engine.addFunctor('errorFunctor', () => {
            throw new Error('Test error');
        }, {arity: 0});
        const opTerm = termFactory.create({
            operator: '^', components: [
                'errorFunctor',
                {operator: ',', components: ['1']}
            ]
        });

        const result = await engine.evaluate(opTerm);
        expect(result.success).toBe(false);
        expect(result.result.name).toBe('Null');
    });

    test('should handle complex terms with variable substitution', async () => {
        const bindings = new Map();
        bindings.set('?a', termFactory.create('10'));
        const complexTerm = termFactory.create({
            operator: '^', components: [
                'add',
                {operator: ',', components: ['?a', '5']}
            ]
        });

        const result = await engine.evaluate(complexTerm, null, bindings);
        expect(result.success).toBe(true);
        expect(result.result.name).toBe('15');
    });

    test('should solve equation with non-existent variable', async () => {
        const leftTerm = termFactory.create({
            operator: '^', components: [
                'add',
                {operator: ',', components: ['2', '?x']}
            ]
        });
        const rightTerm = termFactory.create('5');

        const result = await engine.solveEquation(leftTerm, rightTerm, '?y'); // Different variable
        expect(result.success).toBe(false);
        expect(result.result.name).toBe('Null');
    });

    test('should handle direct variable assignment', async () => {
        const leftTerm = termFactory.create('?x');
        const rightTerm = termFactory.create('42');

        const result = await engine.solveEquation(leftTerm, rightTerm, '?x');
        expect(result.success).toBe(true);
        expect(result.result.name).toBe('42');
        expect(result.solvedVariable).toBe('?x');
    });

    test('should solve equality equation with variable on left side', async () => {
        const leftTerm = termFactory.create({operator: '=', components: ['?x', '5']});
        const rightTerm = termFactory.create('True');

        const result = await engine.solveEquation(leftTerm, rightTerm, '?x');
        expect(result.success).toBe(true);
        expect(result.result.name).toBe('5');
    });

    test('should solve equality equation with variable on right side', async () => {
        const leftTerm = termFactory.create({operator: '=', components: ['3', '?y']});
        const rightTerm = termFactory.create('True');

        const result = await engine.solveEquation(leftTerm, rightTerm, '?y');
        expect(result.success).toBe(true);
        expect(result.result.name).toBe('3');
    });

    test('should solve operation equation within equality', async () => {
        const equalityTerm = termFactory.create({
            operator: '=',
            components: [
                {operator: '^', components: ['add', {operator: ',', components: ['2', '?x']}]},
                '5'
            ]
        });
        const rightTerm = termFactory.create('True');

        const result = await engine.solveEquation(equalityTerm, rightTerm, '?x');
        expect(result.success).toBe(true);
        expect(result.result.name).toBe('3');
    });

    test('should handle functor with string return value', async () => {
        engine.addFunctor('echo', (x) => `echo: ${x}`, {arity: 1});
        const opTerm = termFactory.create({
            operator: '^', components: [
                'echo',
                {operator: ',', components: ['hello']}
            ]
        });

        const result = await engine.evaluate(opTerm);
        expect(result.success).toBe(true);
        expect(result.result.name).toBe('echo: hello');
    });



    test('should handle nested compound term evaluation', async () => {
        const bindings = new Map();
        bindings.set('?x', termFactory.create('2'));
        const nestedTerm = termFactory.create({
            operator: '^', components: [
                'add',
                {
                    operator: ',', components: [
                        {operator: '^', components: ['add', {operator: ',', components: ['?x', '3']}]},
                        '4'
                    ]
                }
            ]
        });

        const result = await engine.evaluate(nestedTerm, null, bindings);
        // This test is to verify that engine can now handle nested operations properly
        // Should evaluate inner: add(2, 3) = 5, then outer: add(5, 4) = 9
        expect(result.success).toBe(true);
        expect(result.result.name).toBe('9');
    });

    test('should handle NaN result', async () => {
        const opTerm = termFactory.create({
            operator: '^', components: [
                'divide',
                {operator: ',', components: ['0', '0']}
            ]
        });

        const result = await engine.evaluate(opTerm);
        expect(result.success).toBe(false);
        expect(result.result.name).toBe('Null');
    });
});