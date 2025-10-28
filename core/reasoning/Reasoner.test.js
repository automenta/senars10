import {Reasoner, Rule, RuleEngine, StrategySelector} from './index.js';

describe('Reasoner - Refactored Implementation', () => {
    let reasoner;
    let ruleEngine;
    let strategySelector;

    beforeEach(() => {
        ruleEngine = new RuleEngine();
        strategySelector = new StrategySelector();
        reasoner = new Reasoner({
            ruleEngine,
            strategySelector,
            enableSymbolicReasoning: true,
            enableTemporalReasoning: false, // Disable for unit tests
            enableModularReasoning: false  // Disable for unit tests
        });
    });

    afterEach(() => {
        // Cleanup if needed
    });

    test('should initialize with proper configuration', () => {
        expect(reasoner).toBeDefined();
        expect(reasoner.config.enableSymbolicReasoning).toBe(true);
        expect(reasoner.config.enableTemporalReasoning).toBe(false);
        expect(reasoner.config.enableModularReasoning).toBe(false);
        expect(reasoner.ruleEngine).toBe(ruleEngine);
        expect(reasoner.strategySelector).toBe(strategySelector);
    });

    test('should perform inference with empty focus set', async () => {
        const result = await reasoner.performInference([]);
        expect(result).toEqual([]);
    });

    test('should handle null/undefined focus set gracefully', async () => {
        await expect(async () => {
            await reasoner.performInference(null);
        }).rejects.toThrow('Focus set must be an array, received: object');
    });

    test('should set system context correctly', () => {
        const mockSystemContext = {memory: {}, termFactory: {}};
        const updatedReasoner = reasoner.setSystemContext(mockSystemContext);

        expect(updatedReasoner).toBe(reasoner);
        expect(reasoner.systemContext).toBe(mockSystemContext);
    });

    test('should return performance statistics', () => {
        const stats = reasoner.getPerformanceStats();

        expect(stats).toBeDefined();
        expect(stats.totalInferences).toBeDefined();
        expect(stats.symbolicInferences).toBeDefined();
        expect(stats.temporalInferences).toBeDefined();
        expect(stats.modularInferences).toBeDefined();
        expect(stats.uptime).toBeDefined();
    });

    test('should enable/disable reasoning modes', () => {
        // Test symbolic reasoning mode
        reasoner.setReasoningMode('symbolic', false);
        expect(reasoner.config.enableSymbolicReasoning).toBe(false);

        reasoner.setReasoningMode('symbolic', true);
        expect(reasoner.config.enableSymbolicReasoning).toBe(true);

        // Test temporal reasoning mode
        reasoner.setReasoningMode('temporal', false);
        expect(reasoner.config.enableTemporalReasoning).toBe(false);

        // Test modular reasoning mode
        reasoner.setReasoningMode('modular', true);
        expect(reasoner.config.enableModularReasoning).toBe(true);
    });

    test('should throw error for invalid reasoning mode', () => {
        expect(() => {
            reasoner.setReasoningMode('invalid', true);
        }).toThrow('Unknown reasoning mode: invalid');
    });

    test('should return rule statistics', () => {
        const stats = reasoner.getRuleStatistics();

        expect(stats).toBeDefined();
        expect(stats.totalRules).toBe(0); // Since no rules were added
        expect(stats.ruleNames).toEqual([]);
        expect(stats.ruleTypes).toBeDefined();
    });

    test('should process a single task', async () => {
        const mockTask = {term: {toString: () => 'test'}, type: 'BELIEF'};

        const originalPerformInference = reasoner.performInference;
        reasoner.performInference = async (focusSet) => focusSet;

        const result = await reasoner.processTask(mockTask);

        expect(result).toEqual([mockTask]);

        reasoner.performInference = originalPerformInference;
    });

    test('should handle task processing with proper context', async () => {
        // Create a simple rule for testing
        const testRule = new Rule('test-rule', 'test', 1.0);

        // Add the rule to the engine
        reasoner.ruleEngine.register(testRule);

        const mockTask = {
            term: {toString: () => 'test-term'},
            type: 'BELIEF',
            truth: {frequency: 0.9, confidence: 0.8}
        };

        // Test that inference can be performed without errors
        const result = await reasoner.performInference([mockTask], {
            enableTemporalReasoning: false,
            enableModularReasoning: false
        });

        expect(Array.isArray(result)).toBe(true);
    });
});

describe('Reasoner - Integration with RuleEngine', () => {
    let reasoner;
    let ruleEngine;

    beforeEach(() => {
        ruleEngine = new RuleEngine();
        reasoner = new Reasoner({
            ruleEngine,
            enableSymbolicReasoning: true,
            enableTemporalReasoning: false,
            enableModularReasoning: false
        });
    });

    test('should use rule engine for symbolic inference', async () => {
        // Create and register a simple test rule
        const mockRule = {
            id: 'test-rule',
            type: 'test',
            priority: 1.0,
            canApply: () => true,
            apply: async () => ({results: [], rule: mockRule})
        };

        // Register the rule directly to the engine (bypassing validation for test)
        reasoner.ruleEngine['_rules'].set('test-rule', mockRule);

        const mockTask = {term: {toString: () => 'test'}, type: 'BELIEF'};
        const result = await reasoner.performInference([mockTask], {
            enableTemporalReasoning: false,
            enableModularReasoning: false
        });

        expect(Array.isArray(result)).toBe(true);
    });
});