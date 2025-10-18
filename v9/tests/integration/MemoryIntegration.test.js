/**
 * @file: tests/integration/MemoryIntegration.test.js
 * @description: Integration test demonstrating enhanced Memory component with focus sets and attention
 * This test is also used as a source for the basic-memory example
 */

import { jest } from '@jest/globals';
import { demonstrateMemorySystem } from '../../examples/shared/memoryDemo.js';

describe('Memory Integration Test', () => {
  test('comprehensive memory operations work as expected', async () => {
    const results = await demonstrateMemorySystem();

    // Verify expected results
    expect(results.focusItems).toBeDefined();
    expect(results.focusItems.length).toBeGreaterThan(0);

    expect(results.focusStats).toBeDefined();
    expect(Object.keys(results.focusStats).length).toBeGreaterThan(0);

    expect(results.highPriorityItems).toBeDefined();
    expect(results.alertItems).toBeDefined();
    expect(results.urgentItems).toBeDefined();

    expect(results.memStats).toBeDefined();
    expect(results.memStats.storageSize).toBeGreaterThanOrEqual(0);
    expect(results.memStats.focusSets).toBeDefined();

    expect(results.attentionItems).toBeDefined();
    expect(results.totalItems).toBe(4);
  });

  test('query functionality filters correctly', async () => {
    const results = await demonstrateMemorySystem();

    // Verify that high priority items are filtered correctly
    expect(results.highPriorityItems.every(item => item.value.priority >= 8)).toBe(true);

    // Verify that alert items are filtered correctly
    expect(results.alertItems.every(item => item.value.type === 'alert')).toBe(true);

    // Verify that urgent items are filtered correctly
    expect(results.urgentItems.every(item => item.key.includes('urgent'))).toBe(true);
  });
});