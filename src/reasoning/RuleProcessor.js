import { ReasoningContext } from './ReasoningContext.js';

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
     * @param {ReasoningContext} context - Reasoning context containing memory, termFactory, etc.
     * @returns {Array} Processed results
     */
    async process(rules, tasks, context) {
        throw new Error('RuleProcessor.process must be implemented by subclasses');
    }

    /**
     * Create or use context for processing
     */
    async createContext(tasks, config = {}) {
        if (config instanceof ReasoningContext) {
            return config;
        }
        
        return new ReasoningContext(config);
    }

    /**
     * Check if this processor can handle the specified rules or task types
     */
    canProcess(ruleType, taskType) {
        return true;
    }
}