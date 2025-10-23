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
        const testData = {ruleId: 'testRule', success: true, executionTime: 100};
        metricsMonitor._recordRuleExecution(testData);

        expect(metricsMonitor.metrics.ruleExecutions.get('testRule').totalExecutions).toBe(1);
        expect(metricsMonitor.metrics.ruleExecutions.get('testRule').successfulExecutions).toBe(1);
        expect(metricsMonitor.metrics.ruleSuccessRates.get('testRule')).toBe(1);
    });

    test('should record rule execution metrics with error', () => {
        const testData = {ruleId: 'testRule', success: false, executionTime: 100};
        metricsMonitor._recordRuleExecution(testData);

        expect(metricsMonitor.metrics.ruleExecutions.get('testRule').totalExecutions).toBe(1);
        expect(metricsMonitor.metrics.ruleExecutions.get('testRule').successfulExecutions).toBe(0);
        expect(metricsMonitor.metrics.ruleSuccessRates.get('testRule')).toBe(0);
    });

    test('should handle execution time recording correctly', () => {
        const testData = {ruleId: 'testRule', success: true, executionTime: 150};
        metricsMonitor._recordRuleExecution(testData);

        const execMetrics = metricsMonitor.metrics.executionTimes.get('testRule');
        expect(execMetrics.count).toBe(1);
        expect(execMetrics.totalTime).toBe(150);
        expect(execMetrics.averageTime).toBe(150);
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

    test('should clamp performance score to valid range', () => {
        const lowPriority = metricsMonitor._mapPerformanceScoreToPriority(-1.0);
        const highPriority = metricsMonitor._mapPerformanceScoreToPriority(2.0);

        expect(lowPriority).toBeGreaterThanOrEqual(0.1);
        expect(highPriority).toBeLessThanOrEqual(0.9);
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
        metricsMonitor._recordRuleExecution({ruleId: 'testRule', success: true, executionTime: 100});

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

    test('should handle cache hit recording', () => {
        metricsMonitor._updateCacheStats({cacheName: 'testCache', duration: 10}, 'hit');

        const cacheMetrics = metricsMonitor.metrics.cacheStats.get('testCache');
        expect(cacheMetrics.hits).toBe(1);
        expect(cacheMetrics.misses).toBe(0);
        expect(cacheMetrics.totalTime).toBe(10);
    });

    test('should handle cache miss recording', () => {
        metricsMonitor._updateCacheStats({cacheName: 'testCache', duration: 20}, 'miss');

        const cacheMetrics = metricsMonitor.metrics.cacheStats.get('testCache');
        expect(cacheMetrics.hits).toBe(0);
        expect(cacheMetrics.misses).toBe(1);
        expect(cacheMetrics.totalTime).toBe(20);
    });

    test('should record cycle metrics', () => {
        metricsMonitor._recordCycleMetrics({duration: 50});

        expect(metricsMonitor.metrics.cycleStats.count).toBe(1);
        expect(metricsMonitor.metrics.cycleStats.totalDuration).toBe(50);
        expect(metricsMonitor.metrics.cycleStats.averageDuration).toBe(50);
    });

    test('should handle task input and processing events', () => {
        // Simulate task input
        metricsMonitor.eventBus.emit('task.input');
        metricsMonitor.eventBus.emit('task.processed', {success: true});
        metricsMonitor.eventBus.emit('task.processed', {success: false});

        expect(metricsMonitor.metrics.taskStats.inputCount).toBe(1);
        expect(metricsMonitor.metrics.taskStats.processedCount).toBe(2);
        expect(metricsMonitor.metrics.taskStats.successCount).toBe(1);
    });

    test('should handle self-optimization when disabled', () => {
        metricsMonitor.selfOptimizationEnabled = false;
        const result = metricsMonitor._performSelfOptimization();

        // Should return early without error when self-optimization is disabled
        expect(result).toBeUndefined();
    });

    test('should update execution times properly', () => {
        metricsMonitor._updateExecutionTime('testRule', 100);

        const execMetrics = metricsMonitor.metrics.executionTimes.get('testRule');
        expect(execMetrics.count).toBe(1);
        expect(execMetrics.totalTime).toBe(100);
        expect(execMetrics.averageTime).toBe(100);
    });

    test('should not update execution times if executionTime is undefined', () => {
        const initialCount = metricsMonitor.metrics.executionTimes.size;
        metricsMonitor._recordRuleExecution({ruleId: 'testRule', success: true, executionTime: undefined});

        // Should not create execution time metrics if executionTime is undefined
        expect(metricsMonitor.metrics.executionTimes.size).toBe(initialCount);
    });
});