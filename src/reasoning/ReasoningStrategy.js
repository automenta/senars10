import { ReasoningContext } from './ReasoningContext.js';

export class ReasoningStrategy {
    constructor(config = {}) {
        this.config = config;
        this.metrics = { executions: 0, failures: 0, totalTime: 0 };
    }

    async execute(memory, rules, termFactory) {
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
    
    /**
     * Execute with error handling and metrics
     */
    async executeWithMetrics(memory, rules, termFactory) {
        const startTime = performance.now();
        let success = true;
        
        try {
            const result = await this.execute(memory, rules, termFactory);
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
