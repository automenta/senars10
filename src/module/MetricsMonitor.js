import { BaseModule } from './BaseModule.js';

/**
 * @file src/module/MetricsMonitor.js
 * @description The metrics and self-optimization subsystem for the SeNARS agent.
 *
 * This module is responsible for collecting, aggregating, and exposing performance
 * metrics from the agent's cognitive core. It provides the foundation for
 * self-monitoring and adaptive behavior.
 */
export class MetricsMonitor extends BaseModule {
    constructor() {
        super('MetricsMonitor');
        this.metrics = {
            cycles: 0,
            tasksProcessed: 0,
            rulesApplied: 0,
            concepts: 0,
        };
    }

    /**
     * Registers the metrics monitor with the agent.
     * This is where we will hook into the NAR's event bus to listen for key events.
     *
     * @param {object} agent - The main agent instance.
     * @param {object} config - The module-specific configuration.
     */
    register(agent, config) {
        // In a full implementation, we would subscribe to events from the NAR's event bus.
        // For now, we will provide a method for the agent to manually update metrics.
    }

    /**
     * Initializes the metrics monitor.
     *
     * @param {object} agent - The main agent instance.
     * @param {object} config - The module-specific configuration.
     * @returns {Promise<void>}
     */
    async initialize(agent, config) {
        // No async initialization needed for this basic implementation.
    }

    /**
     * A method to update a specific metric.
     * @param {string} metricName - The name of the metric to update.
     * @param {number} value - The new value of the metric.
     */
    updateMetric(metricName, value) {
        if (this.metrics.hasOwnProperty(metricName)) {
            this.metrics[metricName] = value;
        }
    }

    /**
     * A method to increment a specific metric.
     * @param {string} metricName - The name of the metric to increment.
     * @param {number} [amount=1] - The amount to increment by.
     */
    incrementMetric(metricName, amount = 1) {
        if (this.metrics.hasOwnProperty(metricName)) {
            this.metrics[metricName] += amount;
        }
    }

    /**
     * Returns the current metrics.
     * @returns {object} The current metrics.
     */
    getMetrics() {
        return { ...this.metrics };
    }
}
