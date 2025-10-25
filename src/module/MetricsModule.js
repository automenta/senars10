import { BaseModule } from './BaseModule.js';
import { TRUTH } from '../config/constants.js';

export class MetricsModule extends BaseModule {
    constructor() {
        super('metrics');
        this.metrics = {
            ruleExecutions: new Map(),
            ruleSuccessRates: new Map(),
            executionTimes: new Map(),
            cacheStats: new Map(),
            cycleStats: { count: 0, totalDuration: 0, averageDuration: 0 },
            taskStats: { inputCount: 0, processedCount: 0, successCount: 0 }
        };
        this.selfOptimizationTimeout = null;
    }

    register(agent, config) {
        this.agent = agent;
        this.config = config;
        this.enabled = config.enabled !== false;
        this.selfOptimizationEnabled = config.selfOptimizationEnabled !== false;
        this.selfOptimizationInterval = config.selfOptimizationInterval || 10000;

        if (this.enabled) {
            this._setupEventListeners(agent.nar._eventBus);
        }
    }

    async initialize() {
        if (this.enabled && this.selfOptimizationEnabled) {
            this._startSelfOptimizationLoop();
        }
    }

    _setupEventListeners(eventBus) {
        if (!eventBus) return;

        eventBus.on('rule.executed', (data) => this._recordRuleExecution(data));
        eventBus.on('task.input', () => this.metrics.taskStats.inputCount++);
        eventBus.on('task.processed', (data) => {
            this.metrics.taskStats.processedCount++;
            if (data.success) this.metrics.taskStats.successCount++;
        });
        eventBus.on('cycle.completed', (data) => this._recordCycleMetrics(data));
        eventBus.on('cache.hit', (data) => this._updateCacheStats(data, 'hit'));
        eventBus.on('cache.miss', (data) => this._updateCacheStats(data, 'miss'));
    }

    _recordRuleExecution(data) {
        if (!data?.ruleId) return;

        const { ruleId, success, executionTime } = data;
        const ruleMetrics = this._ensureRuleMetrics(ruleId);

        ruleMetrics.totalExecutions++;
        if (success) ruleMetrics.successfulExecutions++;

        if (executionTime !== undefined) {
            ruleMetrics.totalExecutionTime += executionTime;
            this._updateExecutionTime(ruleId, executionTime);
        }

        this.metrics.ruleSuccessRates.set(ruleId, ruleMetrics.successfulExecutions / ruleMetrics.totalExecutions);
    }

    _ensureRuleMetrics(ruleId) {
        if (!this.metrics.ruleExecutions.has(ruleId)) {
            this.metrics.ruleExecutions.set(ruleId, {
                totalExecutions: 0,
                successfulExecutions: 0,
                totalExecutionTime: 0
            });
        }
        return this.metrics.ruleExecutions.get(ruleId);
    }

    _updateExecutionTime(ruleId, executionTime) {
        if (!this.metrics.executionTimes.has(ruleId)) {
            this.metrics.executionTimes.set(ruleId, { count: 0, totalTime: 0, averageTime: 0 });
        }

        const execMetrics = this.metrics.executionTimes.get(ruleId);
        execMetrics.count++;
        execMetrics.totalTime += executionTime;
        execMetrics.averageTime = execMetrics.totalTime / execMetrics.count;
    }

    _recordCycleMetrics(data) {
        if (!data?.duration) return;

        this.metrics.cycleStats.count++;
        this.metrics.cycleStats.totalDuration += data.duration;
        this.metrics.cycleStats.averageDuration = this.metrics.cycleStats.totalDuration / this.metrics.cycleStats.count;
    }

    _updateCacheStats(data, type) {
        const { cacheName, duration } = data || {};
        if (!cacheName) return;

        if (!this.metrics.cacheStats.has(cacheName)) {
            this.metrics.cacheStats.set(cacheName, { hits: 0, misses: 0, totalTime: 0 });
        }

        const cacheMetrics = this.metrics.cacheStats.get(cacheName);
        type === 'hit' ? cacheMetrics.hits++ : cacheMetrics.misses++;
        if (duration !== undefined) cacheMetrics.totalTime += duration;
    }

    _startSelfOptimizationLoop() {
        this.selfOptimizationTimeout = setInterval(() => this._performSelfOptimization(), this.selfOptimizationInterval);
    }

    _performSelfOptimization() {
        if (!this.agent || !this.enabled || !this.selfOptimizationEnabled) return;

        try {
            this._adjustRulePriorities();
            this.agent.nar._eventBus.emit('optimization.performed', {
                timestamp: Date.now(),
                optimizationType: 'rulePriorityAdjustment',
                metricsSnapshot: this.getMetricsSnapshot()
            });
        } catch (error) {
            console.error('Error during self-optimization:', error);
            this.agent.nar._eventBus.emit('optimization.error', {
                error: error.message,
                timestamp: Date.now()
            });
        }
    }

    _adjustRulePriorities() {
        if (!this.agent.nar || !this.agent.nar._ruleEngine) return;
        const ruleEngine = this.agent.nar._ruleEngine;

        for (const [ruleId, successRate] of this.metrics.ruleSuccessRates.entries()) {
            const rule = this._findRuleById(ruleEngine, ruleId);
            if (!rule) continue;

            const execMetrics = this.metrics.executionTimes.get(ruleId);
            const avgExecutionTime = execMetrics?.averageTime || 0;
            const performanceScore = this._calculatePerformanceScore(successRate, avgExecutionTime);

            this._adjustRulePriority(rule, performanceScore);
        }
    }

    _findRuleById(ruleEngine, ruleId) {
        if (!ruleEngine || !ruleEngine.rules) return null;
        for (const rule of ruleEngine.rules) {
            if (rule.id === ruleId || rule.name === ruleId || (rule.constructor && rule.constructor.name === ruleId)) {
                return rule;
            }
        }
        return null;
    }

    _calculatePerformanceScore(successRate, avgExecutionTime) {
        const timeScore = avgExecutionTime > 0 ? 1 / (1 + Math.log(avgExecutionTime + 1)) : 1;
        return (successRate * 0.7) + (timeScore * 0.3);
    }

    _adjustRulePriority(rule, performanceScore) {
        if (!rule.withPriority) return;

        const newPriority = this._mapPerformanceScoreToPriority(performanceScore);
        const newRule = rule.withPriority(newPriority);

        if (this.agent.nar && this.agent.nar._ruleEngine) {
            this.agent.nar._ruleEngine._rules.set(rule.id, newRule);
        }

        this.agent.nar._eventBus.emit('rule.priority.adjusted', {
            ruleId: rule.id,
            oldPriority: rule.priority,
            newPriority,
            performanceScore,
            timestamp: Date.now()
        });
    }

    _mapPerformanceScoreToPriority(score) {
        const clampedScore = Math.max(0, Math.min(1, score));
        const minPriority = TRUTH.MIN_PRIORITY + 0.1;
        const maxPriority = TRUTH.MAX_PRIORITY - 0.1;

        return minPriority + (clampedScore * (maxPriority - minPriority));
    }

    getMetricsSnapshot() {
        return {
            timestamp: Date.now(),
            ruleMetrics: this._getRuleMetrics(),
            cycleMetrics: { ...this.metrics.cycleStats },
            taskMetrics: { ...this.metrics.taskStats },
            cacheMetrics: this._getCacheMetrics()
        };
    }

    _getRuleMetrics() {
        const summary = {};

        for (const [ruleId, metrics] of this.metrics.ruleExecutions.entries()) {
            const successRate = this.metrics.ruleSuccessRates.get(ruleId) || 0;
            const execMetrics = this.metrics.executionTimes.get(ruleId) || { averageTime: 0 };

            summary[ruleId] = {
                totalExecutions: metrics.totalExecutions,
                successfulExecutions: metrics.successfulExecutions,
                successRate,
                averageExecutionTime: execMetrics.averageTime,
                totalExecutionTime: metrics.totalExecutionTime
            };
        }

        return summary;
    }

    _getCacheMetrics() {
        const summary = {};

        for (const [cacheName, metrics] of this.metrics.cacheStats.entries()) {
            const totalAccesses = metrics.hits + metrics.misses;
            const hitRate = totalAccesses > 0 ? metrics.hits / totalAccesses : 0;
            const avgAccessTime = metrics.totalTime > 0 ? metrics.totalTime / totalAccesses : 0;

            summary[cacheName] = {
                totalAccesses,
                hits: metrics.hits,
                misses: metrics.misses,
                hitRate,
                averageAccessTime
            };
        }

        return summary;
    }

    resetMetrics() {
        this.metrics.ruleExecutions.clear();
        this.metrics.ruleSuccessRates.clear();
        this.metrics.executionTimes.clear();
        this.metrics.cacheStats.clear();
        this.metrics.cycleStats = { count: 0, totalDuration: 0, averageDuration: 0 };
        this.metrics.taskStats = { inputCount: 0, processedCount: 0, successCount: 0 };
    }

    shutdown() {
        if (this.selfOptimizationTimeout) {
            clearInterval(this.selfOptimizationTimeout);
            this.selfOptimizationTimeout = null;
        }
    }
}
