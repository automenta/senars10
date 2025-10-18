import { describe, test, expect } from '@jest/globals';
import {
  testSystemHealthMonitoringFunctionality,
  testComponentHealthAggregation,
  testPerformanceMetricCollection,
  testCrossComponentEventPropagation
} from '../../examples/shared/systemHealthDemo.js';

describe('System Health & Monitoring Integration Test', () => {
  test('should demonstrate component health aggregation', async () => {
    const result = await testComponentHealthAggregation();

    // Verify health aggregation structure
    expect(typeof result.totalComponents).toBe('number');
    expect(typeof result.healthyComponents).toBe('number');
    expect(typeof result.unhealthyComponents).toBe('number');
    expect(typeof result.healthPercentage).toBe('number');
    expect(result.healthPercentage).toBeGreaterThanOrEqual(0);
    expect(result.healthPercentage).toBeLessThanOrEqual(100);

    // Verify components object exists
    expect(result.components).toBeDefined();
    expect(typeof result.components).toBe('object');
  });

  test('should demonstrate performance metric collection', async () => {
    const result = await testPerformanceMetricCollection();

    // Verify performance data structure
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');

    // Check if performance metrics were collected for available components
    Object.values(result).forEach(metrics => {
      expect(typeof metrics).toBe('object');
    });
  });

  test('should demonstrate cross-component event propagation', async () => {
    const result = await testCrossComponentEventPropagation();

    // Verify event propagation worked
    expect(typeof result.eventsEmitted).toBe('number');
    expect(typeof result.eventsReceived).toBe('number');
    expect(Array.isArray(result.eventLog)).toBe(true);

    // Verify propagation was successful
    expect(result.propagationSuccessful).toBe(true);
  });

  test('should demonstrate comprehensive system health monitoring functionality', async () => {
    const result = await testSystemHealthMonitoringFunctionality();

    // Verify capabilities are checked
    expect(result.capabilities).toBeDefined();

    // Verify health reports, metrics, and stats are collected
    expect(result.healthReports).toBeDefined();
    expect(result.metrics).toBeDefined();
    expect(result.stats).toBeDefined();
    expect(result.performanceStats).toBeDefined();

    // Verify event handling worked
    expect(typeof result.eventsReceived).toBe('number');

    // Verify at least some components support health monitoring
    const hasHealthFunctionality = Object.values(result.capabilities).some(cap =>
      cap.hasGetHealth || cap.hasGetMetrics || cap.hasGetStats
    );
    expect(hasHealthFunctionality).toBe(true);
  });
});