/**
 * Centralized metrics utility for consistent metric tracking across components
 */
export class Metrics {
    static create() {
        return {
            executions: 0,
            successes: 0,
            failures: 0,
            totalTime: 0,
            avgTime: 0,
            lastRun: null,
            lastError: null,
            createdAt: Date.now()
        };
    }

    static update(metrics, success, time, error = null) {
        const totalExecutions = metrics.executions + 1;
        const totalSuccesses = metrics.successes + (success ? 1 : 0);
        const totalFailures = metrics.failures + (success ? 0 : 1);

        return {
            executions: totalExecutions,
            successes: totalSuccesses,
            failures: totalFailures,
            totalTime: metrics.totalTime + time,
            avgTime: totalExecutions > 0 ? (metrics.totalTime + time) / totalExecutions : 0,
            lastRun: Date.now(),
            lastError: error,
            createdAt: metrics.createdAt
        };
    }

    static getStats(metrics) {
        const successRate = metrics.executions > 0 ? (metrics.successes / metrics.executions) * 100 : 0;
        return {
            executions: metrics.executions,
            successes: metrics.successes,
            failures: metrics.failures,
            successRate: Math.round(successRate * 100) / 100,
            avgTime: Math.round(metrics.avgTime * 100) / 100,
            totalTime: Math.round(metrics.totalTime * 100) / 100,
            lastRun: metrics.lastRun,
            lastError: metrics.lastError,
            uptime: Date.now() - metrics.createdAt
        };
    }

    static merge(...metricSets) {
        const merged = this.create();
        for (const metrics of metricSets) {
            merged.executions += metrics.executions;
            merged.successes += metrics.successes;
            merged.failures += metrics.failures;
            merged.totalTime += metrics.totalTime;
            merged.lastRun = Math.max(merged.lastRun || 0, metrics.lastRun || 0);
            if (metrics.lastError) merged.lastError = metrics.lastError;
        }
        merged.avgTime = merged.executions > 0 ? merged.totalTime / merged.executions : 0;
        return merged;
    }
}