/**
 * StrategyMetrics: Comprehensive metrics and monitoring for reasoning strategies
 */
export class StrategyMetrics {
    constructor(config = {}) {
        this.config = {
            enableDetailedTracking: config.enableDetailedTracking !== false,
            maxHistorySize: config.maxHistorySize || 1000,
            enablePerformanceProfiling: config.enablePerformanceProfiling !== false,
            enableResourceMonitoring: config.enableResourceMonitoring !== false,
            ...config
        };

        this._metrics = {
            strategyId: config.strategyId || 'unknown',
            executionCount: 0,
            totalExecutionTime: 0,
            averageExecutionTime: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            totalTasksProcessed: 0,
            totalInferences: 0,
            averageInferencesPerExecution: 0,
            startTime: Date.now(),
            lastExecutionTime: null,
            peakMemoryUsage: 0,
            totalRuleApplications: 0,
            ruleSuccessRate: 0
        };

        this._executionHistory = [];
        this._resourceHistory = [];
        this._ruleMetrics = new Map();
    }

    /**
     * Create a metrics instance from a JSON representation
     */
    static fromJSON(json) {
        const metrics = new StrategyMetrics({strategyId: json.strategyId});
        metrics._metrics = {...json._metrics};
        metrics._executionHistory = [...json.executionHistory];
        metrics._resourceHistory = [...json.resourceHistory];
        // Note: _ruleMetrics would need special handling for proper restoration
        return metrics;
    }

    /**
     * Record a strategy execution
     */
    recordExecution(executionTime, taskCount, inferenceCount, success = true, error = null) {
        this._metrics.executionCount++;
        this._metrics.totalExecutionTime += executionTime;
        this._metrics.averageExecutionTime = this._metrics.totalExecutionTime / this._metrics.executionCount;

        if (success) {
            this._metrics.successfulExecutions++;
        } else {
            this._metrics.failedExecutions++;
        }

        this._metrics.totalTasksProcessed += taskCount;
        this._metrics.totalInferences += inferenceCount;
        this._metrics.averageInferencesPerExecution = this._metrics.totalInferences / this._metrics.executionCount;
        this._metrics.lastExecutionTime = Date.now();

        // Add to execution history if detailed tracking is enabled
        if (this.config.enableDetailedTracking) {
            this._executionHistory.push({
                executionTime,
                taskCount,
                inferenceCount,
                success,
                error,
                timestamp: Date.now()
            });

            // Keep history size within limits
            if (this._executionHistory.length > this.config.maxHistorySize) {
                this._executionHistory = this._executionHistory.slice(-this.config.maxHistorySize / 2);
            }
        }
    }

    /**
     * Record resource usage
     */
    recordResourceUsage(usage) {
        if (!this.config.enableResourceMonitoring) return;

        this._resourceHistory.push({
            ...usage,
            timestamp: Date.now()
        });

        // Update peak memory if applicable
        if (usage.memory && usage.memory.used > this._metrics.peakMemoryUsage) {
            this._metrics.peakMemoryUsage = usage.memory.used;
        }

        // Keep history size within limits
        if (this._resourceHistory.length > this.config.maxHistorySize) {
            this._resourceHistory = this._resourceHistory.slice(-this.config.maxHistorySize / 2);
        }
    }

    /**
     * Record rule application
     */
    recordRuleApplication(ruleId, executionTime, success = true, resultCount = 0) {
        if (!this._ruleMetrics.has(ruleId)) {
            this._ruleMetrics.set(ruleId, {
                applications: 0,
                successes: 0,
                failures: 0,
                totalExecutionTime: 0,
                averageExecutionTime: 0,
                totalResults: 0,
                averageResults: 0
            });
        }

        const metrics = this._ruleMetrics.get(ruleId);
        metrics.applications++;
        if (success) {
            metrics.successes++;
        } else {
            metrics.failures++;
        }
        metrics.totalExecutionTime += executionTime;
        metrics.averageExecutionTime = metrics.totalExecutionTime / metrics.applications;
        metrics.totalResults += resultCount;
        metrics.averageResults = metrics.totalResults / metrics.applications;

        this._metrics.totalRuleApplications++;
        this._metrics.ruleSuccessRate = this._metrics.totalRuleApplications > 0
            ? this._metrics.successfulExecutions / this._metrics.totalRuleApplications
            : 0;
    }

    /**
     * Get current metrics
     */
    getMetrics() {
        return {
            ...this._metrics,
            uptime: Date.now() - this._metrics.startTime,
            executionHistorySize: this._executionHistory.length,
            resourceHistorySize: this._resourceHistory.length,
            ruleMetricsCount: this._ruleMetrics.size,
            successRate: this._metrics.executionCount > 0
                ? this._metrics.successfulExecutions / this._metrics.executionCount
                : 0
        };
    }

    /**
     * Get detailed metrics including history
     */
    getDetailedMetrics() {
        return {
            ...this.getMetrics(),
            executionHistory: this.config.enableDetailedTracking ? [...this._executionHistory] : [],
            resourceHistory: this.config.enableResourceMonitoring ? [...this._resourceHistory] : [],
            ruleMetrics: Object.fromEntries(this._ruleMetrics)
        };
    }

    /**
     * Get metrics for a specific rule
     */
    getRuleMetrics(ruleId) {
        return this._ruleMetrics.get(ruleId) || null;
    }

    /**
     * Get top performing rules
     */
    getTopPerformingRules(limit = 10) {
        const rules = Array.from(this._ruleMetrics.entries())
            .map(([id, metrics]) => ({id, ...metrics}))
            .sort((a, b) => b.averageResults - a.averageResults);

        return rules.slice(0, limit);
    }

    /**
     * Get recent execution performance
     */
    getRecentPerformance(windowMs = 60000) { // 1 minute window by default
        const now = Date.now();
        const recentExecutions = this._executionHistory.filter(
            exec => (now - exec.timestamp) <= windowMs
        );

        if (recentExecutions.length === 0) {
            return {
                executionCount: 0,
                averageExecutionTime: 0,
                successRate: 0,
                totalInferences: 0
            };
        }

        const totalExecutionTime = recentExecutions.reduce((sum, exec) => sum + exec.executionTime, 0);
        const successfulExecutions = recentExecutions.filter(exec => exec.success).length;

        return {
            executionCount: recentExecutions.length,
            averageExecutionTime: totalExecutionTime / recentExecutions.length,
            successRate: recentExecutions.length > 0 ? successfulExecutions / recentExecutions.length : 0,
            totalInferences: recentExecutions.reduce((sum, exec) => sum + exec.inferenceCount, 0)
        };
    }

    /**
     * Reset metrics
     */
    reset() {
        this._metrics = {
            strategyId: this._metrics.strategyId,
            executionCount: 0,
            totalExecutionTime: 0,
            averageExecutionTime: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            totalTasksProcessed: 0,
            totalInferences: 0,
            averageInferencesPerExecution: 0,
            startTime: Date.now(),
            lastExecutionTime: null,
            peakMemoryUsage: 0,
            totalRuleApplications: 0,
            ruleSuccessRate: 0
        };

        this._executionHistory = [];
        this._resourceHistory = [];
        this._ruleMetrics.clear();
    }

    /**
     * Export metrics as JSON
     */
    toJSON() {
        return this.getDetailedMetrics();
    }

    /**
     * Generate a performance report
     */
    generateReport() {
        const metrics = this.getMetrics();
        const topRules = this.getTopPerformingRules(5);

        return {
            report: {
                strategy: metrics.strategyId,
                period: {
                    startTime: new Date(metrics.startTime).toISOString(),
                    uptime: `${Math.round(metrics.uptime / 1000)} seconds`,
                },
                performance: {
                    totalExecutions: metrics.executionCount,
                    successRate: `${Math.round(metrics.successRate * 100)}%`,
                    avgExecutionTime: `${metrics.averageExecutionTime.toFixed(2)}ms`,
                    totalInferences: metrics.totalInferences,
                    avgInferencesPerExecution: metrics.averageInferencesPerExecution.toFixed(2)
                },
                resourceUsage: {
                    peakMemory: `${(metrics.peakMemoryUsage / (1024 * 1024)).toFixed(2)} MB`
                }
            },
            topRules: topRules.map(rule => ({
                id: rule.id,
                avgResults: rule.averageResults.toFixed(2),
                successRate: `${Math.round((rule.successes / rule.applications) * 100)}%`,
                avgTime: `${rule.averageExecutionTime.toFixed(2)}ms`
            }))
        };
    }
}

/**
 * StrategyMonitor: Monitors and manages strategy metrics
 */
export class StrategyMonitor {
    constructor(config = {}) {
        this.config = {
            enableAutoCollection: config.enableAutoCollection !== false,
            collectionInterval: config.collectionInterval || 5000, // 5 seconds
            ...config
        };

        this._strategyMetrics = new Map();
        this._collectionInterval = null;
        this._enabled = true;
    }

    /**
     * Get or create metrics for a strategy
     */
    getMetrics(strategyId, config = {}) {
        if (!this._strategyMetrics.has(strategyId)) {
            const metricsConfig = {strategyId, ...this.config.metrics, ...config};
            this._strategyMetrics.set(strategyId, new StrategyMetrics(metricsConfig));
        }
        return this._strategyMetrics.get(strategyId);
    }

    /**
     * Start automatic metrics collection
     */
    startCollection() {
        if (this._collectionInterval || !this.config.enableAutoCollection) return;

        this._collectionInterval = setInterval(() => {
            if (this._enabled) {
                this._collectResourceUsage();
            }
        }, this.config.collectionInterval);
    }

    /**
     * Stop automatic metrics collection
     */
    stopCollection() {
        if (this._collectionInterval) {
            clearInterval(this._collectionInterval);
            this._collectionInterval = null;
        }
    }

    /**
     * Collect resource usage for all tracked strategies
     */
    _collectResourceUsage() {
        // In a real implementation, this would collect actual resource usage
        // For now, we'll just record the fact that collection happened
        for (const [strategyId, metrics] of this._strategyMetrics.entries()) {
            metrics.recordResourceUsage({
                timestamp: Date.now(),
                cpu: {usage: 0}, // Placeholder
                memory: {used: 0, total: 0}, // Placeholder
                executionQueue: 0
            });
        }
    }

    /**
     * Enable monitoring
     */
    enable() {
        this._enabled = true;
        if (this.config.enableAutoCollection) {
            this.startCollection();
        }
    }

    /**
     * Disable monitoring
     */
    disable() {
        this._enabled = false;
        this.stopCollection();
    }

    /**
     * Get all strategy metrics
     */
    getAllMetrics() {
        const allMetrics = {};
        for (const [strategyId, metrics] of this._strategyMetrics.entries()) {
            allMetrics[strategyId] = metrics.getMetrics();
        }
        return allMetrics;
    }

    /**
     * Reset all metrics
     */
    resetAll() {
        for (const metrics of this._strategyMetrics.values()) {
            metrics.reset();
        }
    }

    /**
     * Cleanup and stop monitoring
     */
    cleanup() {
        this.stopCollection();
        this._strategyMetrics.clear();
    }
}