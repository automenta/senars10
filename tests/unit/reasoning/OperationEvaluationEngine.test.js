import { OperationEvaluationEngine } from '../../../src/reasoning/OperationEvaluationEngine.js';
import { Functor, ConcreteFunctor } from '../../../src/reasoning/Functor.js';
import { Term } from '../../../src/term/Term.js';
import { SYSTEM_ATOMS } from '../../../src/reasoning/SystemAtoms.js';

describe('OperationEvaluationEngine', () => {
    let engine;

    beforeEach(() => {
        engine = new OperationEvaluationEngine();
    });

    test('initializes with default functors', () => {
        expect(engine.functorRegistry.has('True')).toBe(true);
        expect(engine.functorRegistry.has('False')).toBe(true);
        expect(engine.functorRegistry.has('Null')).toBe(true);
    });

    test('evaluates simple operations', async () => {
        const addFunctor = new ConcreteFunctor('add', (a, b) => a + b, { arity: 2 });
        engine.functorRegistry.register('add', addFunctor);
        
        const operationTerm = new Term('compound', null, [
            new Term('atom', 'add'),
            new Term('compound', null, [
                new Term('atom', '*'),
                new Term('atom', '2'),
                new Term('atom', '3')
            ], ',')
        ], '^');
        
        const result = await engine.evaluate(operationTerm);
        expect(result.success).toBe(true);
        expect(result.result.name).toBe('5');
    });

    test('returns null for non-operation terms', async () => {
        const nonOperation = new Term('atom', 'A');
        const result = await engine.evaluate(nonOperation);
        expect(result.success).toBe(true);
        expect(result.result).toBe(nonOperation);
    });

    test('handles invalid operation format', async () => {
        const invalidOp = new Term('compound', null, [
            new Term('atom', 'f1'),
            new Term('atom', 'arg1'),
            new Term('atom', 'arg2')
        ], '^'); // Operation with 3 components instead of 2
        
        const result = await engine.evaluate(invalidOp);
        expect(result.success).toBe(false);
        expect(result.result).toBe(SYSTEM_ATOMS.Null);
    });

    test('handles unregistered functors', async () => {
        const operationTerm = new Term('compound', null, [
            new Term('atom', 'unknownFunc'),
            new Term('compound', null, [
                new Term('atom', '*'),
                new Term('atom', '2')
            ], ',')
        ], '^');
        
        const result = await engine.evaluate(operationTerm);
        expect(result.success).toBe(false);
        expect(result.result).toBe(SYSTEM_ATOMS.Null);
    });

    test('handles variable bindings', async () => {
        const bindings = new Map();
        bindings.set('?X', new Term('atom', 'add'));
        
        // Create a functor called 'add' to be bound to the variable
        const addFunctor = new ConcreteFunctor('add', (a, b) => a + b, { arity: 2 });
        engine.functorRegistry.register('add', addFunctor);
        
        const operationTerm = new Term('compound', null, [
            new Term('atom', '?X'), // This should resolve to 'add' 
            new Term('compound', null, [
                new Term('atom', '*'),
                new Term('atom', '2'),
                new Term('atom', '3')
            ], ',')
        ], '^');
        
        const result = await engine.evaluate(operationTerm, null, bindings);
        expect(result.success).toBe(true);
        expect(result.result.name).toBe('5');
    });

    test('evaluates system atom functors', async () => {
        const trueOp = new Term('compound', null, [
            new Term('atom', 'True'),
            new Term('compound', null, [
                new Term('atom', '*')
            ], ',')
        ], '^');
        
        const result = await engine.evaluate(trueOp);
        expect(result.success).toBe(true);
        expect(result.result).toBe(SYSTEM_ATOMS.True);
    });

    test('handles operation resulting in Null', async () => {
        const nullFunctor = new ConcreteFunctor('nullOp', () => null, { arity: 1 });
        engine.functorRegistry.register('nullOp', nullFunctor);
        
        const operationTerm = new Term('compound', null, [
            new Term('atom', 'nullOp'),
            new Term('compound', null, [
                new Term('atom', '*'),
                new Term('atom', 'arg')
            ], ',')
        ], '^');
        
        const result = await engine.evaluate(operationTerm);
        expect(result.success).toBe(false);
        expect(result.result).toBe(SYSTEM_ATOMS.Null);
    });

    test('handles functor execution errors', async () => {
        const errorFunctor = new ConcreteFunctor('errorFunc', () => { throw new Error('Test error'); }, { arity: 1 });
        engine.functorRegistry.register('errorFunc', errorFunctor);
        
        const operationTerm = new Term('compound', null, [
            new Term('atom', 'errorFunc'),
            new Term('compound', null, [
                new Term('atom', '*'),
                new Term('atom', 'arg')
            ], ',')
        ], '^');
        
        const result = await engine.evaluate(operationTerm);
        expect(result.success).toBe(false);
        expect(result.result).toBe(SYSTEM_ATOMS.Null);
    });
});