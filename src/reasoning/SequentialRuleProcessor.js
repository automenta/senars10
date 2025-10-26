import {RuleProcessor} from './RuleProcessor.js';

/**
 * SequentialRuleProcessor: Applies rules sequentially to tasks
 * This preserves the original behavior while allowing for different processing strategies
 */
export class SequentialRuleProcessor extends RuleProcessor {
    constructor(config = {}) {
        super(config);
        this.maxBatchSize = config.maxBatchSize || 100;
    }

    /**
     * Process rules against tasks sequentially
     */
    async process(rules, tasks, context) {
        const results = [];

        // Ensure we have a proper context
        if (!context || typeof context !== 'object') {
            throw new Error('SequentialRuleProcessor requires a valid ReasoningContext');
        }

        // Apply each rule to each task
        for (const rule of rules) {
            for (const task of tasks) {
                const ruleResults = await this._applyRuleToTask(rule, task, context);
                results.push(...ruleResults);
            }
        }

        return results;
    }
}