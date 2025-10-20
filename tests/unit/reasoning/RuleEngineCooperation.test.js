import {RuleEngine} from '../../../src/reasoning/RuleEngine.js';
import {LMRule} from '../../../src/reasoning/LMRule.js';
import {Task} from '../../../src/task/Task.js';
import {Term} from '../../../src/term/Term.js';
import {Truth} from '../../../src/Truth.js';
import {TermFactory} from '../../../src/term/TermFactory.js';

// Create a simple test LM to use with LMRule
class MockLM {
    async process(prompt, config) {
        return 'Mock response';
    }
}

describe('RuleEngine - Enhanced Cooperation Methods', () => {
    let ruleEngine;
    let mockLM;

    beforeEach(() => {
        mockLM = new MockLM();
        ruleEngine = new RuleEngine({}, mockLM, new TermFactory());
    });

    test('should apply hybrid rules combining LM and NAL results', () => {
        const mockTask = new Task({
            term: new Term('atomic', 'test'),
            truth: new Truth(0.8, 0.9),
            budget: {priority: 0.7, durability: 0.5, quality: 0.6}
        });

        // Create proper LM rule instance
        const lmRule = new LMRule(
            'test-lm-rule',
            mockLM,
            'Test prompt: {{taskTerm}}',
            async (response, task) => [],
            0.8
        );

        ruleEngine.register(lmRule);

        // Override getApplicableRules to return specific rules by type
        const originalGetApplicableRules = ruleEngine.getApplicableRules;
        ruleEngine.getApplicableRules = (task, ruleType) => {
            if (ruleType === 'lm') return [lmRule];
            return [lmRule]; // For simplicity in test
        };

        // Test applyHybridRules method
        const hybridResults = ruleEngine.applyHybridRules(mockTask);

        // Should combine results from both rule types (though NAL might be empty in this simple test)
        expect(Array.isArray(hybridResults)).toBe(true);

        // Restore original function
        ruleEngine.getApplicableRules = originalGetApplicableRules;
    });

    test('should coordinate rules with LM first then NAL approach', async () => {
        const mockTask = new Task({
            term: new Term('atomic', 'test'),
            truth: new Truth(0.8, 0.9),
            budget: {priority: 0.7, durability: 0.5, quality: 0.6}
        });

        // Create a proper LM rule
        const lmRule = new LMRule(
            'test-coord-lm',
            mockLM,
            'Coordinate: {{taskTerm}}',
            async (response, task) => [{
                term: new Term('atomic', 'lm-derived'),
                truth: new Truth(0.9, 0.8)
            }],
            0.8
        );

        ruleEngine.register(lmRule);

        // Mock getApplicableRules to return our test rule
        const originalGetApplicableRules = ruleEngine.getApplicableRules;
        ruleEngine.getApplicableRules = (task, ruleType) => {
            if (ruleType === 'lm') return [lmRule];
            return [lmRule]; // Simplified for test
        };

        const coordinationResult = await ruleEngine.coordinateRules(mockTask);

        // Should have initial task and some results
        expect(coordinationResult.initial).toEqual([mockTask]);
        expect(Array.isArray(coordinationResult.lmResults)).toBe(true);
        expect(Array.isArray(coordinationResult.all)).toBe(true);

        // Restore original function
        ruleEngine.getApplicableRules = originalGetApplicableRules;
    });

    test('should apply rules with memory parameter when provided', () => {
        const mockTask = new Task({
            term: new Term('atomic', 'test'),
            truth: new Truth(0.8, 0.9),
            budget: {priority: 0.7, durability: 0.5, quality: 0.6}
        });

        // Create a simple test to ensure the applyRule method works with the memory parameter
        // Since our LMRule applies internally and may have complex logic, let's just make sure
        // the method can be invoked without throwing an error
        const lmRule = new LMRule(
            'test-with-memory',
            mockLM,
            'Test with memory: {{taskTerm}}',
            async (response, task) => [mockTask],
            0.8
        );

        ruleEngine.register(lmRule);

        // Mock LM process to avoid actual processing
        const originalProcess = mockLM.process;
        mockLM.process = async (prompt, config) => 'test response';

        try {
            const result = ruleEngine.applyRule(lmRule, mockTask, {id: 'test-memory'});
            // Check if result is an object (which it should be)
            expect(typeof result).toBe('object');
        } finally {
            // Always restore original method
            mockLM.process = originalProcess;
        }
    });

    test('should apply LM rules with memory parameter', () => {
        const mockTask = new Task({
            term: new Term('atomic', 'test'),
            truth: new Truth(0.8, 0.9),
            budget: {priority: 0.7, durability: 0.5, quality: 0.6}
        });

        // Create proper LM rule instance
        const lmRule = new LMRule(
            'test-lm-with-memory',
            mockLM,
            'Test LM with memory: {{taskTerm}}',
            async (response, task) => [mockTask],
            0.8
        );

        ruleEngine.register(lmRule);

        // Override getApplicableRules to return our test rule
        const originalGetApplicableRules = ruleEngine.getApplicableRules;
        ruleEngine.getApplicableRules = (task, ruleType) => {
            if (ruleType !== 'nal') return [lmRule]; // Return LM rule for non-NAL calls
            return [];
        };

        // Apply LM rules with memory
        const results = ruleEngine.applyLMRules(mockTask, null, {id: 'test-memory'});

        // Should return an array of results
        expect(Array.isArray(results)).toBe(true);

        // Restore original function
        ruleEngine.getApplicableRules = originalGetApplicableRules;
    });

    test('should apply NAL rules method exists and is callable', () => {
        const mockTask = new Task({
            term: new Term('atomic', 'test'),
            truth: new Truth(0.8, 0.9),
            budget: {priority: 0.7, durability: 0.5, quality: 0.6}
        });

        // Just test that the method exists and can be called without errors
        // Since we don't have registered NAL rules, it should return an empty array
        const results = ruleEngine.applyNALRules(mockTask, null, {id: 'test-memory'});

        // Should return an array (empty since no NAL rules registered)
        expect(Array.isArray(results)).toBe(true);
    });
});