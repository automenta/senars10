/**
 * @file core/reasoning/Rule.js
 * @description Base class for all reasoning rules.
 */

import { Logger }from '../base/utilities.js';

/**
 * Base class for all reasoning rules.
 */
export class Rule {
  constructor(id, options = {}) {
    Object.assign(this, {
      id,
      name: options.name || id,
      description: options.description || '',
      priority: options.priority || 0.5,
      enabled: options.enabled !== false,
      type: options.type || 'general',
      parameters: options.parameters || {},
      metrics: {
        executions: 0,
        successes: 0,
        failures: 0,
        avgTime: 0,
        lastRun: null
      }
    });
  }

  canApply(context) {
    return true;
  }

  async apply(context) {
    throw new Error('apply must be implemented by subclasses');
  }

  updateMetrics(success, time) {
    const m = this.metrics;
    m.executions++;
    if (success) {
      m.successes++;
    } else {
      m.failures++;
    }
    m.avgTime = (m.avgTime * (m.executions - 1) + time) / m.executions;
    m.lastRun = Date.now();
  }

  getMetrics() {
    return { ...this.metrics };
  }
}