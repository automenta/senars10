import Component from '../base/Component.js';
import { Logger } from '../base/utilities.js';
import { DEFAULTS } from '../base/constants.js';

class ReportGenerator extends Component {
  constructor() {
    super();

    this.includeCharts = DEFAULTS.REPORT_INCLUDE_CHARTS ?? true;
    this.maxRecommendations = DEFAULTS.REPORT_MAX_RECOMMENDATIONS ?? 10;

    this.templates = new Map();
    this.reportHistory = [];

    this.stats = {
      reportsGenerated: 0,
      totalRecipients: 0,
      avgReportSize: 0,
      lastReportTimestamp: null
    };

    this._registerDefaultTemplates();
  }

  getDefaultConfig() {
    return {
      includeCharts: this.includeCharts,
      maxRecommendations: this.maxRecommendations
    };
  }

  async initialize(config = {}) {
    await super.initialize(config);

    this.includeCharts = this.config.includeCharts ?? this.includeCharts;
    this.maxRecommendations = this.config.maxRecommendations ?? this.maxRecommendations;

    this.reportHistory = [];
    this.stats = {
      reportsGenerated: 0,
      totalRecipients: 0,
      avgReportSize: 0,
      lastReportTimestamp: null
    };
  }

  async generate(type, context = {}) {
    const startTime = Date.now();

    try {
      const template = this.templates.get(type) || this.templates.get('default');
      if (!template) throw new Error(`No template found for report type: ${type}`);

      const report = await template.generator(context, this);

      report.metadata = {
        type,
        generatedAt: Date.now(),
        generator: 'ReportGenerator',
        template: type,
        generationTime: Date.now() - startTime
      };

      if (context.includeRecommendations !== false) {
        const recommendations = await this._generateRecommendations(context);
        report.recommendations = recommendations.slice(0, this.maxRecommendations);
      }

      this.stats.reportsGenerated++;
      this.stats.lastReportTimestamp = Date.now();

      const reportSize = JSON.stringify(report).length;
      this.stats.avgReportSize = (
        (this.stats.avgReportSize * (this.stats.reportsGenerated - 1)) + reportSize
      ) / this.stats.reportsGenerated;

      this.reportHistory.push({
        ...report.metadata,
        size: reportSize,
        recipient: context.recipient || 'system'
      });

      if (this.reportHistory.length > 100) this.reportHistory = this.reportHistory.slice(-100);

      Logger.debug('Report generated', { type, size: reportSize, generationTime: Date.now() - startTime });

      if (this.core?.messages) {
        this.core.messages.emit('report.generated', {
          type,
          size: reportSize,
          generationTime: Date.now() - startTime,
          timestamp: Date.now()
        });
      }

      return report;
    } catch (error) {
      Logger.error('Report generation failed', { type, error: error.message, timestamp: Date.now() });
      throw error;
    }
  }

  registerTemplate(type, config) {
    if (typeof config.generator !== 'function') throw new Error('Template generator must be a function');
    this.templates.set(type, { ...config, registeredAt: Date.now() });
  }

  async _generateSystemHealthReport(context) {
    const report = {
      title: 'System Health Report',
      summary: 'Comprehensive overview of system health and performance',
      timestamp: Date.now(),
      data: {}
    };

    if (this.core) {
      report.data.systemHealth = this.core.getHealth?.() || {};

      report.data.components = {};
      for (const [name, component] of this.core.componentMap.entries()) {
        try {
          if (typeof component.getStats === 'function') {
            report.data.components[name] = component.getStats();
          } else if (typeof component.getHealth === 'function') {
            report.data.components[name] = component.getHealth();
          }
        } catch (error) {
          report.data.components[name] = { error: error.message };
        }
      }
    }

    return report;
  }

  async _generatePerformanceReport(context) {
    const report = {
      title: 'Performance Report',
      summary: 'System performance metrics and analysis',
      timestamp: Date.now(),
      data: {}
    };

    if (this.core) {
      report.data.performanceMetrics = this.core.getMetrics?.() || {};

      report.data.componentPerformance = {};
      for (const [name, component] of this.core.componentMap.entries()) {
        try {
          const stats = component.getStats();
          if (stats.analysisTime || stats.processingTime || stats.averageTime) {
            report.data.componentPerformance[name] = stats;
          }
        } catch (error) {}
      }
    }

    report.data.performanceTrends = {
      analysis: this.core?.analysis?.getPerformanceMetrics?.() || {},
      ingestion: this.core?.ingestor?.getPerformanceMetrics?.() || {}
    };

    return report;
  }

  async _generateAnalysisReport(context) {
    const report = {
      title: 'Analysis Summary Report',
      summary: 'Summary of system analysis and detected issues',
      timestamp: Date.now(),
      data: {}
    };

    if (this.core?.analysis) {
      report.data.analysisStats = this.core.analysis.getStats();
      report.data.bottlenecks = this.core.analysis.getBottlenecks(20);
      report.data.config = this.core.analysis.getConfig();
    }

    if (this.core?.ingestor) {
      report.data.ingestionStats = this.core.ingestor.getStats();
      report.data.ingestionPerformance = this.core.ingestor.getPerformanceMetrics();
      report.data.ingestionConfig = this.core.ingestor.getConfig();
    }

    return report;
  }

  async _generateDefaultReport(context) {
    return {
      title: 'System Report',
      summary: 'General system status report',
      timestamp: Date.now(),
      data: {
        context,
        system: this.core ? 'Available' : 'Not available',
        components: this.core ? Array.from(this.core.componentMap.keys()) : []
      }
    };
  }

  async _generateRecommendations(context) {
    const recs = [];

    if (this.core?.analysis) {
      const stats = this.core.analysis.getStats();
      if (stats.bottlenecksDetected > 0) {
        recs.push({
          id: `perf_rec_${Date.now()}_bottlenecks`,
          category: 'performance',
          priority: 'high',
          title: 'Address Performance Bottlenecks',
          description: `Analysis detected ${stats.bottlenecksDetected} bottlenecks`,
          suggestedActions: [
            'Review bottleneck details in analysis component',
            'Optimize slow operations',
            'Consider resource scaling'
          ]
        });
      }
    }

    if (this.core) {
      const memoryUsage = process.memoryUsage ? process.memoryUsage() : null;
      if (memoryUsage && memoryUsage.heapUsed > memoryUsage.heapTotal * 0.8) {
        recs.push({
          id: `resource_rec_${Date.now()}_memory`,
          category: 'resources',
          priority: 'medium',
          title: 'High Memory Usage',
          description: `Memory usage is ${(memoryUsage.heapUsed / memoryUsage.heapTotal * 100).toFixed(1)}%`,
          suggestedActions: [
            'Monitor memory usage patterns',
            'Check for memory leaks',
            'Consider memory optimization'
          ]
        });
      }
    }

    if (this.core) {
      const health = this.core.getHealth?.() || {};
      if (health.isHealthy === false) {
        recs.push({
          id: `health_rec_${Date.now()}_system`,
          category: 'health',
          priority: 'high',
          title: 'System Health Issues',
          description: 'Some components are reporting health issues',
          suggestedActions: [
            'Check component health status',
            'Review logs for errors',
            'Restart unhealthy components'
          ]
        });
      }
    }

    return recs;
  }

  _registerDefaultTemplates() {
    this.registerTemplate('system', {
      name: 'System Health Report',
      description: 'Comprehensive system health overview',
      generator: this._generateSystemHealthReport.bind(this)
    });

    this.registerTemplate('performance', {
      name: 'Performance Report',
      description: 'System performance metrics and analysis',
      generator: this._generatePerformanceReport.bind(this)
    });

    this.registerTemplate('analysis', {
      name: 'Analysis Report',
      description: 'System analysis and bottleneck summary',
      generator: this._generateAnalysisReport.bind(this)
    });

    this.registerTemplate('default', {
      name: 'Default Report',
      description: 'General system status report',
      generator: this._generateDefaultReport.bind(this)
    });
  }

  async export(report, format = 'json', options = {}) {
    const exporters = {
      'json': () => JSON.stringify(report, null, 2),
      'text': () => this._formatAsText(report),
      'html': () => this._formatAsHTML(report)
    };

    const exporter = exporters[format.toLowerCase()];
    if (!exporter) throw new Error(`Unsupported export format: ${format}`);

    return exporter();
  }

  _formatAsText(report) {
    let text = `${report.title}\n${'='.repeat(report.title.length)}\n\n`;
    text += `Summary: ${report.summary}\nGenerated: ${new Date(report.timestamp).toISOString()}\n\n`;

    if (report.data) text += this._formatObjectAsText(report.data, 0);

    if (report.recommendations?.length) {
      text += '\nRecommendations:\n' + '-'.repeat(15) + '\n';
      for (const rec of report.recommendations) {
        text += `\n• ${rec.title}\n  ${rec.description}\n`;
      }
    }

    return text;
  }

  _formatObjectAsText(obj, depth = 0) {
    let text = '';
    const indent = '  '.repeat(depth);

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        text += `${indent}${key}:\n`;
        text += this._formatObjectAsText(value, depth + 1);
      } else if (Array.isArray(value)) {
        text += `${indent}${key}: [${value.length} items]\n`;
        for (const item of value.slice(0, 5)) {
          text += typeof item === 'object'
            ? this._formatObjectAsText(item, depth + 1)
            : `${indent}  - ${item}\n`;
        }
        if (value.length > 5) text += `${indent}  ... and ${value.length - 5} more\n`;
      } else {
        text += `${indent}${key}: ${value}\n`;
      }
    }

    return text;
  }

  _formatAsHTML(report) {
    let html = '<!DOCTYPE html>\n<html>\n<head>\n';
    html += `<title>${report.title}</title>\n<style>\n`;
    html += 'body{font-family:Arial,sans-serif;margin:20px}h1{color:#333;border-bottom:2px solid #ccc}';
    html += '.metadata{color:#666;font-size:.9em}.section{margin:20px 0}';
    html += '.recommendations{background-color:#f9f9f9;padding:15px;border-left:4px solid #007acc}';
    html += 'table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}';
    html += 'th{background-color:#f2f2f2}</style>\n</head>\n<body>\n';

    html += `<h1>${report.title}</h1>\n`;
    html += `<div class="metadata">Generated: ${new Date(report.timestamp).toLocaleString()}</div>\n`;
    html += `<p>${report.summary}</p>\n`;

    if (report.data) {
      html += '<div class="section">\n<h2>Data</h2>\n';
      html += this._formatObjectAsHTML(report.data);
      html += '</div>\n';
    }

    if (report.recommendations?.length) {
      html += '<div class="section recommendations">\n<h2>Recommendations</h2>\n<ul>\n';
      for (const rec of report.recommendations) {
        html += `<li><strong>${rec.title}</strong><br>${rec.description}</li>\n`;
      }
      html += '</ul>\n</div>\n';
    }

    html += '</body>\n</html>';

    return html;
  }

  _formatObjectAsHTML(obj) {
    let html = '';

    for (const [key, value] of Object.entries(obj)) {
      html += `<h3>${key}</h3>\n`;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        html += '<table>\n';
        for (const [subKey, subValue] of Object.entries(value)) {
          html += `<tr><td><strong>${subKey}</strong></td><td>${String(subValue)}</td></tr>\n`;
        }
        html += '</table>\n';
      } else if (Array.isArray(value)) {
        html += '<ul>\n';
        for (const item of value.slice(0, 10)) {
          html += `<li>${String(item)}</li>\n`;
        }
        if (value.length > 10) html += `<li>... and ${value.length - 10} more</li>\n`;
        html += '</ul>\n';
      } else {
        html += `<p>${String(value)}</p>\n`;
      }
    }

    return html;
  }

  getStats() {
    return {
      ...this.stats,
      registeredTemplates: this.templates.size,
      historySize: this.reportHistory.length,
      includeCharts: this.includeCharts,
      maxRecommendations: this.maxRecommendations
    };
  }

  getConfig() {
    return { includeCharts: this.includeCharts, maxRecommendations: this.maxRecommendations };
  }

  updateConfig(config) {
    if (config.includeCharts !== undefined) this.includeCharts = config.includeCharts;
    if (config.maxRecommendations !== undefined) this.maxRecommendations = config.maxRecommendations;
  }

  getRecentReports(limit = 10) {
    return this.reportHistory.slice(-limit);
  }

  getTemplates() {
    return Array.from(this.templates.keys());
  }
}

export default ReportGenerator;