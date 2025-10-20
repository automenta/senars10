/**
 * StrategyInterface: Defines the common interface for all reasoning strategies
 * This provides a consistent API for different reasoning approaches
 */
export class StrategyInterface {
    constructor(config = {}) {
        this.config = config;
        this.id = config.id || this.constructor.name;
        this.metrics = {
            executions: 0,
            successes: 0,
            failures: 0,
            totalTime: 0
        };
    }

    /**
     * Execute the reasoning strategy
     * @param {Object} context - The reasoning context containing memory, termFactory, etc.
     * @param {Array} rules - The rules to apply
     * @param {Object} taskOrTasks - The task(s) to reason about
     * @returns {Array} - Array of derived tasks
     */
    async execute(context, rules, taskOrTasks) {
        throw new Error('Strategy.execute must be implemented by subclasses');
    }

    /**
     * Execute with error handling and metrics tracking
     */
    async executeWithMetrics(context, rules, taskOrTasks) {
        const startTime = performance.now();
        let success = true;

        try {
            const result = await this.execute(context, rules, taskOrTasks);
            this.metrics.successes++;
            this.metrics.executions++;
            return result;
        } catch (error) {
            this.metrics.failures++;
            this.metrics.executions++;
            success = false;
            throw error;
        } finally {
            const executionTime = performance.now() - startTime;
            this.metrics.totalTime += executionTime;
        }
    }

    /**
     * Get strategy metrics
     */
    getMetrics() {
        return {...this.metrics};
    }

    /**
     * Reset strategy metrics
     */
    resetMetrics() {
        this.metrics = {
            executions: 0,
            successes: 0,
            failures: 0,
            totalTime: 0
        };
    }

    /**
     * Check if the strategy can handle a specific task
     */
    canHandle(task) {
        return true; // Default implementation - override in subclasses
    }

    /**
     * Get strategy configuration
     */
    getConfiguration() {
        return {...this.config};
    }

    /**
     * Update strategy configuration
     */
    updateConfiguration(newConfig) {
        this.config = {...this.config, ...newConfig};
        return this;
    }
}