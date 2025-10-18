import { Component, ComponentHealth, ComponentMetrics } from './Component.js';
import { Logger } from '../base/utilities.js';

/**
 * Unified metrics, resources, and observability service.
 */
export class UnifiedResourceManager extends Component {
  constructor() {
    super();
    this.metrics = new Map(); // metricName -> { value, unit, timestamp }
    this.resources = new Map(); // resourceId -> resource object
    this.counters = new Map(); // counterName -> count
    this.gauges = new Map(); // gaugeName -> value
    this.histograms = new Map(); // histogramName -> { values: [], count: 0, sum: 0, min: Infinity, max: -Infinity }
    this.timers = new Map(); // timerName -> { start: timestamp, elapsed: 0 }
    this.stats = {
      totalMetricsCollected: 0,
      totalResourcesManaged: 0,
      collectionInterval: null
    };
  }

  /**
   * Initializes the resource manager.
   * @param {ComponentConfig} config - The component configuration
   */
  async initialize(config) {
    await super.initialize(config);
    this.metrics = new Map(); // metricName -> { value, unit, timestamp }
    this.resources = new Map(); // resourceId -> resource object
    this.counters = new Map(); // counterName -> count
    this.gauges = new Map(); // gaugeName -> value
    this.histograms = new Map(); // histogramName -> { values: [], count: 0, sum: 0, min: Infinity, max: -Infinity }
    this.timers = new Map(); // timerName -> { start: timestamp, elapsed: 0 }

    // Set up collection interval from config if specified
    const collectionInterval = config.config?.collectionInterval || 30000; // Default: 30 seconds
    this.stats.collectionInterval = collectionInterval;

    // Optionally start automatic metrics collection
    if (config.config?.autoCollect !== false) {
      this._startAutoCollection(collectionInterval);
    }
  }

  /**
   * Records a metric value.
   * @param {string} name - The metric name
   * @param {number} value - The metric value
   * @param {string} [unit] - The metric unit
   */
  recordMetric(name, value, unit = 'count') {
    this.metrics.set(name, {
      value,
      unit,
      timestamp: Date.now()
    });
    this.stats.totalMetricsCollected++;
  }

  /**
   * Increments a counter.
   * @param {string} name - The counter name
   * @param {number} [increment=1] - The increment value
   */
  incrementCounter(name, increment = 1) {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + increment);
    this.recordMetric(name, current + increment);
  }

  /**
   * Sets a gauge value.
   * @param {string} name - The gauge name
   * @param {number} value - The gauge value
   */
  setGauge(name, value) {
    this.gauges.set(name, value);
    this.recordMetric(name, value, 'gauge');
  }

  /**
   * Records a value in a histogram.
   * @param {string} name - The histogram name
   * @param {number} value - The value to record
   */
  recordHistogram(name, value) {
    let histogram = this.histograms.get(name);
    if (!histogram) {
      histogram = {
        values: [],
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity
      };
      this.histograms.set(name, histogram);
    }

    histogram.values.push(value);
    histogram.count++;
    histogram.sum += value;
    histogram.min = Math.min(histogram.min, value);
    histogram.max = Math.max(histogram.max, value);
  }

  /**
   * Starts a timer.
   * @param {string} name - The timer name
   */
  startTimer(name) {
    this.timers.set(name, {
      start: Date.now(),
      elapsed: 0
    });
  }

  /**
   * Ends a timer and records the elapsed time.
   * @param {string} name - The timer name
   * @returns {number} The elapsed time in milliseconds
   */
  endTimer(name) {
    const timer = this.timers.get(name);
    if (!timer) {
      throw new Error(`Timer ${name} not found`);
    }

    const elapsed = Date.now() - timer.start;
    timer.elapsed = elapsed;

    // Record the timing as a metric
    this.recordMetric(`${name}.time`, elapsed, 'milliseconds');
    this.recordHistogram(`${name}.histogram`, elapsed);

    return elapsed;
  }

  /**
   * Manages a resource.
   * @param {string} id - The resource identifier
   * @param {Object} resource - The resource object
   * @param {Function} [cleanupFn] - Optional cleanup function
   */
  manageResource(id, resource, cleanupFn) {
    this.resources.set(id, {
      resource,
      allocatedAt: Date.now(),
      cleanupFn
    });
    this.stats.totalResourcesManaged++;
  }

  /**
   * Releases a managed resource.
   * @param {string} id - The resource identifier
   * @returns {boolean} True if resource was found and released
   */
  releaseResource(id) {
    const entry = this.resources.get(id);
    if (!entry) return false;

    // Call cleanup function if provided
    if (entry.cleanupFn) {
      try {
        entry.cleanupFn(entry.resource);
      } catch (e) {
        Logger.error(`Error during resource cleanup: ${e.message}`);
      }
    }

    this.resources.delete(id);
    return true;
  }

  /**
   * Gets metrics report.
   * @param {string} [type] - Optional metric type filter ('counter', 'gauge', 'histogram', 'timer')
   * @returns {Object} Metrics report
   */
  getMetrics(type = null) {
    const report = {
      timestamp: Date.now(),
      stats: { ...this.stats },
      metrics: {}
    };

    if (!type || type === 'counter') {
      report.metrics.counters = Object.fromEntries(this.counters);
    }
    if (!type || type === 'gauge') {
      report.metrics.gauges = Object.fromEntries(this.gauges);
    }
    if (!type || type === 'histogram') {
      report.metrics.histograms = {};
      for (const [name, data] of this.histograms) {
        report.metrics.histograms[name] = {
          count: data.count,
          sum: data.sum,
          mean: data.count > 0 ? data.sum / data.count : 0,
          min: data.min === Infinity ? 0 : data.min,
          max: data.max === -Infinity ? 0 : data.max
        };
      }
    }
    if (!type || type === 'timer') {
      report.metrics.timers = Object.fromEntries(this.timers);
    }

    return report;
  }

  /**
   * Gets resource utilization report.
   * @returns {Object} Resource utilization report
   */
  getResourceUtilization() {
    return {
      timestamp: Date.now(),
      totalManaged: this.resources.size,
      resources: Array.from(this.resources.entries()).map(([id, entry]) => ({
        id,
        type: typeof entry.resource,
        allocatedAt: entry.allocatedAt
      }))
    };
  }

  /**
   * Starts automatic metrics collection.
   * @private
   */
  _startAutoCollection(interval) {
    // This is a simplified version - in a real implementation, you might want
    // to collect system metrics, memory usage, etc.
    setInterval(() => {
      // Collect some basic system metrics
      this.setGauge('resources.managed.count', this.resources.size);
      this.setGauge('metrics.stored.count', this.metrics.size);
      this.setGauge('counters.count', this.counters.size);
    }, interval);
  }

  /**
   * Gets the current health of the component.
   * @returns {ComponentHealth}
   */
  getHealth() {
    const status = this.resources.size > 0 || this.metrics.size > 0
      ? 'healthy'
      : 'initialized';
    return new ComponentHealth(status);
  }

  /**
   * Gets performance metrics from the component.
   * @returns {ComponentMetrics}
   */
  getMetrics() {
    return new ComponentMetrics({
      managedResources: this.resources.size,
      storedMetrics: this.metrics.size,
      counters: this.counters.size,
      gauges: this.gauges.size,
      histograms: this.histograms.size,
      timers: this.timers.size
    });
  }
}