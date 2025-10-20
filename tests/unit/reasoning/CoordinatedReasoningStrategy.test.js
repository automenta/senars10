import {CoordinatedReasoningStrategy} from '../../../src/reasoning/CoordinatedReasoningStrategy.js';
import {RuleEngine} from '../../../src/reasoning/RuleEngine.js';
import {Memory} from '../../../src/memory/Memory.js';
import {TermFactory} from '../../../src/term/TermFactory.js';
import {Task} from '../../../src/task/Task.js';
import {Term} from '../../../src/term/Term.js';
import {Truth} from '../../../src/Truth.js';

describe('CoordinatedReasoningStrategy', () => {
    let strategy;
    let ruleEngine;
    let memory;
    let termFactory;

    beforeEach(() => {
        ruleEngine = new RuleEngine();
        memory = new Memory();
        termFactory = new TermFactory();
        strategy = new CoordinatedReasoningStrategy(ruleEngine);
    });

    test('should initialize with correct configuration', () => {
        const config = {maxIterations: 5, confidenceThreshold: 0.5};
        const strategyWithConfig = new CoordinatedReasoningStrategy(ruleEngine, config);

        expect(strategyWithConfig.config.maxIterations).toBe(5);
        expect(strategyWithConfig.config.confidenceThreshold).toBe(0.5);
        expect(strategyWithConfig.config.enableCrossValidation).toBe(true);
    });

    test('should execute basic coordinated reasoning', async () => {
        // Mock the memory to return some tasks
        const mockTask = new Task({
            term: new Term('atomic', 'test'),
            truth: new Truth(0.8, 0.9),
            budget: {priority: 0.7, durability: 0.5, quality: 0.6}
        });

        const originalGetAllConcepts = memory.getAllConcepts;
        memory.getAllConcepts = () => [{
            getAllTasks: () => [mockTask]
        }];

        // Mock rule engine methods
        const originalApplyLMRules = ruleEngine.applyLMRules;
        const originalApplyNALRules = ruleEngine.applyNALRules;

        let lmCalled = false, nalCalled = false;
        ruleEngine.applyLMRules = () => {
            lmCalled = true;
            return [];
        };
        ruleEngine.applyNALRules = () => {
            nalCalled = true;
            return [];
        };

        const results = await strategy.execute(memory, [], termFactory);

        expect(Array.isArray(results)).toBe(true);
        expect(lmCalled).toBe(true);
        expect(nalCalled).toBe(true);

        // Restore original functions
        memory.getAllConcepts = originalGetAllConcepts;
        ruleEngine.applyLMRules = originalApplyLMRules;
        ruleEngine.applyNALRules = originalApplyNALRules;
    });

    test('should handle termFactory assignment correctly', async () => {
        ruleEngine._termFactory = null;

        const mockTask = new Task({
            term: new Term('atomic', 'test'),
            truth: new Truth(0.8, 0.9),
            budget: {priority: 0.7, durability: 0.5, quality: 0.6}
        });

        const originalGetAllConcepts = memory.getAllConcepts;
        memory.getAllConcepts = () => [{
            getAllTasks: () => [mockTask]
        }];

        const originalApplyLMRules = ruleEngine.applyLMRules;
        const originalApplyNALRules = ruleEngine.applyNALRules;
        ruleEngine.applyLMRules = () => [];
        ruleEngine.applyNALRules = () => [];

        await strategy.execute(memory, [], termFactory);

        // Should have assigned the termFactory
        expect(ruleEngine._termFactory).toBe(termFactory);

        // Restore original functions
        memory.getAllConcepts = originalGetAllConcepts;
        ruleEngine.applyLMRules = originalApplyLMRules;
        ruleEngine.applyNALRules = originalApplyNALRules;
    });

    test('should get metrics correctly', () => {
        const metrics = strategy.getMetrics();

        expect(metrics).toBeDefined();
        expect(metrics.config).toEqual(strategy.config);
    });

    test('should perform iteration with cross-validation', async () => {
        const mockTask = new Task({
            term: new Term('atomic', 'test'),
            truth: new Truth(0.8, 0.9),
            budget: {priority: 0.7, durability: 0.5, quality: 0.6}
        });

        const tasks = [mockTask];
        const mockMemory = {};

        // Test private method indirectly by configuring cross-validation
        const config = {enableCrossValidation: true};
        const strategyWithCV = new CoordinatedReasoningStrategy(ruleEngine, config);

        // Mock rule applications with call tracking
        let lmCallCount = 0;
        let nalCallCount = 0;
        const lmResults = [
            [{term: new Term('atomic', 'lm-out'), truth: new Truth(0.8, 0.7), _ruleType: 'LM'}], // for original task
            [], // for LM result
            [{term: new Term('atomic', 'nal-out'), truth: new Truth(0.7, 0.6), _ruleType: 'NAL'}] // for NAL result of LM
        ];

        const nalResults = [
            [{term: new Term('atomic', 'nal-out'), truth: new Truth(0.7, 0.6), _ruleType: 'NAL'}], // for original task
            [] // for NAL result
        ];

        const originalApplyLMRules = ruleEngine.applyLMRules;
        const originalApplyNALRules = ruleEngine.applyNALRules;

        ruleEngine.applyLMRules = () => {
            const result = lmResults[lmCallCount] || [];
            lmCallCount++;
            return result;
        };

        ruleEngine.applyNALRules = () => {
            const result = nalResults[nalCallCount] || [];
            nalCallCount++;
            return result;
        };

        const iterationResults = await strategyWithCV._performIteration(tasks, mockMemory, termFactory);

        expect(lmCallCount).toBeGreaterThan(0);
        expect(nalCallCount).toBeGreaterThan(0);
        // cross-validation results should be in hybridResults
        expect(Array.isArray(iterationResults.hybridResults)).toBe(true);

        // Restore original functions
        ruleEngine.applyLMRules = originalApplyLMRules;
        ruleEngine.applyNALRules = originalApplyNALRules;
    });
});