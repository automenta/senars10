import { TermFactory } from '../../src/term/TermFactory.js';
import { EvaluationEngine } from '../../src/reasoning/EvaluationEngine.js';
import { FunctorRegistry } from '../../src/reasoning/Functor.js';

describe('Higher-Order Reasoning', () => {
    let termFactory;
    let functorRegistry;
    let evaluationEngine;

    beforeEach(() => {
        termFactory = new TermFactory();
        functorRegistry = new FunctorRegistry();
        evaluationEngine = new EvaluationEngine(functorRegistry, termFactory);
    });

    test('should correctly evaluate a higher-order statement', async () => {
        // Create a higher-order statement: (Similar, (Human ==> Mortal), (Socrates ==> Mortal))
        const humanMortal = termFactory.create({ operator: '==>', components: ['Human', 'Mortal'] });
        const socratesMortal = termFactory.create({ operator: '==>', components: ['Socrates', 'Mortal'] });
        const higherOrderTerm = termFactory.create({ operator: 'Similar', components: [humanMortal, socratesMortal] });

        // Register a "Similar" functor to evaluate the similarity of two statements
        functorRegistry.registerFunctor('Similar', (a, b) => {
            // For this test, we'll just check if the operators are the same
            return a.operator === b.operator;
        }, { arity: 2 });

        const { result } = await evaluationEngine.evaluate(higherOrderTerm);

        // The result should be a Term representing 'True'
        expect(result.name).toBe('True');
    });
});
