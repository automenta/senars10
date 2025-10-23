/**
 * MetricsMonitor component for tracking key system performance indicators
 * and enabling dynamic rule priority adjustment.
 */
export class MetricsMonitor {
  constructor(config = {}) {
    this.config = config;
    this.metrics = {
      ruleExecutions: new Map(),
      ruleSuccessRates: new Map(),
      executionTimes: new Map(),
      cacheStats: new Map(),
      cycleStats: {
        count: 0,
        totalDuration: 0,
        averageDuration: 0
      },
      taskStats: {
        inputCount: 0,
        processedCount: 0,
        successCount: 0
      }
    };
    
    this.eventBus = config.eventBus || null;
    this.nar = config.nar || null;
    this.enabled = config.enabled !== false; // Enabled by default
    this.selfOptimizationEnabled = config.selfOptimizationEnabled !== false;
    this.selfOptimizationInterval = config.selfOptimizationInterval || 10000; // 10 seconds
    this.selfOptimizationTimeout = null;
    
    this._setupEventListeners();
    this._startSelfOptimizationLoop();
  }

  /**
   * Setup event listeners to collect metrics from the system
   */
  _setupEventListeners() {
    if (!this.eventBus || !this.nar) return;

    // Listen to rule execution events
    this.eventBus.on('rule.executed', (data) => {
      this._recordRuleExecution(data);
    });

    // Listen to task processing events
    this.eventBus.on('task.input', () => {
      this.metrics.taskStats.inputCount++;
    });

    this.eventBus.on('task.processed', (data) => {
      this.metrics.taskStats.processedCount++;
      if (data.success) {
        this.metrics.taskStats.successCount++;
      }
    });

    // Listen to cycle completion events
    this.eventBus.on('cycle.completed', (data) => {
      this._recordCycleMetrics(data);
    });

    // Listen to cache events (if available)
    this.eventBus.on('cache.hit', (data) => {
      this._recordCacheHit(data);
    });

    this.eventBus.on('cache.miss', (data) => {
      this._recordCacheMiss(data);
    });
  }

  /**
   * Record rule execution metrics
   */
  _recordRuleExecution(data) {
    const { ruleId, success, executionTime } = data;
    if (!ruleId) return;

    if (!this.metrics.ruleExecutions.has(ruleId)) {
      this.metrics.ruleExecutions.set(ruleId, {
        totalExecutions: 0,
        successfulExecutions: 0,
        totalExecutionTime: 0
      });
    }

    const ruleMetrics = this.metrics.ruleExecutions.get(ruleId);
    ruleMetrics.totalExecutions++;
    
    if (success) {
      ruleMetrics.successfulExecutions++;
    }

    if (executionTime !== undefined) {
      ruleMetrics.totalExecutionTime += executionTime;
      
      // Update execution time average
      if (!this.metrics.executionTimes.has(ruleId)) {
        this.metrics.executionTimes.set(ruleId, {
          count: 0,
          totalTime: 0,
          averageTime: 0
        });
      }
      
      const execMetrics = this.metrics.executionTimes.get(ruleId);
      execMetrics.count++;
      execMetrics.totalTime += executionTime;
      execMetrics.averageTime = execMetrics.totalTime / execMetrics.count;
    }

    // Update success rate
    const successRate = ruleMetrics.successfulExecutions / ruleMetrics.totalExecutions;
    this.metrics.ruleSuccessRates.set(ruleId, successRate);
  }

  /**
   * Record cycle metrics
   */
  _recordCycleMetrics(data) {
    this.metrics.cycleStats.count++;
    
    if (data.duration) {
      this.metrics.cycleStats.totalDuration += data.duration;
      this.metrics.cycleStats.averageDuration = 
        this.metrics.cycleStats.totalDuration / this.metrics.cycleStats.count;
    }
  }

  /**
   * Record cache hit
   */
  _recordCacheHit(data) {
    const { cacheName, duration } = data || {};
    if (!cacheName) return;

    if (!this.metrics.cacheStats.has(cacheName)) {
      this.metrics.cacheStats.set(cacheName, {
        hits: 0,
        misses: 0,
        totalTime: 0
      });
    }

    const cacheMetrics = this.metrics.cacheStats.get(cacheName);
    cacheMetrics.hits++;
    
    if (duration !== undefined) {
      cacheMetrics.totalTime += duration;
    }
  }

  /**
   * Record cache miss
   */
  _recordCacheMiss(data) {
    const { cacheName, duration } = data || {};
    if (!cacheName) return;

    if (!this.metrics.cacheStats.has(cacheName)) {
      this.metrics.cacheStats.set(cacheName, {
        hits: 0,
        misses: 0,
        totalTime: 0
      });
    }

    const cacheMetrics = this.metrics.cacheStats.get(cacheName);
    cacheMetrics.misses++;
    
    if (duration !== undefined) {
      cacheMetrics.totalTime += duration;
    }
  }

  /**
   * Start the self-optimization loop
   */
  _startSelfOptimizationLoop() {
    if (!this.enabled || !this.selfOptimizationEnabled) return;

    this.selfOptimizationTimeout = setInterval(() => {
      this._performSelfOptimization();
    }, this.selfOptimizationInterval);
  }

  /**
   * Perform self-optimization based on collected metrics
   */
  _performSelfOptimization() {
    if (!this.nar || !this.enabled || !this.selfOptimizationEnabled) return;

    try {
      // Adjust rule priorities based on success rates and execution times
      this._adjustRulePriorities();
      
      // Emit optimization event
      if (this.eventBus) {
        this.eventBus.emit('optimization.performed', {
          timestamp: Date.now(),
          optimizationType: 'rulePriorityAdjustment',
          metricsSnapshot: this.getMetricsSnapshot()
        });
      }
    } catch (error) {
      console.error('Error during self-optimization:', error);
      if (this.eventBus) {
        this.eventBus.emit('optimization.error', {
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Adjust rule priorities based on performance metrics
   */
  _adjustRulePriorities() {
    if (!this.nar || !this.nar._ruleEngine) return;

    // Get rule engine to access the rules
    const ruleEngine = this.nar._ruleEngine;
    
    // Calculate priority adjustments based on success rates and execution times
    for (const [ruleId, metrics] of this.metrics.ruleSuccessRates.entries()) {
      const rule = this._findRuleById(ruleEngine, ruleId);
      if (!rule) continue;

      // Get execution time metrics
      const execMetrics = this.metrics.executionTimes.get(ruleId);
      const avgExecutionTime = execMetrics ? execMetrics.averageTime : 0;
      
      // Calculate a performance score (higher is better)
      const successRate = metrics;
      const performanceScore = this._calculatePerformanceScore(successRate, avgExecutionTime);
      
      // Adjust rule priority based on performance score
      this._adjustRulePriority(rule, performanceScore);
    }
  }

  /**
   * Find a rule by its ID in the rule engine
   */
  _findRuleById(ruleEngine, ruleId) {
    if (!ruleEngine || !ruleEngine._rules) return null;

    // Search through registered rules to find the one with matching ID
    for (const rule of ruleEngine._rules) {
      if (rule.id === ruleId || rule.name === ruleId) {
        return rule;
      }
      
      // Check if rule has other identifying properties
      if (rule.constructor && rule.constructor.name === ruleId) {
        return rule;
      }
    }
    
    return null;
  }

  /**
   * Calculate a performance score based on success rate and execution time
   */
  _calculatePerformanceScore(successRate, avgExecutionTime) {
    // Success rate is more important than execution time
    // Normalize execution time: faster is better (lower time = higher score)
    const timeScore = avgExecutionTime > 0 ? 1 / (1 + Math.log(avgExecutionTime + 1)) : 1;
    
    // Weight success rate more heavily (0.7) than time efficiency (0.3)
    return (successRate * 0.7) + (timeScore * 0.3);
  }

  /**
   * Adjust the priority of a rule based on its performance score
   */
  _adjustRulePriority(rule, performanceScore) {
    // In SeNARS, Rule instances are immutable, so we need to create a new instance with updated priority
    if (rule.withPriority) {
      // Calculate new priority based on performance score (map 0-1 score to priority range)
      // The default priority range is between TRUTH.MIN_PRIORITY and TRUTH.MAX_PRIORITY
      const newPriority = this._mapPerformanceScoreToPriority(performanceScore);
      
      // Create a new rule instance with the updated priority
      const newRule = rule.withPriority(newPriority);
      
      // Update the rule in the rule engine
      if (this.nar && this.nar._ruleEngine) {
        // Use the rule engine's internal map to update the rule
        this.nar._ruleEngine._rules.set(rule.id, newRule);
      }
      
      // Emit an event to indicate that rule priority has been adjusted
      if (this.eventBus) {
        this.eventBus.emit('rule.priority.adjusted', {
          ruleId: rule.id,
          oldPriority: rule.priority,
          newPriority: newPriority,
          performanceScore: performanceScore,
          timestamp: Date.now()
        });
      }
    }
  }
  
  /**
   * Map a performance score (0-1) to a priority value within the valid range
   */
  _mapPerformanceScoreToPriority(score) {
    // Ensure score is within 0-1 range
    const clampedScore = Math.max(0, Math.min(1, score));
    
    // Use the priority range from constants
    const minPriority = 0.1; // Using a minimum of 0.1 to ensure rules still get some execution time
    const maxPriority = 0.9; // Using a maximum of 0.9 to leave headroom for special high-priority rules
    
    return minPriority + (clampedScore * (maxPriority - minPriority));
  }

  /**
   * Get current metrics snapshot
   */
  getMetricsSnapshot() {
    const snapshot = {
      timestamp: Date.now(),
      ruleMetrics: this._getRuleMetrics(),
      cycleMetrics: { ...this.metrics.cycleStats },
      taskMetrics: { ...this.metrics.taskStats },
      cacheMetrics: this._getCacheMetrics()
    };

    return snapshot;
  }

  /**
   * Get rule metrics summary
   */
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

  /**
   * Get cache metrics summary
   */
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
        averageAccessTime: avgAccessTime
      };
    }
    
    return summary;
  }

  /**
   * Reset all collected metrics
   */
  resetMetrics() {
    this.metrics.ruleExecutions.clear();
    this.metrics.ruleSuccessRates.clear();
    this.metrics.executionTimes.clear();
    this.metrics.cacheStats.clear();
    
    this.metrics.cycleStats = {
      count: 0,
      totalDuration: 0,
      averageDuration: 0
    };
    
    this.metrics.taskStats = {
      inputCount: 0,
      processedCount: 0,
      successCount: 0
    };
  }

  /**
   * Enable or disable the monitor
   */
  setEnabled(enabled) {
    this.enabled = !!enabled;
    if (!this.enabled && this.selfOptimizationTimeout) {
      clearInterval(this.selfOptimizationTimeout);
      this.selfOptimizationTimeout = null;
    } else if (this.enabled && !this.selfOptimizationTimeout) {
      this._startSelfOptimizationLoop();
    }
  }

  /**
   * Shutdown the monitor
   */
  shutdown() {
    if (this.selfOptimizationTimeout) {
      clearInterval(this.selfOptimizationTimeout);
      this.selfOptimizationTimeout = null;
    }
    
    // Remove event listeners if we have direct access to them
    if (this.eventBus) {
      // Note: We don't remove listeners here to avoid interfering with other components
      // that may depend on these events
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Update self-optimization settings if they changed
    if (newConfig.selfOptimizationEnabled !== undefined) {
      this.selfOptimizationEnabled = newConfig.selfOptimizationEnabled;
    }
    
    if (newConfig.selfOptimizationInterval !== undefined) {
      this.selfOptimizationInterval = newConfig.selfOptimizationInterval;
      
      // Restart the optimization loop with new interval
      if (this.selfOptimizationTimeout) {
        clearInterval(this.selfOptimizationTimeout);
        this.selfOptimizationTimeout = null;
        this._startSelfOptimizationLoop();
      }
    }
  }
}