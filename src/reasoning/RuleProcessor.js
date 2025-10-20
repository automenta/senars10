/**
 * Interface for different rule processing strategies
 * Allows for different approaches to rule application
 */
export class RuleProcessor {
    constructor(config = {}) {
        this.config = config;
    }

    /**
     * Process rules against tasks
     * @param {Array} rules - Rules to apply
     * @param {Array} tasks - Tasks to apply rules to
     * @param {Object} memory - Memory system
     * @param {Object} termFactory - Term factory
     * @returns {Array} Processed results
     */
    async process(rules, tasks, memory, termFactory) {
        throw new Error('RuleProcessor.process must be implemented by subclasses');
    }

    /**
     * Check if this processor can handle the specified rules or task types
     */
    canProcess(ruleType, taskType) {
        return true;
    }
}