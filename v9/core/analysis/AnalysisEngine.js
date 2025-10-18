import Component from '../base/Component.js';
import { Logger } from '../base/utilities.js';
import { DEFAULTS } from '../base/constants.js';

class AnalysisEngine extends Component {
  constructor() {
    super();

    this.minConfidence = DEFAULTS.ANALYSIS_MIN_CONFIDENCE || 0.5;
    this.similarityThreshold = DEFAULTS.ANALYSIS_SIMILARITY_THRESHOLD || 0.7;
    this.bottleneckThreshold = DEFAULTS.ANALYSIS_BOTTLENECK_THRESHOLD || 100;

    this.metrics = new Map();
    this.performanceHistory = [];
    this.bottlenecks = new Map();
    this.analysisCache = new Map();

    this.stats = {
      analysesPerformed: 0,
      bottlenecksDetected: 0,
      performanceIssues: 0,
      analysisTime: 0
    };
  }

  getDefaultConfig() {
    return {
      minConfidence: this.minConfidence,
      similarityThreshold: this.similarityThreshold,
      bottleneckThreshold: this.bottleneckThreshold
    };
  }

  async initialize(config = {}) {
    await super.initialize(config);

    this.minConfidence = this.config.minConfidence ?? this.minConfidence;
    this.similarityThreshold = this.config.similarityThreshold ?? this.similarityThreshold;
    this.bottleneckThreshold = this.config.bottleneckThreshold ?? this.bottleneckThreshold;

    this.metrics.clear();
    this.performanceHistory = [];
    this.bottlenecks.clear();
    this.analysisCache.clear();

    this.stats = {
      analysesPerformed: 0,
      bottlenecksDetected: 0,
      performanceIssues: 0,
      analysisTime: 0
    };
  }

  async analyze(context = {}) {
    const startTime = Date.now();

    try {
      const metrics = context.metrics || await this._collectSystemMetrics();

      const results = {
        timestamp: Date.now(),
        performance: await this._analyzePerformance(metrics),
        bottlenecks: await this._analyzeBottlenecks(metrics),
        similarities: await this._analyzeSimilarity(metrics),
        confidence: this._calculateConfidence(metrics),
        recommendations: this._generateRecommendations({
          performance: await this._analyzePerformance(metrics),
          bottlenecks: await this._analyzeBottlenecks(metrics),
          similarities: await this._analyzeSimilarity(metrics)
        })
      };

      this.stats.analysesPerformed++;
      this.stats.bottlenecksDetected += results.bottlenecks.length;
      this.stats.analysisTime += (Date.now() - startTime);

      const cacheKey = this._generateCacheKey(context);
      this.analysisCache.set(cacheKey, {
        results,
        timestamp: Date.now()
      });

      Logger.debug('Analysis completed', {
        analysisId: results.timestamp,
        bottleneckCount: results.bottlenecks.length,
        totalIssues: results.recommendations.length
      });

      return results;
    } catch (error) {
      Logger.error('Analysis failed', error);
      throw error;
    }
  }

  async _analyzePerformance(metrics) {
    const issues = [];

    if (metrics.responseTimes?.length) {
      const avg = metrics.responseTimes.reduce((sum, time) => sum + time, 0) / metrics.responseTimes.length;
      if (avg > this.bottleneckThreshold) {
        issues.push(this._createIssue('response_time', 'high', 'average_response_time', avg,
          this.bottleneckThreshold, `Avg response time (${avg}ms) exceeds threshold (${this.bottleneckThreshold}ms)`));
      }
    }

    if (metrics.memory?.heapUsed) {
      const util = metrics.memory.heapUsed / (metrics.memory.heapTotal || 1);
      if (util > 0.8) {
        issues.push(this._createIssue('memory_usage', 'medium', 'memory_utilization', util, 0.8,
          `Memory utilization (${(util * 100).toFixed(2)}%) is high`));
      }
    }

    if (metrics.cpu?.usage > 0.85) {
      issues.push(this._createIssue('cpu_usage', 'medium', 'cpu_utilization', metrics.cpu.usage, 0.85,
        `CPU utilization (${(metrics.cpu.usage * 100).toFixed(2)}%) is high`));
    }

    return issues;
  }

  async _analyzeBottlenecks(metrics) {
    const bottlenecks = [];

    if (metrics.operationTimes) {
      for (const [opName, opTime] of Object.entries(metrics.operationTimes)) {
        if (opTime > this.bottleneckThreshold) {
          bottlenecks.push({
            id: `bottleneck_${opName}_${Date.now()}`,
            operation: opName,
            time: opTime,
            threshold: this.bottleneckThreshold,
            severity: opTime > this.bottleneckThreshold * 2 ? 'high' : 'medium',
            message: `Operation "${opName}" took ${opTime}ms, exceeding threshold (${this.bottleneckThreshold}ms)`
          });
        }
      }
    }

    if (metrics.queueSizes) {
      for (const [queueName, queueSize] of Object.entries(metrics.queueSizes)) {
        if (queueSize > 100) {
          bottlenecks.push({
            id: `queue_bottleneck_${queueName}_${Date.now()}`,
            type: 'queue',
            queue: queueName,
            size: queueSize,
            severity: 'medium',
            message: `Queue "${queueName}" has high size (${queueSize})`
          });
        }
      }
    }

    return bottlenecks;
  }

  async _analyzeSimilarity(metrics) {
    const issues = [];

    if (metrics.operationCounts) {
      const frequent = Object.entries(metrics.operationCounts)
        .filter(([, count]) => count > 10)
        .sort((a, b) => b[1] - a[1]);

      for (const [opName, count] of frequent) {
        issues.push({
          type: 'frequent_operation',
          operation: opName,
          count,
          severity: count > 50 ? 'high' : 'medium',
          message: `Operation "${opName}" performed ${count} times - consider optimization`
        });
      }
    }

    return issues;
  }

  _calculateConfidence(metrics) {
    const required = ['responseTimes', 'memory', 'operationTimes'];
    const available = required.filter(field => metrics[field] !== undefined);
    return Math.min(1.0, available.length / required.length);
  }

  _generateRecommendations(analysisResults) {
    const recs = [];

    for (const perf of analysisResults.performance) {
      const actions = this._getActionsByType(perf.type);
      recs.push({
        id: `perf_rec_${Date.now()}_${perf.type}`,
        type: this._getRecTypeByPerfType(perf.type),
        severity: perf.severity,
        title: this._getRecTitleByPerfType(perf.type),
        description: perf.message,
        actions
      });
    }

    for (const bottleneck of analysisResults.bottlenecks) {
      recs.push({
        id: `bottleneck_rec_${Date.now()}_${bottleneck.operation || bottleneck.queue}`,
        type: 'bottleneck_resolution',
        severity: bottleneck.severity,
        title: `Resolve ${bottleneck.operation ? 'Operation' : 'Queue'} Bottleneck`,
        description: bottleneck.message,
        actions: [
          'Profile the specific operation',
          'Optimize algorithm or implementation',
          'Consider scaling options'
        ]
      });
    }

    return recs;
  }

  _getActionsByType(type) {
    const actionsMap = {
      'response_time': [
        'Profile and optimize slow operations',
        'Check database queries',
        'Consider caching strategies'
      ],
      'memory_usage': [
        'Check for memory leaks',
        'Optimize object allocation',
        'Implement proper cleanup routines'
      ],
      'cpu_usage': [
        'Profile high CPU operations',
        'Optimize algorithms',
        'Consider parallelization'
      ]
    };
    return actionsMap[type] || [];
  }

  _getRecTypeByPerfType(type) {
    const typeMap = {
      'response_time': 'optimization',
      'memory_usage': 'resource_management',
      'cpu_usage': 'optimization'
    };
    return typeMap[type] || 'optimization';
  }

  _getRecTitleByPerfType(type) {
    const titleMap = {
      'response_time': 'Optimize Response Time',
      'memory_usage': 'Reduce Memory Usage',
      'cpu_usage': 'Reduce CPU Usage'
    };
    return titleMap[type] || 'Optimize Performance';
  }

  _createIssue(type, severity, metric, value, threshold, message) {
    return { type, severity, metric, value, threshold, message };
  }

  async _collectSystemMetrics() {
    const metrics = {
      timestamp: Date.now(),
      responseTimes: [],
      memory: null,
      cpu: null,
      operationTimes: {},
      operationCounts: {},
      queueSizes: {}
    };

    if (this.core) {
      try {
        const systemMetrics = this.core.getMetrics?.();
        if (systemMetrics) Object.assign(metrics, systemMetrics);
      } catch (error) {
        Logger.warn('Failed to collect system metrics', error);
      }
    }

    return metrics;
  }

  getStats() {
    return {
      ...this.stats,
      cachedAnalyses: this.analysisCache.size,
      trackedBottlenecks: this.bottlenecks.size,
      averageAnalysisTime: this.stats.analysesPerformed > 0 ?
        this.stats.analysisTime / this.stats.analysesPerformed : 0
    };
  }

  getBottlenecks(limit = 20) {
    return Array.from(this.bottlenecks.values()).slice(-limit);
  }

  getConfig() {
    return {
      minConfidence: this.minConfidence,
      similarityThreshold: this.similarityThreshold,
      bottleneckThreshold: this.bottleneckThreshold
    };
  }

  updateConfig(config) {
    if (config.minConfidence !== undefined) this.minConfidence = config.minConfidence;
    if (config.similarityThreshold !== undefined) this.similarityThreshold = config.similarityThreshold;
    if (config.bottleneckThreshold !== undefined) this.bottleneckThreshold = config.bottleneckThreshold;
  }

  _generateCacheKey(context) {
    return JSON.stringify({
      timestamp: context.timestamp || Date.now(),
      source: context.source || 'system',
      type: context.type || 'full'
    });
  }

  async reportBottlenecks(bottleneckData) {
    if (this.core?.messages) {
      try {
        this.core.messages.emit('analysis.bottleneck', bottleneckData);
      } catch (error) {
        Logger.error('Failed to report bottleneck via messages', error);
      }
    }
  }
}

export default AnalysisEngine;