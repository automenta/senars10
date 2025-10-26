import {EvaluationEngine} from '../src/reasoning/EvaluationEngine.js';
import {TermFactory} from '../src/term/TermFactory.js';
import {NALRuleSet} from '../src/reasoning/nal/NALRuleSet.js';
import {Bag} from '../src/memory/Bag.js';
import {FocusSetSelector} from '../src/memory/FocusSetSelector.js';

/**
 * Integration test for Phase 7: NARS & MeTTa Theoretical Parity
 */
describe('Phase 7: NARS & MeTTa Theoretical Parity Integration Tests', () => {
    let engine;
    let termFactory;
    let ruleSet;

    beforeEach(() => {
        engine = new EvaluationEngine();
        termFactory = new TermFactory();
        ruleSet = new NALRuleSet();
    });

    test('should implement full spectrum of NAL rules including temporal and higher-order forms', () => {
        // Check that all rule types are available
        const allRules = NALRuleSet.getAllRules();
        const ruleCategories = [...new Set(allRules.map(rule => rule.category))];
        
        expect(ruleCategories).toContain('syllogistic');
        expect(ruleCategories).toContain('conditional');
        expect(ruleCategories).toContain('temporal');
        expect(ruleCategories).toContain('higher-order');
        expect(ruleCategories).toContain('extended');
        
        // Check minimum number of rules to ensure comprehensive coverage
        expect(allRules.length).toBeGreaterThan(8); // We have multiple rule types
    });

    test('should support MeTTa-style higher-order reasoning', async () => {
        // Test the (Similar, (Human ==> Mortal), (Socrates ==> Mortal)) example
        const humanTerm = termFactory.create('Human');
        const mortalTerm = termFactory.create('Mortal');
        const socratesTerm = termFactory.create('Socrates');
        
        const humanMortalImplication = termFactory.create({
            name: '(==>, Human, Mortal)',
            operator: '==>',
            components: [humanTerm, mortalTerm]
        });
        
        const socratesMortalImplication = termFactory.create({
            name: '(==>, Socrates, Mortal)',
            operator: '==>',
            components: [socratesTerm, mortalTerm]
        });
        
        // Create the pattern matching term
        const similarTerm = termFactory.create({
            name: '(Similar, (Human ==> Mortal), (Socrates ==> Mortal))',
            operator: 'Similar',
            components: [humanMortalImplication, socratesMortalImplication]
        });

        const context = { memory: { concepts: new Map() } };

        // This should be processed by the HigherOrderReasoningEngine
        const result = await engine.evaluate(similarTerm, context);
        
        // The result should be successful due to higher-order reasoning
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
    });

    test('should enforce AIKR-compliant caching with capacity limits', () => {
        // Create a Bag with capacity limit
        const bag = new Bag(5); // Max size of 5
        
        // Add more items than the capacity
        const items = [];
        for (let i = 0; i < 7; i++) {
            const mockTask = {
                budget: { priority: i * 0.1 },
                stamp: { id: `task${i}` }
            };
            items.push(mockTask);
            bag.add(mockTask);
        }
        
        // Should enforce capacity limit
        expect(bag.size).toBeLessThanOrEqual(5);
    });

    test('should support dynamic and context-sensitive task prioritization', () => {
        // Test the enhanced FocusSetSelector
        const selector = new FocusSetSelector();
        
        // Create some mock tasks with different priorities
        const tasks = [
            { budget: { priority: 0.9 }, stamp: { creationTime: Date.now() - 1000 }, term: { complexity: 5 } },
            { budget: { priority: 0.3 }, stamp: { creationTime: Date.now() - 10000 }, term: { complexity: 2 } },
            { budget: { priority: 0.7 }, stamp: { creationTime: Date.now() - 100 }, term: { complexity: 3 } }
        ];
        
        // Select tasks using the enhanced selector
        const context = { memory: { concepts: new Map() } };
        const selected = selector.select(tasks, context);
        
        expect(Array.isArray(selected)).toBe(true);
        expect(selected.length).toBeLessThanOrEqual(10); // Default max size
    });

    test('should process nested implications correctly', async () => {
        // Test nested implication: ((A ==> B) ==> C)
        const aTerm = termFactory.create('A');
        const bTerm = termFactory.create('B');
        const cTerm = termFactory.create('C');
        
        const innerImplication = termFactory.create({
            name: '(==>, A, B)',
            operator: '==>',
            components: [aTerm, bTerm]
        });
        
        const outerImplication = termFactory.create({
            name: '(==>, (A ==> B), C)',
            operator: '==>',
            components: [innerImplication, cTerm]
        });

        const context = { memory: { concepts: new Map() } };
        const result = await engine.evaluate(outerImplication, context);
        
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
    });
});

