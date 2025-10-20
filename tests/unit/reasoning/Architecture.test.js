import {RuleEngine} from '../../../src/reasoning/RuleEngine.js';
import {Rule} from '../../../src/reasoning/Rule.js';
import {ReasoningContext} from '../../../src/reasoning/ReasoningContext.js';

describe('Reasoning Architecture Integration', () => {
    it('should demonstrate modular architecture with enhanced components', () => {
        // Create rule engine with factory
        const ruleEngine = RuleEngine.create({autoRegisterLM: false});

        // Create and register a simple rule
        const testRule = new Rule('test-rule', 'test', 0.8);
        ruleEngine.register(testRule);

        // Create context with factory method
        const context = ReasoningContext.forRuleApplication(
            {getAllConcepts: () => []},
            {mock: true},
            ruleEngine
        );

        // Verify the components work together
        expect(ruleEngine).toBeDefined();
        expect(context).toBeDefined();
        expect(ruleEngine.getRule('test-rule')).toBe(testRule);
    });

    it('should demonstrate shareable components across different contexts', () => {
        const ruleEngine = RuleEngine.create();
        const rule = new Rule('shared-rule', 'test', 0.7);
        ruleEngine.register(rule);

        // Multiple contexts can share the same rule engine
        const context1 = ReasoningContext.forRuleApplication(
            {id: 'context1'},
            {factory: 1},
            ruleEngine
        );

        const context2 = ReasoningContext.forRuleApplication(
            {id: 'context2'},
            {factory: 2},
            ruleEngine
        );

        // Both contexts use the same rule engine with the same rules
        expect(context1.ruleEngine).toBe(context2.ruleEngine);
        expect(context1.ruleEngine.getRule('shared-rule')).toBe(rule);
        expect(context2.ruleEngine.getRule('shared-rule')).toBe(rule);
    });

    it('should validate architectural patterns', () => {
        // Verify that components follow proper patterns
        const ruleEngine = RuleEngine.create();

        // Verify singleton-like patterns where appropriate
        expect(ruleEngine).toBeInstanceOf(RuleEngine);

        // Verify factory patterns
        expect(RuleEngine.create).toBeDefined();
        expect(ReasoningContext.create).toBeDefined();
    });

    it('should demonstrate context copy functionality for modularity', () => {
        // Create a base context with some configuration
        const baseConfig = {
            memory: {id: 'base'},
            customProp: 'baseValue',
            reasoningDepth: 1
        };
        const baseContext = new ReasoningContext(baseConfig);
        baseContext.setProperty('sharedProperty', 'sharedValue');

        // Create a copy with additional configuration
        const modifiedConfig = {
            memory: {id: 'modified'},
            newProp: 'newValue',
            reasoningDepth: 2
        };
        const copiedContext = baseContext.copy(modifiedConfig);

        // Verify copy preserved properties and history
        expect(copiedContext.getProperty('sharedProperty')).toBe('sharedValue');

        // Verify copy applied new configuration
        expect(copiedContext.config.memory.id).toBe('modified');
        expect(copiedContext.config.newProp).toBe('newValue');
        expect(copiedContext.config.reasoningDepth).toBe(2);

        // Original context should be unchanged
        expect(baseContext.config.memory.id).toBe('base');
        expect(baseContext.config.newProp).toBeUndefined();
        expect(baseContext.config.reasoningDepth).toBe(1);
    });
});