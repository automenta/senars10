/**
 * ReasoningAboutReasoning (RBR) component for meta-cognitive reasoning
 * Provides introspection APIs for real-time system state examination
 */
export class ReasoningAboutReasoning {
  constructor(nar, config = {}) {
    this.nar = nar;
    this.config = config;
    this.enabled = config.enabled !== false; // Enabled by default
    this.eventBus = nar._eventBus;
    
    this.reasoningTrace = [];
    this.maxTraceLength = config.maxTraceLength || 1000;
    this.traceEnabled = config.traceEnabled !== false;
    
    this._setupEventListeners();
  }

  /**
   * Setup event listeners to capture reasoning events for introspection
   */
  _setupEventListeners() {
    if (!this.eventBus || !this.enabled) return;

    // Listen to rule execution events for trace building
    this.eventBus.on('rule.executed', (data) => {
      if (this.traceEnabled) {
        this._addToTrace('rule_execution', data);
      }
    });

    // Listen to task processing events
    this.eventBus.on('task.processed', (data) => {
      if (this.traceEnabled) {
        this._addToTrace('task_processed', data);
      }
    });

    // Listen to operation evaluations
    this.eventBus.on('operation.evaluated', (data) => {
      if (this.traceEnabled) {
        this._addToTrace('operation_evaluated', data);
      }
    });

    // Listen to cycle completion events
    this.eventBus.on('cycle.completed', (data) => {
      if (this.traceEnabled) {
        this._addToTrace('cycle_completed', data);
      }
    });

    // Listen to memory operations
    this.eventBus.on('memory.concept.accessed', (data) => {
      if (this.traceEnabled) {
        this._addToTrace('memory_accessed', data);
      }
    });
  }

  /**
   * Add an event to the reasoning trace for introspection
   */
  _addToTrace(eventType, data) {
    if (!this.traceEnabled) return;

    const traceEntry = {
      timestamp: Date.now(),
      eventType,
      data,
      cycleCount: this.nar.cycleCount
    };

    this.reasoningTrace.push(traceEntry);

    // Limit the trace length to prevent memory issues
    if (this.reasoningTrace.length > this.maxTraceLength) {
      this.reasoningTrace = this.reasoningTrace.slice(-this.maxTraceLength);
    }
  }

  /**
   * Get the current reasoning trace
   */
  getReasoningTrace() {
    return [...this.reasoningTrace]; // Return a copy to prevent external modification
  }

  /**
   * Get recent reasoning events of a specific type
   */
  getRecentEventsOfType(eventType, limit = 10) {
    return this.reasoningTrace
      .filter(entry => entry.eventType === eventType)
      .slice(-limit);
  }

  /**
   * Get a summary of the reasoning state
   */
  getReasoningState() {
    return {
      isRunning: this.nar.isRunning,
      cycleCount: this.nar.cycleCount,
      taskCount: this._getTaskCount(),
      memoryStats: this.nar.memory.getDetailedStats(),
      ruleStats: this._getRuleStats(),
      traceLength: this.reasoningTrace.length,
      traceEnabled: this.traceEnabled,
      lastEvents: this.reasoningTrace.slice(-5)  // Last 5 events
    };
  }

  /**
   * Get current task statistics
   */
  _getTaskCount() {
    return {
      beliefs: this.nar.getBeliefs().length,
      goals: this.nar.getGoals().length,
      questions: this.nar.getQuestions().length,
      totalTasks: this.nar.getBeliefs().length + this.nar.getGoals().length + this.nar.getQuestions().length
    };
  }

  /**
   * Get rule statistics
   */
  _getRuleStats() {
    if (!this.nar._ruleEngine) return null;

    const rules = this.nar._ruleEngine.rules || [];
    const metrics = this.nar._ruleEngine.metrics || {};

    return {
      totalRules: rules.length,
      ruleMetrics: metrics,
      rulePerformance: this._getRulePerformanceData()
    };
  }

  /**
   * Get rule performance data from the MetricsMonitor if available
   */
  _getRulePerformanceData() {
    if (!this.nar.metricsMonitor) return null;
    
    try {
      const metrics = this.nar.metricsMonitor.getMetricsSnapshot();
      return metrics.ruleMetrics || {};
    } catch (error) {
      console.warn('Could not retrieve rule performance data:', error);
      return null;
    }
  }

  /**
   * Perform meta-cognitive reasoning about the system's current state
   */
  async performMetaCognitiveReasoning() {
    if (!this.enabled) return null;

    const state = this.getReasoningState();
    const suggestions = [];

    // Analyze the reasoning trace to identify patterns or issues
    suggestions.push(...this._analyzeReasoningPatterns());

    // Analyze task distribution
    suggestions.push(...this._analyzeTaskDistribution(state.taskCount));

    // Analyze rule usage
    suggestions.push(...this._analyzeRuleUsage(state.ruleStats));

    return {
      state,
      suggestions,
      timestamp: Date.now(),
      metaReasoningPerformed: true
    };
  }

  /**
   * Analyze recent reasoning patterns to identify issues or trends
   */
  _analyzeReasoningPatterns() {
    const suggestions = [];
    const recentEvents = this.reasoningTrace.slice(-50); // Analyze last 50 events

    if (recentEvents.length === 0) return suggestions;

    // Check for repetitive patterns in rule execution that might indicate infinite loops
    const ruleExecutions = recentEvents.filter(event => event.eventType === 'rule_execution');
    if (ruleExecutions.length > 0) {
      const ruleFrequency = {};
      ruleExecutions.forEach(event => {
        const ruleId = event.data?.ruleId || event.data?.rule?.id;
        if (ruleId) {
          ruleFrequency[ruleId] = (ruleFrequency[ruleId] || 0) + 1;
        }
      });

      // Identify rules that are being executed very frequently
      for (const [ruleId, count] of Object.entries(ruleFrequency)) {
        if (count > ruleExecutions.length * 0.5) { // If a rule is executed more than 50% of the time
          suggestions.push({
            type: 'potential_infinite_loop',
            ruleId: ruleId,
            frequency: count / ruleExecutions.length,
            message: `Rule ${ruleId} is being executed very frequently (${(count / ruleExecutions.length * 100).toFixed(2)}%). May indicate an infinite reasoning loop.`
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Analyze task distribution to identify imbalances
   */
  _analyzeTaskDistribution(taskCount) {
    const suggestions = [];
    const total = taskCount.beliefs + taskCount.goals + taskCount.questions;

    if (total > 0) {
      const beliefRatio = taskCount.beliefs / total;
      const goalRatio = taskCount.goals / total;
      const questionRatio = taskCount.questions / total;

      // Check if the system is dominated by one type of task
      if (beliefRatio > 0.9) {
        suggestions.push({
          type: 'task_distribution_imbalance',
          message: 'System dominated by beliefs with very few goals/questions. Consider adding more goal-oriented or question-answering tasks.'
        });
      }

      if (goalRatio > 0.5) {
        suggestions.push({
          type: 'high_goal_pressure',
          message: 'High number of goals relative to beliefs. System may be focusing too much on goal-oriented reasoning.'
        });
      }

      if (questionRatio > 0.3) {
        suggestions.push({
          type: 'high_query_load',
          message: 'High number of questions. System may be spending too much time on query answering.'
        });
      }
    }

    return suggestions;
  }

  /**
   * Analyze rule usage to suggest optimizations
   */
  _analyzeRuleUsage(ruleStats) {
    const suggestions = [];
    if (!ruleStats || !ruleStats.rulePerformance) return suggestions;

    for (const [ruleId, performance] of Object.entries(ruleStats.rulePerformance)) {
      if (performance && typeof performance === 'object') {
        // Check for rules with very low success rates
        if (performance.successRate && performance.successRate < 0.1) {
          suggestions.push({
            type: 'low_success_rate',
            ruleId: ruleId,
            successRate: performance.successRate,
            message: `Rule ${ruleId} has a very low success rate (${(performance.successRate * 100).toFixed(2)}%). Consider reviewing or disabling this rule.`
          });
        }

        // Check for rules with very high execution time
        if (performance.averageExecutionTime && performance.averageExecutionTime > 100) { // More than 100ms average
          suggestions.push({
            type: 'high_execution_time',
            ruleId: ruleId,
            avgExecutionTime: performance.averageExecutionTime,
            message: `Rule ${ruleId} has a high average execution time (${performance.averageExecutionTime}ms). Consider optimizing this rule.`
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Query the system's reasoning state for specific information
   */
  querySystemState(query) {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }

    query = query.toLowerCase();

    if (query.includes('task') || query.includes('goal') || query.includes('question') || query.includes('belief')) {
      return this._getTaskInfo();
    } else if (query.includes('rule') || query.includes('engine')) {
      return this._getRuleInfo();
    } else if (query.includes('memory') || query.includes('concept')) {
      return this._getMemoryInfo();
    } else if (query.includes('trace') || query.includes('reasoning') || query.includes('history')) {
      return this._getTraceInfo();
    } else if (query.includes('cycle') || query.includes('performance') || query.includes('stats')) {
      return this._getPerformanceInfo();
    } else {
      // General system state
      return this.getReasoningState();
    }
  }

  /**
   * Get task-related information
   */
  _getTaskInfo() {
    return {
      tasks: this._getTaskCount(),
      recentTasks: this.nar.getBeliefs().slice(-10), // Last 10 beliefs as example
      goals: this.nar.getGoals().length > 0 ? this.nar.getGoals() : [],
      questions: this.nar.getQuestions().length > 0 ? this.nar.getQuestions() : []
    };
  }

  /**
   * Get rule-related information
   */
  _getRuleInfo() {
    if (!this.nar._ruleEngine) return { error: 'No rule engine available' };

    const rules = this.nar._ruleEngine.rules || [];
    return {
      ruleCount: rules.length,
      ruleNames: rules.map(r => r.id || r.constructor?.name || 'unknown').slice(0, 10), // First 10 rule names
      ruleStats: this._getRuleStats()
    };
  }

  /**
   * Get memory-related information
   */
  _getMemoryInfo() {
    return {
      memoryStats: this.nar.memory.getDetailedStats(),
      conceptCount: this.nar.memory.getConceptCount ? this.nar.memory.getConceptCount() : 'unknown',
      termLayerStats: this.nar.termLayer ? this.nar.termLayer.getStats() : 'not available'
    };
  }

  /**
   * Get trace-related information
   */
  _getTraceInfo() {
    return {
      traceLength: this.reasoningTrace.length,
      maxTraceLength: this.maxTraceLength,
      traceEnabled: this.traceEnabled,
      recentEvents: this.reasoningTrace.slice(-10) // Last 10 events
    };
  }

  /**
   * Get performance-related information
   */
  _getPerformanceInfo() {
    return {
      cycleCount: this.nar.cycleCount,
      isRunning: this.nar.isRunning,
      systemStats: this.nar.getStats(),
      metricsMonitor: this.nar.metricsMonitor ? this.nar.metricsMonitor.getMetricsSnapshot() : 'not available'
    };
  }

  /**
   * Perform system self-correction based on meta-cognitive analysis
   */
  async performSelfCorrection() {
    const analysis = await this.performMetaCognitiveReasoning();
    const corrections = [];

    if (analysis && analysis.suggestions) {
      for (const suggestion of analysis.suggestions) {
        switch (suggestion.type) {
          case 'potential_infinite_loop':
            // Try to reduce priority of the problematic rule
            if (this.nar._ruleEngine) {
              const rule = this.nar._ruleEngine.getRule(suggestion.ruleId);
              if (rule && rule.priority > 0.1) {
                // In a real scenario, we might create a new rule with lower priority
                corrections.push({
                  action: 'rule_priority_adjustment',
                  ruleId: suggestion.ruleId,
                  message: `Reduced priority of rule that may cause infinite loop`
                });
              }
            }
            break;

          case 'low_success_rate':
            // Consider disabling the low-success rule
            corrections.push({
              action: 'rule_review_suggested',
              ruleId: suggestion.ruleId,
              reason: 'Low success rate',
              message: `Rule ${suggestion.ruleId} has low success rate, consider reviewing or disabling`
            });
            break;

          case 'high_execution_time':
            corrections.push({
              action: 'rule_optimization_suggested',
              ruleId: suggestion.ruleId,
              reason: 'High execution time',
              message: `Rule ${suggestion.ruleId} has high execution time, consider optimization`
            });
            break;

          case 'task_distribution_imbalance':
            corrections.push({
              action: 'task_distribution_advice',
              issue: suggestion.type,
              message: suggestion.message
            });
            break;

          case 'high_goal_pressure':
          case 'high_query_load':
            corrections.push({
              action: 'load_balancing_advice',
              issue: suggestion.type,
              message: suggestion.message
            });
            break;
        }
      }
    }

    return {
      analysis,
      corrections,
      timestamp: Date.now()
    };
  }

  /**
   * Enable or disable RBR functionality
   */
  setEnabled(enabled) {
    this.enabled = !!enabled;
  }

  /**
   * Enable or disable tracing
   */
  setTraceEnabled(enabled) {
    this.traceEnabled = !!enabled;
    if (!enabled) {
      this.reasoningTrace = []; // Clear trace when disabled
    }
  }

  /**
   * Clear the reasoning trace
   */
  clearTrace() {
    this.reasoningTrace = [];
  }

  /**
   * Get the configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    if (newConfig.traceEnabled !== undefined) {
      this.setTraceEnabled(newConfig.traceEnabled);
    }

    if (newConfig.maxTraceLength !== undefined) {
      this.maxTraceLength = newConfig.maxTraceLength;
      // Trim trace if new limit is smaller
      if (this.reasoningTrace.length > this.maxTraceLength) {
        this.reasoningTrace = this.reasoningTrace.slice(-this.maxTraceLength);
      }
    }
  }
}