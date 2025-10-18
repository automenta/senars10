import Component from '../base/Component.js';
import { Logger } from '../base/utilities.js';
import { DEFAULTS } from '../base/constants.js';

class DataIngestor extends Component {
  constructor() {
    super();

    this.bottleneckTimeThreshold = DEFAULTS.DATA_INGESTOR_BOTTLENECK_TIME_THRESHOLD || 100;
    this.bottleneckAvgTimeFactor = DEFAULTS.DATA_INGESTOR_BOTTLENECK_AVG_TIME_FACTOR || 2;

    this.processingStats = {
      totalProcessed: 0,
      totalFailed: 0,
      avgProcessingTime: 0,
      maxProcessingTime: 0,
      processingTimes: []
    };

    this.processingCache = new Map();
    this.parsers = new Map();

    this._registerDefaultParsers();
  }

  getDefaultConfig() {
    return {
      bottleneckTimeThreshold: this.bottleneckTimeThreshold,
      bottleneckAvgTimeFactor: this.bottleneckAvgTimeFactor
    };
  }

  async initialize(config = {}) {
    await super.initialize(config);

    this.bottleneckTimeThreshold = this.config.bottleneckTimeThreshold ?? this.bottleneckTimeThreshold;
    this.bottleneckAvgTimeFactor = this.config.bottleneckAvgTimeFactor ?? this.bottleneckAvgTimeFactor;

    this.processingStats = {
      totalProcessed: 0,
      totalFailed: 0,
      avgProcessingTime: 0,
      maxProcessingTime: 0,
      processingTimes: []
    };

    this.processingCache.clear();
  }

  registerParser(format, parser) {
    if (typeof parser !== 'function') throw new Error('Parser must be a function');
    this.parsers.set(format, parser);
  }

  async ingest(data, options = {}) {
    const startTime = Date.now();
    const format = options.format || this._detectFormat(data);
    const useCache = options.useCache !== false;

    const cacheKey = this._generateCacheKey(data, options);

    if (useCache && this.processingCache.has(cacheKey)) {
      const cached = this.processingCache.get(cacheKey);
      if (Date.now() - cached.timestamp < (options.cacheTTL || 300000)) {
        Logger.debug('Data ingestion cache hit', { cacheKey, format });
        return cached.result;
      }
    }

    try {
      if (!data) throw new Error('Data is required for ingestion');

      const tasks = this.parsers.has(format)
        ? await Promise.resolve(this.parsers.get(format)(data, options))
        : await this._defaultProcess(data, format, options);

      const processingTime = Date.now() - startTime;
      this._updateProcessingStats(processingTime);

      if (this._checkBottleneck(processingTime)) {
        Logger.warn('Bottleneck detected in data ingestion', {
          format,
          processingTime,
          threshold: this.bottleneckTimeThreshold
        });

        if (this.core?.messages) {
          this.core.messages.emit('ingestion.bottleneck', {
            format,
            processingTime,
            threshold: this.bottleneckTimeThreshold,
            timestamp: Date.now()
          });
        }
      }

      if (useCache) {
        this.processingCache.set(cacheKey, {
          result: tasks,
          timestamp: Date.now(),
          format,
          processingTime
        });
      }

      if (this.core?.messages) {
        this.core.messages.emit('ingestion.completed', {
          format,
          taskCount: tasks.length,
          processingTime,
          timestamp: Date.now()
        });
      }

      Logger.debug('Data ingestion completed', { format, taskCount: tasks.length, processingTime });

      return tasks;
    } catch (error) {
      this.processingStats.totalFailed++;

      Logger.error('Data ingestion failed', {
        error: error.message,
        format,
        timestamp: Date.now()
      });

      if (this.core?.messages) {
        this.core.messages.emit('ingestion.failed', {
          format,
          error: error.message,
          timestamp: Date.now()
        });
      }

      throw error;
    }
  }

  _detectFormat(data) {
    if (typeof data === 'string') {
      if (data.startsWith('{') || data.startsWith('[')) return 'json';
      if (data.includes('<') && data.includes('>')) return 'xml';
      if (data.includes(' --> ') || data.includes(' ==> ')) return 'narsese';
      return 'text';
    }

    if (typeof data === 'object') {
      if (Array.isArray(data) || data.constructor === Object) return 'json';
      return 'object';
    }

    return 'unknown';
  }

  async _defaultProcess(data, format, options) {
    const processors = {
      'json': this._processJSON.bind(this),
      'xml': this._processXML.bind(this),
      'narsese': this._processNarsese.bind(this),
      'text': this._processText.bind(this)
    };

    const processor = processors[format] || this._processGeneric.bind(this);
    return await processor(data, options);
  }

  _processJSON(data, options) {
    let parsedData = data;

    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        throw new Error(`Invalid JSON data: ${e.message}`);
      }
    }

    const tasks = [];
    this._extractTasksFromJSON(parsedData, tasks, options);
    return tasks;
  }

  _extractTasksFromJSON(obj, tasks, options, path = '') {
    if (obj === null || obj === undefined) return;

    if (typeof obj === 'object') {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          this._extractTasksFromJSON(item, tasks, options, `${path}[${index}]`);
        });
      } else {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;

          if (this._isCognitiveTask(value)) {
            tasks.push(this._normalizeCognitiveTask(value));
          } else if (typeof value === 'object' && value !== null) {
            this._extractTasksFromJSON(value, tasks, options, currentPath);
          } else {
            tasks.push({
              term: `(${currentPath} --> ${this._sanitizeValue(value)})`,
              punctuation: '.',
              truth: { frequency: 0.9, confidence: 0.8 },
              priority: 0.5,
              timestamp: Date.now(),
              source: 'json',
              path: currentPath
            });
          }
        }
      }
    }
  }

  _processXML(data, options) {
    const tasks = [];
    if (typeof data === 'string') {
      const jsonLike = this._simpleXMLToJSON(data);
      this._extractTasksFromJSON(jsonLike, tasks, options);
    }
    return tasks;
  }

  _simpleXMLToJSON(xmlString) {
    const result = {};
    const tagRegex = /<(\w+)>(.*?)<\/\1>/g;
    let match;

    while ((match = tagRegex.exec(xmlString)) !== null) {
      const [, tagName, tagValue] = match;
      result[tagName] = tagValue;
    }

    return result;
  }

  _processNarsese(data, options) {
    const tasks = [];
    if (typeof data === 'string') {
      const statements = data.split(/[.!?]\s+/).filter(s => s.trim());

      for (const statement of statements) {
        const trimmed = statement.trim();
        if (trimmed) {
          let punctuation = '.';
          let term = trimmed;

          if (data.includes('?')) {
            punctuation = '?';
            term = trimmed.replace(/\?/g, '').trim();
          } else if (data.includes('!')) {
            punctuation = '!';
            term = trimmed.replace(/!/g, '').trim();
          }

          tasks.push({
            term: term || trimmed,
            punctuation,
            truth: { frequency: 0.9, confidence: 0.8 },
            priority: 0.5,
            timestamp: Date.now(),
            source: 'narsese'
          });
        }
      }
    }
    return tasks;
  }

  _processText(data, options) {
    const tasks = [];
    if (typeof data === 'string') {
      const sentences = data.split(/[.!?]+/).filter(s => s.trim());

      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (trimmed) {
          tasks.push({
            term: `("${trimmed}")`,
            punctuation: '.',
            truth: { frequency: 0.8, confidence: 0.7 },
            priority: 0.4,
            timestamp: Date.now(),
            source: 'text'
          });
        }
      }
    }
    return tasks;
  }

  _processGeneric(data, options) {
    return [{
      term: `("${String(data)}")`,
      punctuation: '.',
      truth: { frequency: 0.7, confidence: 0.6 },
      priority: 0.3,
      timestamp: Date.now(),
      source: 'generic'
    }];
  }

  _isCognitiveTask(obj) {
    return obj && typeof obj === 'object' && obj.term && ['.', '?', '!'].includes(obj.punctuation);
  }

  _normalizeCognitiveTask(task) {
    return {
      term: task.term,
      punctuation: task.punctuation,
      truth: task.truth || { frequency: 0.9, confidence: 0.8 },
      priority: task.priority || 0.5,
      timestamp: task.timestamp || Date.now(),
      source: task.source || 'ingestion',
      ...task
    };
  }

  _sanitizeValue(value) {
    const strVal = typeof value === 'string' ? value : String(value);
    return strVal.replace(/[\(\)\[\]{}<>"']/g, '').substring(0, 100);
  }

  _checkBottleneck(processingTime) {
    return processingTime > this.bottleneckTimeThreshold ||
           (this.processingStats.avgProcessingTime > 0 &&
            processingTime > this.processingStats.avgProcessingTime * this.bottleneckAvgTimeFactor);
  }

  _updateProcessingStats(processingTime) {
    this.processingStats.totalProcessed++;
    this.processingStats.processingTimes.push(processingTime);

    if (this.processingStats.processingTimes.length > 1000) {
      this.processingStats.processingTimes = this.processingStats.processingTimes.slice(-1000);
    }

    if (processingTime > this.processingStats.maxProcessingTime) {
      this.processingStats.maxProcessingTime = processingTime;
    }

    const total = this.processingStats.processingTimes.reduce((sum, time) => sum + time, 0);
    this.processingStats.avgProcessingTime = total / this.processingStats.processingTimes.length;
  }

  _generateCacheKey(data, options) {
    const dataStr = JSON.stringify(data, Object.keys(data).sort());
    const optionsStr = JSON.stringify(options);
    return `${dataStr}:${optionsStr}:${Date.now()}`;
  }

  _registerDefaultParsers() {
    this.registerParser('json', this._processJSON.bind(this));
    this.registerParser('text', this._processText.bind(this));
    this.registerParser('narsese', this._processNarsese.bind(this));
  }

  getStats() {
    return {
      ...this.processingStats,
      cacheSize: this.processingCache.size,
      registeredParsers: this.parsers.size,
      successRate: this.processingStats.totalProcessed > 0 ?
        (this.processingStats.totalProcessed / (this.processingStats.totalProcessed + this.processingStats.totalFailed)) : 0
    };
  }

  getConfig() {
    return {
      bottleneckTimeThreshold: this.bottleneckTimeThreshold,
      bottleneckAvgTimeFactor: this.bottleneckAvgTimeFactor
    };
  }

  updateConfig(config) {
    if (config.bottleneckTimeThreshold !== undefined) this.bottleneckTimeThreshold = config.bottleneckTimeThreshold;
    if (config.bottleneckAvgTimeFactor !== undefined) this.bottleneckAvgTimeFactor = config.bottleneckAvgTimeFactor;
  }

  clearCache() {
    this.processingCache.clear();
  }

  getPerformanceMetrics() {
    if (this.processingStats.processingTimes.length === 0) {
      return { avgTime: 0, minTime: 0, maxTime: 0, count: 0 };
    }

    const sorted = [...this.processingStats.processingTimes].sort((a, b) => a - b);
    const avgTime = this.processingStats.avgProcessingTime;
    const minTime = sorted[0];
    const maxTime = sorted[sorted.length - 1];
    const count = sorted.length;

    return {
      avgTime,
      minTime,
      maxTime,
      count,
      p95Time: sorted[Math.floor(sorted.length * 0.95)],
      p99Time: sorted[Math.floor(sorted.length * 0.99)]
    };
  }
}

export default DataIngestor;