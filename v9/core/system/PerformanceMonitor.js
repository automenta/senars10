import { Storage } from '../base/collections.js';
import { Logger } from '../base/utilities.js';

/**
 * Performance monitoring system using Messages.js event system
 */
class PerformanceMonitor {
  constructor(messagesComponent = null) {
    this.messages = messagesComponent;
    this.metrics = new Storage({
      enableEvents: true,
      eventTarget: messagesComponent,
      namespace: 'metrics',
      maxSize: 10000
    });
    this.counters = new Map();
    this.timers = new Map();
    this.histograms = new Map();
    this.enabled = true;
  }

  // Counter operations
  incrementCounter(name, value = 1, tags = {}) {
    if (!this.enabled) return;

    const key = this._makeKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);

    // Store in metrics storage for persistence
    this.metrics.set(`counter:${key}`, {
      name,
      value: current + value,
      tags,
      type: 'counter',
      timestamp: new Date()
    });

    // Emit event for real-time monitoring
    if (this.messages) {
      this.messages.emit('metrics:counter', {
        name,
        value: current + value,
        delta: value,
        tags,
        timestamp: new Date()
      });
    }

    Logger.debug('Counter incremented', { name, value: current + value, tags });
  }

  getCounter(name, tags = {}) {
    const key = this._makeKey(name, tags);
    return this.counters.get(key) || 0;
  }

  // Timer operations
  startTimer(name, tags = {}) {
    if (!this.enabled) return;

    const key = this._makeKey(name, tags);
    this.timers.set(key, {
      name,
      startTime: Date.now(),
      tags
    });

    Logger.debug('Timer started', { name, tags });
  }

  endTimer(name, tags = {}) {
    if (!this.enabled) return;

    const key = this._makeKey(name, tags);
    const timer = this.timers.get(key);

    if (!timer) {
      Logger.warn('Timer not found', { name, tags });
      return null;
    }

    const duration = Date.now() - timer.startTime;
    this.timers.delete(key);

    // Record in histogram
    this._recordHistogram(name, duration, tags);

    // Store in metrics
    this.metrics.set(`timer:${key}:${Date.now()}`, {
      name,
      duration,
      tags,
      type: 'timer',
      timestamp: new Date()
    });

    // Emit event
    if (this.messages) {
      this.messages.emit('metrics:timer', {
        name,
        duration,
        tags,
        timestamp: new Date()
      });
    }

    Logger.debug('Timer ended', { name, duration, tags });
    return duration;
  }

  // Measure execution time of a function
  async measure(name, fn, tags = {}) {
    if (!this.enabled) return await fn();

    this.startTimer(name, tags);
    try {
      const result = await fn();
      this.endTimer(name, tags);
      return result;
    } catch (error) {
      this.endTimer(name, tags);
      throw error;
    }
  }

  // Histogram operations
  _recordHistogram(name, value, tags = {}) {
    const key = this._makeKey(name, tags);

    if (!this.histograms.has(key)) {
      this.histograms.set(key, {
        name,
        values: [],
        tags,
        min: value,
        max: value,
        sum: value,
        count: 1
      });
    } else {
      const histogram = this.histograms.get(key);
      histogram.values.push(value);

      if (value < histogram.min) histogram.min = value;
      if (value > histogram.max) histogram.max = value;

      histogram.sum += value;
      histogram.count++;
    }
  }

  getHistogram(name, tags = {}) {
    const key = this._makeKey(name, tags);
    return this.histograms.get(key) || null;
  }

  // Gauge operations (for values that can go up and down)
  setGauge(name, value, tags = {}) {
    if (!this.enabled) return;

    const key = this._makeKey(name, tags);

    this.metrics.set(`gauge:${key}`, {
      name,
      value,
      tags,
      type: 'gauge',
      timestamp: new Date()
    });

    if (this.messages) {
      this.messages.emit('metrics:gauge', {
        name,
        value,
        tags,
        timestamp: new Date()
      });
    }

    Logger.debug('Gauge set', { name, value, tags });
  }

  // Get all metrics
  getAllMetrics() {
    const all = {};

    // Add counters
    for (const [key, value] of this.counters.entries()) {
      all[`counter.${key}`] = value;
    }

    // Add histograms
    for (const [key, histogram] of this.histograms.entries()) {
      all[`histogram.${key}`] = {
        count: histogram.count,
        min: histogram.min,
        max: histogram.max,
        avg: histogram.sum / histogram.count,
        sum: histogram.sum
      };
    }

    // Add stored metrics
    for (const [key, metric] of this.metrics.entries()) {
      all[`stored.${key}`] = metric;
    }

    return all;
  }

  // Get metrics summary
  getSummary() {
    const counters = this.counters.size;
    const histograms = this.histograms.size;
    const stored = this.metrics.size();

    return {
      counters,
      histograms,
      stored,
      total: counters + histograms + stored,
      enabled: this.enabled,
      timestamp: new Date().toISOString()
    };
  }

  // Reset all metrics
  reset() {
    this.counters.clear();
    this.timers.clear();
    this.histograms.clear();
    this.metrics.clear();

    if (this.messages) {
      this.messages.emit('metrics:reset', {
        timestamp: new Date()
      });
    }

    Logger.debug('Performance metrics reset');
  }

  // Enable/disable monitoring
  setEnabled(enabled) {
    this.enabled = enabled;
    Logger.debug('Performance monitoring', { enabled });
  }

  // Create middleware for automatic performance monitoring
  createMiddleware(options = {}) {
    const {
      autoMeasure = true,
      slowQueryThreshold = 1000,
      includeTags = {}
    } = options;

    return async (context, next) => {
      if (!this.enabled) return next();

      const operationName = `${context.type}:${context.name}`;
      const startTime = Date.now();

      // Add default tags
      const tags = {
        operation: context.type,
        name: context.name,
        ...includeTags
      };

      if (autoMeasure) {
        this.startTimer(operationName, tags);
      }

      try {
        const result = await next();
        const duration = Date.now() - startTime;

        if (autoMeasure) {
          this.endTimer(operationName, tags);
        }

        // Track slow operations
        if (duration > slowQueryThreshold) {
          this.incrementCounter('slow_operations', 1, {
            ...tags,
            duration,
            threshold: slowQueryThreshold
          });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        if (autoMeasure) {
          this.endTimer(operationName, tags);
        }

        // Track errors
        this.incrementCounter('operation_errors', 1, {
          ...tags,
          error: error.message
        });

        throw error;
      }
    };
  }

  // Private helper methods
  _makeKey(name, tags = {}) {
    const tagString = Object.keys(tags)
      .sort()
      .map(key => `${key}:${tags[key]}`)
      .join(',');

    return tagString ? `${name}[${tagString}]` : name;
  }

  // Export metrics for external analysis
  export() {
    return {
      counters: Object.fromEntries(this.counters.entries()),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([key, histogram]) => [
          key,
          {
            count: histogram.count,
            min: histogram.min,
            max: histogram.max,
            avg: histogram.sum / histogram.count,
            sum: histogram.sum
          }
        ])
      ),
      summary: this.getSummary(),
      timestamp: new Date().toISOString()
    };
  }
}

export default PerformanceMonitor;