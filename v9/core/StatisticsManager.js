export class StatisticsManager {
  constructor() {
    this.stats = { cycles: 0, inputTasks: 0, derivedTasks: 0, birthdate: null };
  }

  recordInput() { this.stats.inputTasks++; }
  recordDerived(count) { this.stats.derivedTasks += count; }
  recordCycle() { this.stats.cycles++; }
  setBirthdate(time) { this.stats.birthdate = time; }

  getStats() { return { ...this.stats }; }

  getUptime(currentTime) {
    return this.stats.birthdate ? currentTime - this.stats.birthdate : 0;
  }

  _getReasoningMetrics(reasoner) {
    const enabledRules = reasoner.getEnabledRules();
    const ruleTypeCounts = {};

    enabledRules.forEach(rule => {
      if (rule.type) {
        ruleTypeCounts[rule.type] = (ruleTypeCounts[rule.type] || 0) + 1;
      }
    });

    return {
      enabledRulesCount: enabledRules.length,
      ruleTypeDistribution: ruleTypeCounts,
      averageRulesPerCycle: this.stats.cycles > 0
        ? (this.stats.derivedTasks / this.stats.cycles).toFixed(2)
        : 0
    };
  }

  _getRulePerformanceReport(reasoner) {
    const performance = reasoner.getStats().performance;
    const enabledRules = reasoner.getEnabledRules();

    return {
      ...performance,
      ruleDetails: enabledRules.map(rule => {
        const metrics = reasoner.performanceMetrics.get(rule.id);
        return metrics ? {
          id: rule.id,
          executions: metrics.executions,
          successes: metrics.successes,
          failures: metrics.failures,
          successRate: metrics.executions > 0
            ? ((metrics.successes / metrics.executions) * 100).toFixed(1) + '%'
            : '0%',
          avgTime: Math.round(metrics.avgTime * 100) / 100 + 'ms',
          lastError: metrics.lastError
        } : null;
      }).filter(Boolean)
    };
  }

  getDetailedReasoningReport(reasoner) {
    const stats = this.getStats();
    const enabledRules = reasoner.getEnabledRules();

    return {
      ...stats,
      enabledRules: enabledRules.map(rule => ({
        id: rule.id,
        name: rule.name || rule.id,
        type: rule.type,
        priority: rule.priority,
        description: rule.description
      })),
      rulePerformance: this._getRulePerformanceReport(reasoner),
      reasoningMetrics: this._getReasoningMetrics(reasoner)
    };
  }

  getMemoryState(memory) {
    const tasks = memory.getAllTasks();
    return {
      totalTasks: tasks.length,
      beliefs: tasks.filter(t => t.punctuation === '.').length,
      goals: tasks.filter(t => t.punctuation === '!').length,
      questions: tasks.filter(t => t.punctuation === '?').length,
      concepts: memory.conceptStorage.size,
      focusTasks: 0, // This would need focus reference if needed
      longTermTasks: memory.getAllTasks().size
    };
  }

  getFullStats(reasoner, memory, currentTime) {
    const memoryState = this.getMemoryState(memory);
    const reasonerStats = reasoner.getStats();

    return {
      ...this.stats,
      taskCount: memoryState.totalTasks,
      conceptCount: memoryState.concepts,
      uptime: this.getUptime(currentTime),
      memoryState,
      reasonerStats,
      reasoningMetrics: this._getReasoningMetrics(reasoner)
    };
  }
}