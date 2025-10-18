import { describe, test, expect, beforeEach } from '@jest/globals';
import Rules from '../../core/reasoning/Rules.js';

describe('Rules', () => {
  let rules;

  beforeEach(() => {
    rules = new Rules();
    rules.initialize();
  });

  test('add and retrieve rule', () => {
    const rule = { name: 'test-rule', condition: () => true, action: () => 'fired' };
    rules.add(rule);
    const found = rules.find(r => r.name === 'test-rule');
    expect(found).toHaveLength(1);
    expect(found[0].name).toBe('test-rule');
  });

  test('remove rule by name', () => {
    const rule = { name: 'test-rule', condition: () => true, action: () => {} };
    rules.add(rule);
    rules.remove('test-rule');
    const found = rules.find(r => r.name === 'test-rule');
    expect(found).toHaveLength(0);
  });

  test('throw error for missing required properties', () => {
    expect(() => rules.add({})).toThrow('name is required');
    expect(() => rules.add({ name: 'test' })).toThrow('condition is required');
    expect(() => rules.add({ name: 'test', condition: () => true })).toThrow('action is required');
  });

  describe('evaluate', () => {
    test('execute matching rule action', async () => {
      let actionFired = false;
      const action = () => { actionFired = true; };
      rules.add({ name: 'test-rule', condition: () => true, action });
      await rules.evaluate({});
      expect(actionFired).toBe(true);
    });

    test('not execute non-matching rule action', async () => {
      let actionFired = false;
      const action = () => { actionFired = true; };
      rules.add({ name: 'test-rule', condition: () => false, action });
      await rules.evaluate({});
      expect(actionFired).toBe(false);
    });

    test('execute highest priority rule', async () => {
      let highPriorityFired = false;
      let lowPriorityFired = false;
      const lowPriorityAction = () => { lowPriorityFired = true; };
      const highPriorityAction = () => { highPriorityFired = true; };
      rules.add({ name: 'low-priority', condition: () => true, action: lowPriorityAction, priority: 1 });
      rules.add({ name: 'high-priority', condition: () => true, action: highPriorityAction, priority: 10 });
      await rules.evaluate({});
      expect(highPriorityFired).toBe(true);
      expect(lowPriorityFired).toBe(false);
    });

    test('pass context to condition and action', async () => {
      const context = { value: 42 };
      let conditionContext = null;
      let actionContext = null;
      const condition = (ctx) => {
        conditionContext = ctx;
        return ctx.value === 42;
      };
      const action = (ctx) => { actionContext = ctx; };
      rules.add({ name: 'context-rule', condition, action });
      await rules.evaluate(context);
      expect(conditionContext).toBe(context);
      expect(actionContext).toBe(context);
    });

    test('return action result', async () => {
      rules.add({ name: 'return-rule', condition: () => true, action: () => 'result' });
      const result = await rules.evaluate({});
      expect(result).toBe('result');
    });

    test('return null if no rules match', async () => {
      const result = await rules.evaluate({});
      expect(result).toBeNull();
    });
  });
});