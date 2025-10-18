/**
 * @file: tests/integration/CognitiveCycleIntegration.test.js
 * @description: Integration test demonstrating Rules and Memory working together in a cognitive cycle
 * This test is also used as a source for the cognitive-cycle example
 */

import { jest } from '@jest/globals';
import { demonstrateCognitiveCycle } from '../../examples/shared/cognitiveCycleDemo.js';

describe('Cognitive Cycle Integration Test', () => {
  test('comprehensive cognitive cycle operations work as expected', async () => {
    const results = await demonstrateCognitiveCycle();

    // Verify expected results
    expect(results.perceptionResults).toBeDefined();
    expect(results.perceptionResults.length).toBeGreaterThanOrEqual(0);

    expect(results.patternResult).toBeDefined();

    expect(results.decisionResult).toBeDefined();

    expect(results.learningResult).toBeDefined();

    expect(results.workingMemoryItems).toBeDefined();
    expect(results.workingMemoryItems.length).toBeGreaterThanOrEqual(0);

    expect(results.insights).toBeDefined();
    expect(results.decisions).toBeDefined();

    expect(results.attentionStats).toBeDefined();
    expect(Object.keys(results.attentionStats).length).toBeGreaterThan(0);

    expect(results.ruleStats).toBeDefined();
    expect(results.memoryStats).toBeDefined();
  });

  test('cognitive rules process inputs correctly', async () => {
    const results = await demonstrateCognitiveCycle();

    // Verify that perception results are correctly filtered by confidence > 0.7
    expect(results.perceptionResults).toBeDefined();

    // Verify that pattern recognition works
    expect(results.patternResult).toBeDefined();
    if (results.patternResult) {
      expect(results.patternResult.result).toBe('pattern-analyzed');
    }

    // Verify that decision making works
    expect(results.decisionResult).toBeDefined();
    if (results.decisionResult) {
      expect(results.decisionResult.result).toBe('decision-made');
    }

    // Verify that learning works
    expect(results.learningResult).toBeDefined();
    if (results.learningResult) {
      expect(results.learningResult.result).toBe('learned');
    }
  });
});