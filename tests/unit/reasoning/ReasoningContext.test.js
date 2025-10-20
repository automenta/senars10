import {ReasoningContext} from '../../../src/reasoning/ReasoningContext.js';

describe('ReasoningContext Enhanced Features', () => {
    it('should create a copy of context with new configuration', () => {
        const originalContext = new ReasoningContext({memory: {test: true}, reasoningDepth: 2});
        originalContext.setProperty('key', 'value');
        originalContext.addToHistory({action: 'test'});

        const copiedContext = originalContext.copy({reasoningDepth: 5, newProp: 'newVal'});

        // Original values should be preserved
        expect(copiedContext.config.memory).toEqual({test: true});
        expect(copiedContext.getProperty('key')).toBe('value');
        expect(copiedContext.getHistory().length).toBe(1);

        // New values should be applied
        expect(copiedContext.config.reasoningDepth).toBe(5);
        expect(copiedContext.config.newProp).toBe('newVal');
    });

    it('should create context with factory methods', () => {
        const memory = {test: 'memory'};
        const termFactory = {test: 'factory'};
        const ruleEngine = {test: 'engine'};

        // Test forRuleApplication
        const ruleContext = ReasoningContext.forRuleApplication(memory, termFactory, ruleEngine);
        expect(ruleContext.config.memory).toBe(memory);
        expect(ruleContext.config.termFactory).toBe(termFactory);
        expect(ruleContext.config.ruleEngine).toBe(ruleEngine);

        // Test forStrategyExecution
        const strategy = {test: 'strategy'};
        const strategyContext = ReasoningContext.forStrategyExecution(memory, termFactory, strategy);
        expect(strategyContext.config.memory).toBe(memory);
        expect(strategyContext.config.termFactory).toBe(termFactory);
        expect(strategyContext.config.strategy).toBe(strategy);
    });

    it('should create context with create factory method', () => {
        const config = {custom: 'config', memory: {test: true}};
        const context = ReasoningContext.create(config);

        expect(context.config.custom).toBe('config');
        expect(context.config.memory).toEqual({test: true});
    });

    it('should maintain metrics when copying context', () => {
        const originalContext = new ReasoningContext();
        originalContext.incrementMetric('tasksProcessed', 5);
        originalContext.incrementMetric('rulesApplied', 3);

        const copiedContext = originalContext.copy();

        const originalMetrics = originalContext.getMetrics();
        const copiedMetrics = copiedContext.getMetrics();

        expect(copiedMetrics.tasksProcessed).toBe(originalMetrics.tasksProcessed);
        expect(copiedMetrics.rulesApplied).toBe(originalMetrics.rulesApplied);
    });

    it('should create child context that shares history but has separate config', () => {
        const parentContext = new ReasoningContext({memory: {parent: true}, reasoningDepth: 2});
        parentContext.setProperty('shared', 'value');
        parentContext.addToHistory({type: 'parent-event'});

        const childContext = parentContext.createChildContext({memory: {child: true}});

        // Child should have incremented depth
        expect(childContext.reasoningDepth).toBe(3);

        // Child should have its own config values
        expect(childContext.config.memory).toEqual({child: true});

        // Child should have parent's properties
        expect(childContext.getProperty('shared')).toBe('value');

        // Child should have parent's history
        expect(childContext.getHistory().length).toBe(1);
        expect(childContext.getHistory()[0].type).toBe('parent-event');
    });

    it('should handle deep configuration merging in copy', () => {
        const originalContext = new ReasoningContext({
            memory: {nested: {value: 1}},
            custom: {setting: 'a'}
        });

        const copiedContext = originalContext.copy({
            memory: {nested: {value: 2, newProp: 'added'}},
            custom: {newSetting: 'b'}
        });

        // Memory should be replaced, not merged
        expect(copiedContext.config.memory).toEqual({nested: {value: 2, newProp: 'added'}});
        // Custom should be extended
        expect(copiedContext.config.custom).toEqual({setting: 'a', newSetting: 'b'});
    });
});