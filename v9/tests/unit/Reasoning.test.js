/**
 * @file: tests/unit/Reasoning.test.js
 * @description: Unit tests for the Reasoning component (RuleManager).
 */

import { jest } from '@jest/globals';
import { RuleManager as Reasoner } from '../../core/reasoning/RuleManager.js';

// Mock Memory class for testing purposes
class MockMemory {
  constructor() {
    this.tasks = [];
  }
  getTask(hash) {
    return this.tasks.find(t => t.term.hash === hash);
  }
  getAllTasks() {
    return this.tasks;
  }
  addTask(task) {
    this.tasks.push(task);
  }
}

describe('Reasoner (RuleManager) Component', () => {
  test('should initialize with an empty rule map', () => {
    const reasoner = new Reasoner();
    expect(reasoner.rules.size).toBe(0);
  });

  test('should add a rule', () => {
    const reasoner = new Reasoner();
    const rule = { id: 'test-rule', apply: () => {} };
    reasoner.addRule(rule);
    expect(reasoner.rules.get('test-rule')).toEqual(rule);
  });

  test('reason method should process tasks and return derived tasks', async () => {
    const reasoner = new Reasoner();
    const memory = new MockMemory();
    const tasks = [{ term: '((A) --> (B)).', punctuation: '.' }];

    // Mock a simple rule
    const rule = {
      id: 'test-rule',
      apply: jest.fn().mockResolvedValue([{ term: 'derived' }]),
    };
    reasoner.addRule(rule);

    const result = await reasoner.reason(tasks, memory, { currentTime: Date.now() });

    expect(result).toBeDefined();
    expect(rule.apply).toHaveBeenCalled();
  });

  test('reason method should return an empty array for empty task list', async () => {
    const reasoner = new Reasoner();
    const memory = new MockMemory();
    const result = await reasoner.reason([], memory, { currentTime: Date.now() });
    expect(result).toEqual([]);
  });
});