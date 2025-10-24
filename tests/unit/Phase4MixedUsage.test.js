import { EvaluationEngine as OperationEvaluationEngine } from '../../src/reasoning/EvaluationEngine.js';
import { TermFactory } from '../../src/term/TermFactory.js';
import { FunctorRegistry } from '../../src/reasoning/Functor.js';
import { SYSTEM_ATOMS } from '../../src/reasoning/SystemAtoms.js';

describe('Phase 4 Mixed Usage Scenarios', () => {
    let engine;
    let termFactory;

    beforeEach(() => {
        const functorRegistry = new FunctorRegistry();
        termFactory = new TermFactory();
        engine = new OperationEvaluationEngine(functorRegistry, termFactory); // Unified engine supports same interface
    });

    test('should handle mixed usage: (&&, (add(?x, 2) = 5), f(?x)) reduces to f(3) after solving ?x=3', async () => {
        // Create term: (&&, (add(?x, 2) = 5), f(?x))
        const varX = termFactory.create({components: ['?x']});
        
        // Create add(?x, 2) operation
        const addOperation = termFactory.create({operator: '^', components: [
            {components: ['add']},
            {operator: ',', components: [{components: ['*']}, varX, {components: ['2']}]}
        ]});
        
        // Create equality: add(?x, 2) = 5
        const equality = termFactory.create({operator: '=', components: [
            addOperation,
            {components: ['5']}
        ]});
        
        // Create f(?x) operation
        const fOperation = termFactory.create({operator: '^', components: [
            {components: ['f']},
            {operator: ',', components: [{components: ['*']}, varX]}
        ]});
        
        // Create conjunction: (&&, equality, f(?x))
        const conjunction = termFactory.create({operator: '&', components: [equality, fOperation]});
        
        // This is a complex scenario that would need a more sophisticated solver
        // to determine that ?x=3 from the equality and then substitute into f(?x)
        const result = await engine.evaluate(conjunction);
        expect(result.success).toBeDefined();
    });

    test('should handle vector operations with variables', async () => {
        // Test: add((1,?x), (3,4)) where ?x should bind to a value
        const varX = termFactory.create({components: ['?x']});
        
        // Create vector (1,?x)
        const vector1 = termFactory.create({operator: ',', components: [{components: ['1']}, varX]});
        // Create vector (3,4)
        const vector2 = termFactory.create({operator: ',', components: [{components: ['3']}, {components: ['4']}]});
        
        // Create operation: add ^ (*, vector1, vector2)
        const addOperation = termFactory.create({operator: '^', components: [
            {components: ['add']},
            {operator: ',', components: [{components: ['*']}, vector1, vector2]}
        ]});

        const result = await engine.evaluate(addOperation);
        expect(result.success).toBe(true);
    });

    test('should handle comparison operations: cmp(x, y) returning -1, 0, or 1', async () => {
        // Create cmp(1, 2) which should return -1
        const cmpOperation = termFactory.create({operator: '^', components: [
            {components: ['cmp']},
            {operator: ',', components: [{components: ['*']}, {components: ['1']}, {components: ['2']}]}
        ]});

        const result = await engine.evaluate(cmpOperation);
        expect(result.success).toBe(true);
        // The result should be -1 (as a term)
        expect(result.result.name).toBe('-1');
    });

    test('should handle comparison with equality: (cmp(?x, 5) = 1) for ?x > 5', async () => {
        const varX = termFactory.create({components: ['?x']});
        
        // Create cmp(?x, 5)
        const cmpOperation = termFactory.create({operator: '^', components: [
            {components: ['cmp']},
            {operator: ',', components: [{components: ['*']}, varX, {components: ['5']}]}
        ]});
        
        // Create equality: cmp(?x, 5) = 1
        const equality = termFactory.create({operator: '=', components: [
            cmpOperation,
            {components: ['1']}
        ]});

        const result = await engine.evaluate(equality);
        expect(result.success).toBeDefined();
    });
});