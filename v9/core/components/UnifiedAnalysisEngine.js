import { Component, ComponentHealth, ComponentMetrics } from './Component.js';
import { Logger } from '../base/utilities.js';

/**
 * Unified analysis engine for all analysis types.
 */
export class UnifiedAnalysisEngine extends Component {
  constructor() {
    super();
    this.analyses = new Map(); // analysisId -> analysis result
    this.analysisTypes = new Map(); // type -> analysis function
    this.metrics = new Map(); // metricName -> value
    this.analyzers = new Map(); // analyzerId -> analyzer object
    this.analysisQueue = []; // pending analyses
    this.runningAnalyses = new Set(); // currently running analysis IDs

    // Default configuration
    this.config = {
      maxConcurrentAnalyses: 3,
      analysisTimeout: 30000, // 30 seconds
      cacheResults: true,
      cacheTTL: 300000 // 5 minutes
    };
  }

  /**
   * Initializes the analysis engine.
   * @param {ComponentConfig} config - The component configuration
   */
  async initialize(config) {
    await super.initialize(config);
    this.analyses.clear();
    this.analysisTypes.clear();
    this.metrics.clear();
    this.analyzers.clear();
    this.analysisQueue = [];
    this.runningAnalyses.clear();

    // Update configuration from provided config
    if (config.config && typeof config.config === 'object') {
      this.config = { ...this.config, ...config.config };
    }

    // Register default analysis types
    this._registerDefaultAnalyses();
  }

  /**
   * Registers a new analysis type.
   * @param {string} type - The analysis type identifier
   * @param {Function} analysisFn - The analysis function
   * @param {Object} metadata - Optional metadata about the analysis
   */
  registerAnalysisType(type, analysisFn, metadata = {}) {
    if (typeof analysisFn !== 'function') {
      throw new Error(`Analysis function for type ${type} must be a function`);
    }

    this.analysisTypes.set(type, {
      function: analysisFn,
      metadata: { ...metadata, registeredAt: Date.now() }
    });
  }

  /**
   * Registers an analyzer component.
   * @param {string} id - The analyzer ID
   * @param {Object} analyzer - The analyzer object with analyze() method
   */
  registerAnalyzer(id, analyzer) {
    if (typeof analyzer.analyze !== 'function') {
      throw new Error(`Analyzer ${id} must have an analyze() method`);
    }

    this.analyzers.set(id, analyzer);
  }

  /**
   * Performs an analysis.
   * @param {string} type - The analysis type
   * @param {any} data - The data to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<any>} The analysis result
   */
  async performAnalysis(type, data, options = {}) {
    const analysisId = this._generateAnalysisId(type, data, options);

    // Check cache if enabled
    if (this.config.cacheResults) {
      const cached = this._getCachedResult(analysisId);
      if (cached) {
        return cached;
      }
    }

    // Check if analysis type exists
    if (!this.analysisTypes.has(type)) {
      throw new Error(`Unknown analysis type: ${type}`);
    }

    const analysisFn = this.analysisTypes.get(type).function;

    // Add to queue if too many concurrent analyses
    if (this.runningAnalyses.size >= this.config.maxConcurrentAnalyses) {
      return new Promise((resolve, reject) => {
        this.analysisQueue.push({
          analysisId,
          type,
          data,
          options,
          resolve,
          reject
        });
        this._processQueue();
      });
    }

    return this._executeAnalysis(analysisId, type, analysisFn, data, options);
  }

  /**
   * Performs an analysis using a registered analyzer.
   * @param {string} analyzerId - The analyzer ID
   * @param {any} data - The data to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<any>} The analysis result
   */
  async performAnalysisWithAnalyzer(analyzerId, data, options = {}) {
    const analyzer = this.analyzers.get(analyzerId);
    if (!analyzer) {
      throw new Error(`Unknown analyzer: ${analyzerId}`);
    }

    const analysisId = this._generateAnalysisId(`analyzer_${analyzerId}`, data, options);

    // Check cache if enabled
    if (this.config.cacheResults) {
      const cached = this._getCachedResult(analysisId);
      if (cached) {
        return cached;
      }
    }

    try {
      this.runningAnalyses.add(analysisId);

      const startTime = Date.now();
      const result = await Promise.race([
        analyzer.analyze(data, options),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Analysis timeout')), this.config.analysisTimeout)
        )
      ]);

      const analysisTime = Date.now() - startTime;

      // Store result
      this.analyses.set(analysisId, {
        result,
        timestamp: Date.now(),
        analysisTime,
        analyzer: analyzerId
      });

      // Update metrics
      this._updateMetric('analyses.performed', 1);
      this._updateMetric('analysis.time.total', analysisTime);
      this._updateMetric('analysis.time.average', analysisTime);

      return result;
    } finally {
      this.runningAnalyses.delete(analysisId);
      this._processQueue();
    }
  }

  /**
   * Executes an analysis with timeout and error handling.
   * @private
   */
  async _executeAnalysis(analysisId, type, analysisFn, data, options) {
    try {
      this.runningAnalyses.add(analysisId);

      const startTime = Date.now();
      const result = await Promise.race([
        analysisFn(data, options),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Analysis timeout')), this.config.analysisTimeout)
        )
      ]);

      const analysisTime = Date.now() - startTime;

      // Store result
      this.analyses.set(analysisId, {
        result,
        timestamp: Date.now(),
        analysisTime,
        type,
        options
      });

      // Update metrics
      this._updateMetric('analyses.performed', 1);
      this._updateMetric('analysis.time.total', analysisTime);
      this._updateMetric('analysis.time.average', analysisTime);

      // Cache result if caching is enabled
      if (this.config.cacheResults) {
        this._cacheResult(analysisId, result);
      }

      return result;
    } catch (error) {
      Logger.error(`Analysis ${type} failed: ${error.message}`);
      this._updateMetric('analyses.failed', 1);
      throw error;
    } finally {
      this.runningAnalyses.delete(analysisId);
      this._processQueue();
    }
  }

  /**
   * Processes the analysis queue.
   * @private
   */
  _processQueue() {
    if (this.runningAnalyses.size >= this.config.maxConcurrentAnalyses ||
        this.analysisQueue.length === 0) {
      return;
    }

    const next = this.analysisQueue.shift();
    if (next) {
      const analysisFn = this.analysisTypes.get(next.type).function;
      this._executeAnalysis(
        next.analysisId,
        next.type,
        analysisFn,
        next.data,
        next.options
      ).then(next.resolve).catch(next.reject);
    }
  }

  /**
   * Registers default analysis types.
   * @private
   */
  _registerDefaultAnalyses() {
    // Pattern analysis - finds patterns in data
    this.registerAnalysisType('pattern', async (data) => {
      // Simple pattern detection algorithm
      if (Array.isArray(data) && data.length > 1) {
        const differences = [];
        for (let i = 1; i < data.length; i++) {
          differences.push(data[i] - data[i-1]);
        }

        // Check if differences are consistent (arithmetic sequence)
        const uniqueDiffs = [...new Set(differences)];
        if (uniqueDiffs.length === 1) {
          return {
            type: 'arithmetic_sequence',
            commonDifference: uniqueDiffs[0],
            nextValue: data[data.length - 1] + uniqueDiffs[0]
          };
        }

        // Check if ratio is consistent (geometric sequence)
        const ratios = data.slice(1).map((val, i) => val / data[i]);
        const uniqueRatios = [...new Set(ratios.map(r => Math.round(r * 100) / 100))];
        if (uniqueRatios.length === 1) {
          return {
            type: 'geometric_sequence',
            commonRatio: uniqueRatios[0],
            nextValue: data[data.length - 1] * uniqueRatios[0]
          };
        }
      }

      return { type: 'no_pattern_detected', data };
    });

    // Statistical analysis - basic statistical properties
    this.registerAnalysisType('statistical', async (data) => {
      if (!Array.isArray(data) || data.length === 0) {
        return { error: 'Data must be a non-empty array' };
      }

      const sum = data.reduce((a, b) => a + b, 0);
      const mean = sum / data.length;
      const min = Math.min(...data);
      const max = Math.max(...data);

      const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
      const stdDev = Math.sqrt(variance);

      return {
        count: data.length,
        sum,
        mean,
        min,
        max,
        range: max - min,
        variance,
        stdDev
      };
    });

    // Similarity analysis - finds similarities between data
    this.registerAnalysisType('similarity', async (data) => {
      if (!Array.isArray(data) || data.length < 2) {
        return { error: 'Data must be an array with at least 2 elements' };
      }

      // Calculate similarity between first element and others using simple overlap
      const first = Array.isArray(data[0]) ? data[0] : String(data[0]).split('');
      const similarities = [];

      for (let i = 1; i < data.length; i++) {
        const current = Array.isArray(data[i]) ? data[i] : String(data[i]).split('');
        const intersection = first.filter(x => current.includes(x));
        const similarity = intersection.length / Math.max(first.length, current.length);

        similarities.push({
          index: i,
          value: data[i],
          similarity: similarity
        });
      }

      return {
        first: data[0],
        similarities: similarities.sort((a, b) => b.similarity - a.similarity)
      };
    });
  }

  /**
   * Generates a unique analysis ID.
   * @private
   */
  _generateAnalysisId(type, data, options) {
    const dataString = JSON.stringify(data);
    const optionsString = JSON.stringify(options);
    return `${type}_${this._simpleHash(dataString + optionsString)}`;
  }

  /**
   * Simple hash function for generating IDs.
   * @private
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Updates a metric value.
   * @private
   */
  _updateMetric(name, value) {
    const current = this.metrics.get(name) || 0;
    this.metrics.set(name, current + value);
  }

  /**
   * Caches a result.
   * @private
   */
  _cacheResult(id, result) {
    // In a real implementation, we would use a proper cache with TTL
    // For now, just store with an expiration time
    this.analyses.set(id, {
      result,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.config.cacheTTL
    });
  }

  /**
   * Gets a cached result.
   * @private
   */
  _getCachedResult(id) {
    const cached = this.analyses.get(id);
    if (cached && cached.expiresAt && cached.expiresAt > Date.now()) {
      return cached.result;
    } else if (cached && cached.expiresAt && cached.expiresAt <= Date.now()) {
      // Remove expired entry
      this.analyses.delete(id);
    }
    return null;
  }

  /**
   * Gets the current health of the component.
   * @returns {ComponentHealth}
   */
  getHealth() {
    const analysisCount = this.analyses.size;
    const status = analysisCount > 0 || this.analyzers.size > 0 ? 'healthy' : 'initialized';
    return new ComponentHealth(status);
  }

  /**
   * Gets performance metrics from the component.
   * @returns {ComponentMetrics}
   */
  getMetrics() {
    return new ComponentMetrics({
      registeredAnalysisTypes: this.analysisTypes.size,
      registeredAnalyzers: this.analyzers.size,
      cachedAnalyses: this.analyses.size,
      queueLength: this.analysisQueue.length,
      runningAnalyses: this.runningAnalyses.size
    });
  }
}