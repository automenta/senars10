import {MetricsMonitor} from '../../../src/reasoning/MetricsMonitor.js';
import {EventEmitter} from 'events';

describe('MetricsMonitor', () => {
  let metricsMonitor, eventBus;

  beforeEach(() => {
    eventBus = new EventEmitter();
    // Create a minimal NAR-like object with required methods
    const simpleNar = {
      _eventBus: eventBus,
      _ruleEngine: {
        _rules: new Map(),
        getFunctorRegistry: () => ({})
      },
      getRule: () => null
    };
    
    metricsMonitor = new MetricsMonitor({
      eventBus: eventBus,
      nar: simpleNar
    });
  });

  afterEach(() => {
    if (metricsMonitor && typeof metricsMonitor.shutdown === 'function') {
      metricsMonitor.shutdown();
    }
  });

  test('should initialize with default configuration', () => {
    expect(metricsMonitor.metrics).toBeDefined();
    expect(metricsMonitor.metrics.ruleExecutions).toBeInstanceOf(Map);
    expect(metricsMonitor.metrics.ruleSuccessRates).toBeInstanceOf(Map);
    expect(metricsMonitor.enabled).toBe(true);
  });

  test('should record rule execution metrics', () => {
    const testData = { ruleId: 'testRule', success: true, executionTime: 100 };
    metricsMonitor._recordRuleExecution(testData);

    expect(metricsMonitor.metrics.ruleExecutions.get('testRule').totalExecutions).toBe(1);
    expect(metricsMonitor.metrics.ruleExecutions.get('testRule').successfulExecutions).toBe(1);
    expect(metricsMonitor.metrics.ruleSuccessRates.get('testRule')).toBe(1);
  });

  test('should calculate performance score correctly', () => {
    const score = metricsMonitor._calculatePerformanceScore(0.8, 50);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  test('should map performance score to priority within range', () => {
    const priority = metricsMonitor._mapPerformanceScoreToPriority(0.5);
    expect(priority).toBeGreaterThanOrEqual(0.1);
    expect(priority).toBeLessThanOrEqual(0.9);
  });

  test('should get metrics snapshot', () => {
    const snapshot = metricsMonitor.getMetricsSnapshot();
    expect(snapshot).toHaveProperty('timestamp');
    expect(snapshot).toHaveProperty('ruleMetrics');
    expect(snapshot).toHaveProperty('cycleMetrics');
    expect(snapshot).toHaveProperty('taskMetrics');
    expect(snapshot).toHaveProperty('cacheMetrics');
  });

  test('should reset metrics', () => {
    metricsMonitor._recordRuleExecution({ ruleId: 'testRule', success: true, executionTime: 100 });
    
    metricsMonitor.resetMetrics();
    
    const ruleMetrics = metricsMonitor.metrics.ruleExecutions.get('testRule');
    expect(ruleMetrics).toBeUndefined();
  });

  test('should enable/disable monitor', () => {
    metricsMonitor.setEnabled(false);
    expect(metricsMonitor.enabled).toBe(false);
    
    metricsMonitor.setEnabled(true);
    expect(metricsMonitor.enabled).toBe(true);
  });
});