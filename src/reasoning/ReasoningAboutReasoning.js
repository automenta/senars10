export class ReasoningAboutReasoning {
    constructor(nar, config = {}) {
        this.nar = nar;
        this.config = config;
        this.enabled = config.enabled !== false;
        this.eventBus = nar._eventBus;

        this.reasoningTrace = [];
        this.maxTraceLength = config.maxTraceLength ?? 1000;
        this.traceEnabled = config.traceEnabled !== false;

        this._setupEventListeners();
    }

    _setupEventListeners() {
        if (!this.eventBus || !this.enabled) return;

        ['rule.executed', 'task.processed', 'operation.evaluated', 'cycle.completed', 'memory.concept.accessed']
            .forEach(eventType => {
                this.eventBus.on(eventType, (data) => {
                    this.traceEnabled && this._addToTrace(eventType.replace(/\./g, '_'), data);
                });
            });
    }

    _addToTrace(eventType, data) {
        if (!this.traceEnabled) return;

        const traceEntry = {
            timestamp: Date.now(),
            eventType,
            data,
            cycleCount: this.nar.cycleCount
        };

        this.reasoningTrace.push(traceEntry);

        if (this.reasoningTrace.length > this.maxTraceLength) {
            this.reasoningTrace = this.reasoningTrace.slice(-this.maxTraceLength);
        }
    }

    getReasoningTrace() {
        return [...this.reasoningTrace];
    }

    getRecentEventsOfType(eventType, limit = 10) {
        return this.reasoningTrace
            .filter(entry => entry.eventType === eventType)
            .slice(-limit);
    }

    getReasoningState() {
        return {
            isRunning: this.nar.isRunning,
            cycleCount: this.nar.cycleCount,
            taskCount: this._getTaskCount(),
            memoryStats: this.nar.memory.getDetailedStats(),
            ruleStats: this._getRuleStats(),
            traceLength: this.reasoningTrace.length,
            traceEnabled: this.traceEnabled,
            lastEvents: this.reasoningTrace.slice(-5)
        };
    }

    _getTaskCount() {
        const [beliefs, goals, questions] = [
            this.nar.getBeliefs().length,
            this.nar.getGoals().length,
            this.nar.getQuestions().length
        ];
        return {beliefs, goals, questions, totalTasks: beliefs + goals + questions};
    }

    _getRuleStats() {
        if (!this.nar._ruleEngine) return null;

        const rules = this.nar._ruleEngine.rules ?? [];
        const metrics = this.nar._ruleEngine.metrics ?? {};

        return {
            totalRules: rules.length,
            ruleMetrics: metrics,
            rulePerformance: this._getRulePerformanceData()
        };
    }

    _getRulePerformanceData() {
        if (!this.nar.metricsMonitor) return null;

        try {
            const metrics = this.nar.metricsMonitor.getMetricsSnapshot();
            return metrics.ruleMetrics ?? {};
        } catch (error) {
            this.logger?.warn('Could not retrieve rule performance data:', error);
            return null;
        }
    }

    async performMetaCognitiveReasoning() {
        if (!this.enabled) return null;

        const state = this.getReasoningState();
        const suggestions = [
            ...this._analyzeReasoningPatterns(),
            ...this._analyzeTaskDistribution(state.taskCount),
            ...this._analyzeRuleUsage(state.ruleStats)
        ];

        return {state, suggestions, timestamp: Date.now(), metaReasoningPerformed: true};
    }

    _analyzeReasoningPatterns() {
        const suggestions = [];
        const recentEvents = this.reasoningTrace.slice(-50);

        if (recentEvents.length === 0) return suggestions;

        const ruleExecutions = recentEvents.filter(event => event.eventType === 'rule_execution');
        if (ruleExecutions.length > 0) {
            const ruleFrequency = this._countRuleFrequencies(ruleExecutions);

            for (const [ruleId, count] of Object.entries(ruleFrequency)) {
                if (count > ruleExecutions.length * 0.5) {
                    suggestions.push({
                        type: 'potential_infinite_loop',
                        ruleId,
                        frequency: count / ruleExecutions.length,
                        message: `Rule ${ruleId} is being executed very frequently (${(count / ruleExecutions.length * 100).toFixed(2)}%). May indicate an infinite reasoning loop.`
                    });
                }
            }
        }

        return suggestions;
    }

    _countRuleFrequencies(ruleExecutions) {
        const ruleFrequency = {};
        ruleExecutions.forEach(event => {
            const ruleId = event.data?.ruleId ?? event.data?.rule?.id;
            if (ruleId) ruleFrequency[ruleId] = (ruleFrequency[ruleId] ?? 0) + 1;
        });
        return ruleFrequency;
    }

    _analyzeTaskDistribution(taskCount) {
        const suggestions = [];
        const total = taskCount.beliefs + taskCount.goals + taskCount.questions;

        if (total > 0) {
            const [beliefRatio, goalRatio, questionRatio] = [
                taskCount.beliefs / total,
                taskCount.goals / total,
                taskCount.questions / total
            ];

            const taskAnalysisMap = [
                {
                    ratio: beliefRatio,
                    threshold: 0.9,
                    type: 'task_distribution_imbalance',
                    message: 'System dominated by beliefs with very few goals/questions. Consider adding more goal-oriented or question-answering tasks.'
                },
                {
                    ratio: goalRatio,
                    threshold: 0.5,
                    type: 'high_goal_pressure',
                    message: 'High number of goals relative to beliefs. System may be focusing too much on goal-oriented reasoning.'
                },
                {
                    ratio: questionRatio,
                    threshold: 0.3,
                    type: 'high_query_load',
                    message: 'High number of questions. System may be spending too much time on query answering.'
                }
            ];

            taskAnalysisMap.forEach(({ratio, threshold, type, message}) => {
                if (ratio > threshold) {
                    suggestions.push({type, message});
                }
            });
        }

        return suggestions;
    }

    _analyzeRuleUsage(ruleStats) {
        const suggestions = [];
        if (!ruleStats?.rulePerformance) return suggestions;

        for (const [ruleId, performance] of Object.entries(ruleStats.rulePerformance)) {
            if (performance && typeof performance === 'object') {
                const perfSuggestions = this._getRulePerformanceSuggestions(ruleId, performance);
                suggestions.push(...perfSuggestions);
            }
        }

        return suggestions;
    }

    _getRulePerformanceSuggestions(ruleId, performance) {
        const suggestions = [];

        if (performance.successRate < 0.1) {
            suggestions.push({
                type: 'low_success_rate',
                ruleId,
                successRate: performance.successRate,
                message: `Rule ${ruleId} has a very low success rate (${(performance.successRate * 100).toFixed(2)}%). Consider reviewing or disabling this rule.`
            });
        }

        if (performance.averageExecutionTime > 100) {
            suggestions.push({
                type: 'high_execution_time',
                ruleId,
                avgExecutionTime: performance.averageExecutionTime,
                message: `Rule ${ruleId} has a high average execution time (${performance.averageExecutionTime}ms). Consider optimizing this rule.`
            });
        }

        return suggestions;
    }

    querySystemState(query) {
        if (!query || typeof query !== 'string') {
            throw new Error('Query must be a non-empty string');
        }

        const q = query.toLowerCase();
        const queryMap = [
            {keywords: ['task', 'goal', 'question', 'belief'], handler: () => this._getTaskInfo()},
            {keywords: ['rule', 'engine'], handler: () => this._getRuleInfo()},
            {keywords: ['memory', 'concept'], handler: () => this._getMemoryInfo()},
            {keywords: ['trace', 'reasoning', 'history'], handler: () => this._getTraceInfo()},
            {keywords: ['cycle', 'performance', 'stats'], handler: () => this._getPerformanceInfo()}
        ];

        for (const {keywords, handler} of queryMap) {
            if (keywords.some(keyword => q.includes(keyword))) {
                return handler();
            }
        }

        return this.getReasoningState();
    }

    _getTaskInfo() {
        return {
            tasks: this._getTaskCount(),
            recentTasks: this.nar.getBeliefs().slice(-10),
            goals: this.nar.getGoals(),
            questions: this.nar.getQuestions()
        };
    }

    _getRuleInfo() {
        if (!this.nar._ruleEngine) return {error: 'No rule engine available'};

        const rules = this.nar._ruleEngine.rules ?? [];
        return {
            ruleCount: rules.length,
            ruleNames: rules.map(r => r.id ?? r.constructor?.name ?? 'unknown').slice(0, 10),
            ruleStats: this._getRuleStats()
        };
    }

    _getMemoryInfo() {
        return {
            memoryStats: this.nar.memory.getDetailedStats(),
            conceptCount: this.nar.memory.getConceptCount?.() ?? 'unknown',
            termLayerStats: this.nar.termLayer?.getStats() ?? 'not available'
        };
    }

    _getTraceInfo() {
        return {
            traceLength: this.reasoningTrace.length,
            maxTraceLength: this.maxTraceLength,
            traceEnabled: this.traceEnabled,
            recentEvents: this.reasoningTrace.slice(-10)
        };
    }

    _getPerformanceInfo() {
        return {
            cycleCount: this.nar.cycleCount,
            isRunning: this.nar.isRunning,
            systemStats: this.nar.getStats(),
            metricsMonitor: this.nar.metricsMonitor?.getMetricsSnapshot() ?? 'not available'
        };
    }

    async performSelfCorrection() {
        const analysis = await this.performMetaCognitiveReasoning();
        const corrections = [];

        if (analysis?.suggestions) {
            for (const suggestion of analysis.suggestions) {
                this._processSuggestion(suggestion, corrections);
            }
        }

        return {analysis, corrections, timestamp: Date.now()};
    }

    _processSuggestion(suggestion, corrections) {
        const correctionMap = {
            'potential_infinite_loop': () => {
                if (this.nar._ruleEngine) {
                    const rule = this.nar._ruleEngine.getRule(suggestion.ruleId);
                    if (rule?.priority > 0.1) {
                        corrections.push({
                            action: 'rule_priority_adjustment',
                            ruleId: suggestion.ruleId,
                            message: `Reduced priority of rule that may cause infinite loop`
                        });
                    }
                }
            },
            'low_success_rate': () => corrections.push({
                action: 'rule_review_suggested',
                ruleId: suggestion.ruleId,
                reason: 'Low success rate',
                message: `Rule ${suggestion.ruleId} has low success rate, consider reviewing or disabling`
            }),
            'high_execution_time': () => corrections.push({
                action: 'rule_optimization_suggested',
                ruleId: suggestion.ruleId,
                reason: 'High execution time',
                message: `Rule ${suggestion.ruleId} has high execution time, consider optimization`
            })
        };

        const handler = correctionMap[suggestion.type];
        if (handler) {
            handler();
        } else if (['task_distribution_imbalance', 'high_goal_pressure', 'high_query_load'].includes(suggestion.type)) {
            corrections.push({
                action: 'load_balancing_advice',
                issue: suggestion.type,
                message: suggestion.message
            });
        }
    }

    setEnabled(enabled) {
        this.enabled = !!enabled;
    }

    setTraceEnabled(enabled) {
        this.traceEnabled = !!enabled;
        if (!enabled) this.reasoningTrace = [];
    }

    clearTrace() {
        this.reasoningTrace = [];
    }

    getConfig() {
        return {...this.config};
    }

    setConfig(newConfig) {
        this.config = {...this.config, ...newConfig};

        if (newConfig.traceEnabled !== undefined) this.setTraceEnabled(newConfig.traceEnabled);

        if (newConfig.maxTraceLength !== undefined) {
            this.maxTraceLength = newConfig.maxTraceLength;
            if (this.reasoningTrace.length > this.maxTraceLength) {
                this.reasoningTrace = this.reasoningTrace.slice(-this.maxTraceLength);
            }
        }
    }
}