import { RuleProcessor } from './RuleProcessor.js';

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
    async process(rules, tasks, memory, termFactory) {
        const results = [];

        // Apply each rule to each task
        for (const rule of rules) {
            for (const task of tasks) {
                if (rule.canApply(task)) {
                    try {
                        const { results: ruleResults } = await rule.apply(task, memory, termFactory);
                        results.push(...ruleResults);
                    } catch (error) {
                        console.warn(`Rule ${rule.id} failed:`, error);
                    }
                }
            }
        }

        return results;
    }
}