import {ReasoningContext} from './ReasoningContext.js';
import {StrategyInterface} from './StrategyInterface.js';

export class ReasoningStrategy extends StrategyInterface {
    constructor(config = {}) {
        super(config);
    }

    /**
     * Factory method to create a strategy based on configuration
     * Note: For async imports, use StrategyFactory.createAsync instead
     */
    static create(type, config = {}) {
        switch (type) {
            case 'sequential':
            default:
                // Return a basic sequential strategy
                return new ReasoningStrategy(config);
        }
    }

    async execute(context, rules, taskOrTasks) {
        throw new Error('ReasoningStrategy.execute must be implemented by subclasses');
    }

    /**
     * Create a reasoning context from the traditional parameters
     */
    createContext(memory, rules, termFactory, additionalConfig = {}) {
        return new ReasoningContext({
            memory,
            termFactory,
            rules,
            ...additionalConfig
        });
    }

    /**
     * Execute with error handling and metrics
     */
    async executeWithMetrics(context, rules, taskOrTasks) {
        const startTime = performance.now();
        let success = true;

        try {
            const result = await this.execute(context, rules, taskOrTasks);
            this.metrics.executions++;
            return result;
        } catch (error) {
            this.metrics.failures++;
            success = false;
            throw error;
        } finally {
            const executionTime = performance.now() - startTime;
            this.metrics.totalTime += executionTime;
        }
    }
}