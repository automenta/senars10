import Component from '../base/Component.js';

class Self extends Component {
  constructor() {
    super();
    this.performanceRules = [];
  }

  async initialize(config = {}) {
    await super.initialize(config);
  }

  getSystemStats() {
    if (!this.core) {
      return {};
    }

    const stats = {};
    for (const [name, component] of this.core.componentMap.entries()) {
      if (typeof component.getMetrics === 'function') {
        const metrics = component.getMetrics();
        if (Object.keys(metrics).length > 0) {
          stats[name] = metrics;
        }
      }
    }
    return stats;
  }

  async optimize() {
    const stats = this.getSystemStats();

    // Example: Check memory pressure
    if (stats.memory && stats.memory.usage > 0.9) {
      this.emit('system.memory.high_pressure', { usage: stats.memory.usage });
    }

    // Example: Check cycle latency
    if (stats.cycle && stats.cycle.avgLatency > 200) {
      this.emit('system.cycle.high_latency', { latency: stats.cycle.avgLatency });
      // Future action: could adjust cycleIntervalMs
    }

    // Apply performance rules
    for (const rule of this.performanceRules) {
      rule(this.core, stats);
    }
  }

  addPerformanceRule(rule) {
    this.performanceRules.push(rule);
  }
}

export default Self;