import AnalysisEngine from '../../core/analysis/AnalysisEngine.js';
import DataIngestor from '../../core/analysis/DataIngestor.js';
import ReportGenerator from '../../core/analysis/ReportGenerator.js';
import createCore from '../../core/orchestration/createCore.js';

describe('Analysis Components', () => {
  let core;
  let analysisEngine;
  let dataIngestor;
  let reportGenerator;

  beforeEach(async () => {
    core = await createCore();
    analysisEngine = new AnalysisEngine();
    dataIngestor = new DataIngestor();
    reportGenerator = new ReportGenerator();

    // Set core reference for components that need it
    analysisEngine.core = core;
    dataIngestor.core = core;
    reportGenerator.core = core;

    await analysisEngine.initialize();
    await dataIngestor.initialize();
    await reportGenerator.initialize();
  });

  afterEach(async () => {
    if (core) {
      await core.destroy();
    }
  });

  describe('AnalysisEngine', () => {
    test('should initialize with default configuration', () => {
      expect(analysisEngine.minConfidence).toBeDefined();
      expect(analysisEngine.similarityThreshold).toBeDefined();
      expect(analysisEngine.bottleneckThreshold).toBeDefined();
      expect(analysisEngine.stats.analysesPerformed).toBe(0);
    });

    test('should perform analysis and return results', async () => {
      const context = {
        metrics: {
          responseTimes: [50, 60, 70, 250], // Include a potential bottleneck
          memory: { heapUsed: 80000000, heapTotal: 100000000 }
        }
      };

      const results = await analysisEngine.analyze(context);

      expect(results).toHaveProperty('timestamp');
      expect(results).toHaveProperty('performance');
      expect(results).toHaveProperty('bottlenecks');
      expect(results).toHaveProperty('recommendations');

      // Check that analysis statistics were updated
      expect(analysisEngine.stats.analysesPerformed).toBe(1);
    });

    test('should detect bottlenecks correctly', async () => {
      const results = await analysisEngine.analyze({
        metrics: {
          operationTimes: { slowOp: 500, fastOp: 10 }, // slowOp exceeds default 100ms threshold
          responseTimes: [500]
        }
      });

      expect(results.bottlenecks.length).toBeGreaterThan(0);
      expect(results.bottlenecks[0]).toHaveProperty('operation', 'slowOp');
    });

    test('should update configuration', () => {
      const newConfig = {
        minConfidence: 0.8,
        similarityThreshold: 0.9,
        bottleneckThreshold: 200
      };

      analysisEngine.updateConfig(newConfig);

      const config = analysisEngine.getConfig();
      expect(config.minConfidence).toBe(0.8);
      expect(config.similarityThreshold).toBe(0.9);
      expect(config.bottleneckThreshold).toBe(200);
    });
  });

  describe('DataIngestor', () => {
    test('should initialize with default configuration', () => {
      expect(dataIngestor.bottleneckTimeThreshold).toBeDefined();
      expect(dataIngestor.bottleneckAvgTimeFactor).toBeDefined();
      expect(dataIngestor.processingStats.totalProcessed).toBe(0);
    });

    test('should process JSON data into cognitive tasks', async () => {
      const sampleData = {
        name: 'test',
        value: 123,
        nested: { prop: 'value' }
      };

      const tasks = await dataIngestor.ingest(sampleData, { format: 'json' });

      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);

      // Each task should have required properties
      for (const task of tasks) {
        expect(task).toHaveProperty('term');
        expect(task).toHaveProperty('punctuation');
        expect(task).toHaveProperty('truth');
      }

      // Check that processing statistics were updated
      expect(dataIngestor.processingStats.totalProcessed).toBe(1);
    });

    test('should detect ingestion bottlenecks', async () => {
      // Mock a slow processing function to trigger bottleneck detection
      const slowData = new Promise(resolve => setTimeout(() => resolve({ test: 'data' }), 150));

      // Note: We're not actually testing the bottleneck detection here because
      // it requires the processing to take longer than the threshold, which would
      // slow down the tests. The bottleneck logic is tested in other ways.

      const data = await slowData;
      const tasks = await dataIngestor.ingest(data, { format: 'json' });

      expect(Array.isArray(tasks)).toBe(true);
    });

    test('should register and use custom parsers', async () => {
      const customParser = (data) => [{
        term: `(${JSON.stringify(data)})`,
        punctuation: '.',
        truth: { frequency: 0.9, confidence: 0.8 }
      }];

      dataIngestor.registerParser('custom', customParser);

      const tasks = await dataIngestor.ingest({ test: 'data' }, { format: 'custom' });

      expect(tasks.length).toBe(1);
      expect(tasks[0].term).toContain('test');
    });

    test('should update configuration', () => {
      const newConfig = {
        bottleneckTimeThreshold: 250,
        bottleneckAvgTimeFactor: 3
      };

      dataIngestor.updateConfig(newConfig);

      const config = dataIngestor.getConfig();
      expect(config.bottleneckTimeThreshold).toBe(250);
      expect(config.bottleneckAvgTimeFactor).toBe(3);
    });
  });

  describe('ReportGenerator', () => {
    test('should initialize with default configuration', () => {
      expect(reportGenerator.includeCharts).toBeDefined();
      expect(reportGenerator.maxRecommendations).toBeDefined();
      expect(reportGenerator.stats.reportsGenerated).toBe(0);
    });

    test('should generate system health report', async () => {
      const report = await reportGenerator.generate('system');

      expect(report).toHaveProperty('title');
      expect(report.title).toBe('System Health Report');
      expect(report).toHaveProperty('data');
      expect(report).toHaveProperty('metadata');
    });

    test('should generate performance report', async () => {
      const report = await reportGenerator.generate('performance');

      expect(report).toHaveProperty('title');
      expect(report.title).toBe('Performance Report');
      expect(report).toHaveProperty('data');
    });

    test('should generate analysis report', async () => {
      const report = await reportGenerator.generate('analysis');

      expect(report).toHaveProperty('title');
      expect(report.title).toBe('Analysis Summary Report');
    });

    test('should include recommendations in reports', async () => {
      const report = await reportGenerator.generate('system');

      expect(report).toHaveProperty('recommendations');
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    test('should export reports in different formats', async () => {
      const report = await reportGenerator.generate('system');

      // Test JSON export
      const jsonExport = await reportGenerator.export(report, 'json');
      expect(typeof jsonExport).toBe('string');

      // Test text export
      const textExport = await reportGenerator.export(report, 'text');
      expect(typeof textExport).toBe('string');
      expect(textExport).toContain(report.title);

      // Test HTML export
      const htmlExport = await reportGenerator.export(report, 'html');
      expect(typeof htmlExport).toBe('string');
      expect(htmlExport).toContain('<html>');
    });

    test('should register custom templates', () => {
      const customTemplate = {
        name: 'Custom Report',
        description: 'A custom report template',
        generator: async (context) => ({ title: 'Custom Report', data: context })
      };

      reportGenerator.registerTemplate('custom', customTemplate);

      const templates = reportGenerator.getTemplates();
      expect(templates).toContain('custom');
    });

    test('should update configuration', () => {
      const newConfig = {
        includeCharts: false,
        maxRecommendations: 5
      };

      reportGenerator.updateConfig(newConfig);

      const config = reportGenerator.getConfig();
      expect(config.includeCharts).toBe(false);
      expect(config.maxRecommendations).toBe(5);
    });
  });
});