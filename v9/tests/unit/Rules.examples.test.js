import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import createCore from '../../core/orchestration/createCore.js';

describe('Rules Engine Examples', () => {
  let core;

  beforeEach(async () => {
    core = await createCore();
  });

  afterEach(async () => {
    await core.stop();
    await core.destroy();
  });

  describe('Rule Management', () => {
    test('should create rules with different types and complexities', () => {
      const testRules = [
        {
          name: 'urgent-task-handler',
          type: 'task',
          complexity: 'simple',
          preFilterTags: ['urgent', 'immediate'],
          condition: (ctx) => ctx.priority >= 9,
          action: (ctx) => ({
            result: 'immediate-action',
            task: ctx.term?.name || 'unknown',
            processedAt: new Date().toISOString()
          }),
          priority: 10
        },
        {
          name: 'normal-task-processor',
          type: 'task',
          complexity: 'simple',
          preFilterTags: ['normal', 'scheduled'],
          condition: (ctx) => ctx.priority >= 5 && ctx.priority < 9,
          action: (ctx) => ({
            result: 'scheduled-processing',
            task: ctx.task,
            eta: '1-2 hours'
          }),
          priority: 5
        },
        {
          name: 'complex-pattern-analyzer',
          type: 'analysis',
          complexity: 'complex',
          preFilterTags: ['pattern', 'trend'],
          condition: (ctx) => ctx.dataType === 'pattern' && ctx.size > 100,
          action: (ctx) => ({
            result: 'deep-analysis',
            patterns: ctx.patterns,
            insights: 'generated'
          }),
          priority: 8
        }
      ];

      testRules.forEach(rule => core.rules.add(rule));
      expect(core.rules.rules.length).toBeGreaterThanOrEqual(3);
    });

    test('should provide rule indexing and fast lookups', () => {
      const indexTestRules = [
        { name: 'test-task-rule', type: 'task', complexity: 'simple', priority: 5 },
        { name: 'test-analysis-rule', type: 'analysis', complexity: 'complex', priority: 8 }
      ];

      indexTestRules.forEach(({ name, type, complexity, priority }) => {
        core.rules.add({
          name,
          type,
          complexity,
          condition: () => true,
          action: () => ({ result: 'test' }),
          priority
        });
      });

      const taskRules = core.rules.getRulesByType('task');
      const analysisRules = core.rules.getRulesByType('analysis');
      const simpleRules = core.rules.getRulesByComplexity('simple');
      const highPriorityRules = core.rules.getRulesByPriority(10);

      expect(Array.isArray(taskRules)).toBe(true);
      expect(Array.isArray(analysisRules)).toBe(true);
      expect(Array.isArray(simpleRules)).toBe(true);
      expect(Array.isArray(highPriorityRules)).toBe(true);
    });
  });

  describe('Rule Pre-filtering', () => {
    test('should optimize rule candidates using pre-filtering', () => {
      core.rules.add({
        name: 'urgent-rule',
        type: 'task',
        complexity: 'simple',
        preFilterTags: ['urgent', 'immediate'],
        condition: (ctx) => ctx.priority >= 9,
        action: (ctx) => ({ result: 'urgent-processed' }),
        priority: 10
      });

      const urgentContext = {
        task: 'Critical system failure',
        priority: 10,
        tags: ['urgent', 'immediate', 'system']
      };

      const candidates = core.rules.getOptimizedRuleCandidates(urgentContext, {
        ruleType: 'task',
        maxComplexity: 'simple'
      });

      expect(Array.isArray(candidates)).toBe(true);
    });
  });

  describe('Rule Evaluation', () => {
    test('should evaluate rules correctly with different contexts', async () => {
      core.rules.add({
        name: 'priority-rule',
        type: 'task',
        complexity: 'simple',
        condition: (ctx) => ctx.priority >= 8,
        action: (ctx) => ({
          result: 'high-priority-processed',
          priority: ctx.priority
        }),
        priority: 10
      });

      const highPriorityContext = {
        priority: 9,
        term: { name: 'urgent-task' },
        truth: { confidence: 0.9 }
      };

      const result = await core.rules.evaluate(highPriorityContext);
      expect(result).toBeDefined();
      expect(result.result).toBe('high-priority-processed');

      const lowPriorityContext = {
        priority: 3,
        term: { name: 'normal-task' },
        truth: { confidence: 0.8 }
      };

      const noResult = await core.rules.evaluate(lowPriorityContext);
      expect(noResult).toBeNull();
    });
  });

  describe('Statistics', () => {
    test('should provide rule statistics', () => {
      core.rules.add({
        name: 'stat-test-1',
        type: 'task',
        complexity: 'simple',
        condition: () => true,
        action: () => ({ result: 'test' }),
        priority: 5
      });

      core.rules.add({
        name: 'stat-test-2',
        type: 'analysis',
        complexity: 'complex',
        condition: () => true,
        action: () => ({ result: 'test' }),
        priority: 8
      });

      const stats = core.rules.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalRules).toBe('number');
      expect(stats.totalRules).toBeGreaterThan(0);
      expect(Array.isArray(stats.types)).toBe(true);
    });
  });
});