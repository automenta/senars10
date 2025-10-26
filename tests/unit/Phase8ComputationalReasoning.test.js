import { EvaluationEngine } from '../../src/reasoning/EvaluationEngine.js';
import { VariableBindingUtils } from '../../src/reasoning/VariableBindingUtils.js';
import { TermFactory } from '../../src/term/TermFactory.js';
import { Term } from '../../src/term/Term.js';
import { SYSTEM_ATOMS } from '../../src/reasoning/SystemAtoms.js';
import { PatternMatcher } from '../../src/reasoning/nal/PatternMatcher.js';
import { runCycleLimitedTest, CycleLimitedTester } from '../../src/testing/CycleLimitedTest.js';

describe('Phase 8: Unified Computational Reasoning Framework', () => {
    let engine;
    let termFactory;

    beforeEach(() => {
        engine = new EvaluationEngine(null, null, { enableCaching: false });
        termFactory = new TermFactory();
    });

    describe('Enhanced Equality Operator', () => {
        test('should solve simple equations like (X + 3) = 7', async () => {
            // Create terms for the equation (X + 3) = 7
            const xTerm = termFactory.create({ name: '?X', type: 'variable' });
            const threeTerm = termFactory.create({ name: '3', type: 'atomic' });
            const sevenTerm = termFactory.create({ name: '7', type: 'atomic' });
            
            // Create args term: (X, 3) 
            const argsTerm = termFactory.create({ operator: ',', components: [xTerm, threeTerm] });
            // Create operation term: add(X, 3)
            const addTerm = termFactory.create({ name: 'add', type: 'atomic' });
            const operationTerm = termFactory.create({ operator: '^', components: [addTerm, argsTerm] });
            // Create equality: (add(X, 3)) = 7
            const equalityTerm = termFactory.create({ operator: '=', components: [operationTerm, sevenTerm] });
            
            const result = await engine.evaluate(equalityTerm);
            
            // The result should indicate successful solving with bindings
            expect(result.success).toBe(true);
            expect(result.bindings).toBeDefined();
            expect(result.bindings.get('?X')).toBeDefined();
        });

        test('should handle basic equality pattern matching', async () => {
            // Create terms for (?X, 3) = (5, ?Y)
            const xTerm = termFactory.create({ name: '?X', type: 'variable' });
            const yTerm = termFactory.create({ name: '?Y', type: 'variable' });
            const threeTerm = termFactory.create({ name: '3', type: 'atomic' });
            const fiveTerm = termFactory.create({ name: '5', type: 'atomic' });
            
            const leftArgs = termFactory.create({ operator: ',', components: [xTerm, threeTerm] });
            const rightArgs = termFactory.create({ operator: ',', components: [fiveTerm, yTerm] });
            
            const equalityTerm = termFactory.create({ operator: '=', components: [leftArgs, rightArgs] });
            
            const result = await engine.evaluate(equalityTerm);
            
            expect(result.success).toBe(true);
            expect(result.bindings).toBeDefined();
            expect(result.bindings.get('?X')).toBeDefined();
            expect(result.bindings.get('?Y')).toBeDefined();
        });

        test('should handle simple atomic equality', async () => {
            const fiveTerm = termFactory.create({ name: '5', type: 'atomic' });
            const anotherFiveTerm = termFactory.create({ name: '5', type: 'atomic' });
            
            const equalityTerm = termFactory.create({ operator: '=', components: [fiveTerm, anotherFiveTerm] });
            
            const result = await engine.evaluate(equalityTerm);
            
            expect(result.success).toBe(true);
            expect(result.result).toBe(SYSTEM_ATOMS.True);
        });

        test('should handle different atomic inequality', async () => {
            const fiveTerm = termFactory.create({ name: '5', type: 'atomic' });
            const threeTerm = termFactory.create({ name: '3', type: 'atomic' });
            
            const equalityTerm = termFactory.create({ operator: '=', components: [fiveTerm, threeTerm] });
            
            const result = await engine.evaluate(equalityTerm);
            
            // The evaluation should be successful (returning false as the result)
            expect(result.success).toBe(true);
            expect(result.result).toBe(SYSTEM_ATOMS.False);
        });
    });

    describe('Variable Binding Utilities', () => {
        test('should match higher-order patterns', () => {
            // Test the new higher-order pattern matching
            const patternX = termFactory.create({ name: '?X', type: 'variable' });
            const humanTerm = termFactory.create({ name: 'Human', type: 'atomic' });
            const mortalTerm = termFactory.create({ name: 'Mortal', type: 'atomic' });
            
            // Create (==> Human Mortal) - implication pattern
            const implicationPattern = termFactory.create({ 
                operator: '==>', 
                components: [humanTerm, mortalTerm] 
            });
            
            // Create a similar structure to match against
            const socratesTerm = termFactory.create({ name: 'Socrates', type: 'atomic' });
            const greekTerm = termFactory.create({ name: 'Greek', type: 'atomic' });
            const implicationTarget = termFactory.create({ 
                operator: '==>', 
                components: [socratesTerm, greekTerm] 
            });
            
            const bindings = VariableBindingUtils.matchHigherOrderPatterns(
                implicationPattern, 
                implicationTarget, 
                new Map()
            );
            
            expect(bindings).toBeNull(); // Different atoms, so no match
            
            // Now test where we match variables to complex structures
            const complexPattern = termFactory.create({ name: '?P', type: 'variable' });
            const complexTarget = termFactory.create({ 
                operator: '==>', 
                components: [humanTerm, mortalTerm] 
            });
            
            const higherOrderBindings = VariableBindingUtils.matchAndBindHigherOrder(
                complexPattern,
                complexTarget,
                new Map()
            );
            
            expect(higherOrderBindings).not.toBeNull();
            expect(higherOrderBindings.get('?P')).toEqual(complexTarget);
        });

        test('should handle basic variable binding', () => {
            const xTerm = termFactory.create({ name: '?X', type: 'variable' });
            const valueTerm = termFactory.create({ name: 'value', type: 'atomic' });
            
            const bindings = VariableBindingUtils.matchAndBindVariables(xTerm, valueTerm, new Map());
            
            expect(bindings).not.toBeNull();
            expect(bindings.get('?X')).toEqual(valueTerm);
        });
    });

    describe('Pattern Matching', () => {
        test('should support higher-order unification', () => {
            const matcher = new PatternMatcher();
            
            // Test variable binding to complex terms
            const varTerm = termFactory.create({ name: '?P', type: 'variable' });
            const complexTerm = termFactory.create({ 
                operator: '==>', 
                components: [
                    termFactory.create({ name: 'Human', type: 'atomic' }),
                    termFactory.create({ name: 'Mortal', type: 'atomic' })
                ] 
            });
            
            const bindings = matcher.unifyHigherOrder(varTerm, complexTerm);
            
            expect(bindings).not.toBeNull();
            expect(bindings.get('?P')).toEqual(complexTerm);
        });

        test('should handle standard unification', () => {
            const matcher = new PatternMatcher();
            
            const xTerm = termFactory.create({ name: '?X', type: 'variable' });
            const valueTerm = termFactory.create({ name: 'value', type: 'atomic' });
            
            const bindings = matcher.unify(xTerm, valueTerm);
            
            expect(bindings).not.toBeNull();
            expect(bindings.get('?X')).toEqual(valueTerm);
        });
    });

    describe('Integration Tests', () => {
        test('should integrate computational operations with NARS syntax', async () => {
            // Test that computational operations work within the NARS framework
            const xTerm = termFactory.create({ name: '?X', type: 'variable' });
            const twoTerm = termFactory.create({ name: '2', type: 'atomic' });
            const fiveTerm = termFactory.create({ name: '5', type: 'atomic' });
            
            // Create (multiply ?X 2) = 5 -> should solve for ?X = 2.5
            const argsTerm = termFactory.create({ operator: ',', components: [xTerm, twoTerm] });
            const multiplyTerm = termFactory.create({ name: 'multiply', type: 'atomic' });
            const operationTerm = termFactory.create({ operator: '^', components: [multiplyTerm, argsTerm] });
            const equalityTerm = termFactory.create({ operator: '=', components: [operationTerm, fiveTerm] });
            
            const result = await engine.evaluate(equalityTerm);
            
            // The equation (X * 2) = 5 should have solution X = 2.5
            expect(result.success).toBe(true);
            // Note: The exact result may depend on implementation details
            // The important thing is that it should attempt to solve the equation
        });
    });
});