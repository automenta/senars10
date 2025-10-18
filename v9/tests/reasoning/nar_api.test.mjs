/**
 * NAR API unit tests.
 * These tests focus on the public API of the NAR class that is not
 * covered by the more specific reasoning tests.
 */

import { NAR } from '../../core/NAR.js';
import { Punctuation } from '../../core/Task.js';

describe('NAR API Tests', () => {
  test('NAR initializes with both NAL and LM rules loaded', async () => {
    const nar = await new NAR().initialize();
    const stats = nar.reasoner.getStats();

    expect(stats.totalRules).toBeGreaterThan(0);
    expect(stats.ruleTypes).toContain('nal');
    expect(stats.ruleTypes).toContain('lm');
  });

  test('NAR handles malformed input gracefully', async () => {
    const nar = await new NAR().initialize();

    expect(() => {
      nar.input(null);
    }).toThrow();

    expect(() => {
      nar.input(undefined);
    }).toThrow();
  });

  test('NAR reset functionality works correctly', async () => {
    const nar = await new NAR().initialize();

    nar.input('test task.');
    expect(nar.getTasks().length).toBe(1);

    nar.reset();
    expect(nar.getTasks().length).toBe(0);
  });

  test('NAR continuous operation start/stop works correctly', async () => {
    const nar = await new NAR().initialize();

    expect(nar.isRunning()).toBe(false);

    nar.start();
    expect(nar.isRunning()).toBe(true);

    nar.stop();
    expect(nar.isRunning()).toBe(false);
  });

  test('NAR concept tracking works correctly', async () => {
    const nar = await new NAR().initialize();

    nar.input('cat --> mammal.');
    nar.input('dog --> mammal.');

    const concepts = nar.getConcepts();
    expect(concepts.length).toBeGreaterThan(0);

    const conceptNames = concepts.map(c => c.term?.toString()).filter(Boolean);
    expect(conceptNames.length).toBeGreaterThan(0);
  });

  test('NAR handles empty focus set gracefully', async () => {
    const nar = await new NAR().initialize();

    const derivedTasks = await nar.runCycle();
    expect(Array.isArray(derivedTasks)).toBe(true);
    expect(derivedTasks.length).toBe(0);
  });

  test('NAR rule performance metrics are tracked', async () => {
    const nar = await new NAR().initialize();

    nar.input('cat --> mammal.');

    await nar.runCycle();

    const stats = nar.reasoner.getStats();
    expect(stats.performance).toBeDefined();
    expect(typeof stats.performance.totalExecutions).toBe('number');
  });
});