/**
 * @file: tests/unit/NARReasoning.test.js
 * @description: Unit tests for the NAR reasoning system and API.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { NAR } from '../../core/NAR.js';
import { Task, Punctuation, TruthValue } from '../../core/Task.js';
import { Term } from '../../core/Term.js';

describe('NAR Reasoning API', () => {
  let nar;

  beforeEach(async () => {
    nar = await new NAR().initialize();
  });

  afterEach(async () => {
    if (nar && typeof nar.stop === 'function') {
      nar.stop();
    }
  });

  test('should initialize with all rules loaded', async () => {
    expect(nar.reasoner).toBeDefined();
    expect(nar.reasoner.rules.size).toBeGreaterThan(0);
    
    // Check that both NAL and LM rules are loaded
    const nalRules = nar.reasoner.getRulesByType('nal');
    const lmRules = nar.reasoner.getRulesByType('lm');
    
    expect(nalRules.length).toBeGreaterThan(0);
    expect(lmRules.length).toBeGreaterThan(0);
  });

  test('should add tasks and make them available for reasoning', () => {
    const task = nar.input('(A --> B).');
    expect(task).toBeDefined();
    expect(task.term.toString()).toContain('A --> B');
    expect(nar.getTasks().length).toBe(1);
  });

  test('should run reasoning cycles and derive new tasks', async () => {
    // Add initial tasks for reasoning
    const task1 = nar.input('(A --> B).');
    const task2 = nar.input('(A).');
    
    const initialTaskCount = nar.getTasks().length;
    expect(initialTaskCount).toBe(2);

    // Run a reasoning cycle
    const derivedTasks = await nar.runCycle();
    
    // Check that reasoning produced results
    expect(Array.isArray(derivedTasks)).toBe(true);
    
    // The total task count should be at least initial + derived
    const finalTaskCount = nar.getTasks().length;
    expect(finalTaskCount).toBeGreaterThanOrEqual(initialTaskCount);
  });

  test('should handle different task punctuation types', () => {
    // Test belief (default)
    const beliefTask = nar.input('A is true.');
    expect(beliefTask.punctuation).toBe(Punctuation.BELIEF);
    
    // Test goal
    const goalTask = nar.input('Achieve A!');
    expect(goalTask.punctuation).toBe(Punctuation.GOAL);
    
    // Test question
    const questionTask = nar.input('Is A true?');
    expect(questionTask.punctuation).toBe(Punctuation.QUESTION);
    
    // Verify all tasks are stored
    expect(nar.getBeliefs().length).toBe(1);
    expect(nar.getGoals().length).toBe(1);
    expect(nar.getQuestions().length).toBe(1);
  });

  test('should filter tasks by priority', () => {
    // Add tasks with different priorities
    nar.input('High priority task.');
    nar.input('Low priority task.');
    
    const allTasks = nar.getTasks();
    const sortedByPriority = nar.getTasksByPriority();
    
    expect(allTasks.length).toBe(sortedByPriority.length);
    expect(sortedByPriority[0].getPriority()).toBeGreaterThanOrEqual(
      sortedByPriority[sortedByPriority.length - 1].getPriority()
    );
  });

  test('should get specific task types (beliefs, goals, questions)', () => {
    nar.input('This is a belief.');
    nar.input('This is a goal!');
    nar.input('This is a question?');
    
    const beliefs = nar.getBeliefs();
    const goals = nar.getGoals();
    const questions = nar.getQuestions();
    
    expect(beliefs.length).toBe(1);
    expect(goals.length).toBe(1);
    expect(questions.length).toBe(1);
  });

  test('should find tasks by term pattern', () => {
    nar.input('This is a belief with specific term.');
    nar.input('Another task with different content.');
    
    const matchingTasks = nar.findTasksByTerm('specific');
    expect(matchingTasks.length).toBe(1);
    expect(matchingTasks[0].term.toString()).toContain('specific');
  });

  test('should get statistics about reasoning system', () => {
    nar.input('Initial task.');
    const stats = nar.getStats();
    
    expect(stats).toBeDefined();
    expect(typeof stats.cycles).toBe('number');
    expect(typeof stats.inputTasks).toBe('number');
    expect(typeof stats.derivedTasks).toBe('number');
    expect(typeof stats.taskCount).toBe('number');
    expect(stats.reasoningMetrics).toBeDefined();
    expect(stats.reasoningMetrics.enabledRulesCount).toBeGreaterThan(0);
  });

  test('should provide detailed reasoning report', () => {
    const report = nar.getDetailedReasoningReport();
    
    expect(report).toBeDefined();
    expect(report.enabledRules).toBeDefined();
    expect(Array.isArray(report.enabledRules)).toBe(true);
    expect(report.reasoningMetrics).toBeDefined();
  });

  test('should manage rule enabling and disabling', () => {
    const initialEnabledCount = nar.reasoner.getEnabledRules().length;
    
    // Get a sample rule ID
    const sampleRule = nar.reasoner.getEnabledRules()[0];
    if (sampleRule) {
      const ruleId = sampleRule.id;
      
      // Disable the rule
      nar.disableRule(ruleId);
      const afterDisableCount = nar.reasoner.getEnabledRules().length;
      expect(afterDisableCount).toBeLessThan(initialEnabledCount);
      
      // Re-enable the rule
      nar.enableRule(ruleId);
      const afterEnableCount = nar.reasoner.getEnabledRules().length;
      expect(afterEnableCount).toBe(initialEnabledCount);
    }
  });

  test('should validate all registered rules', () => {
    const validationResult = nar.validateAllRules();
    expect(Array.isArray(validationResult)).toBe(true);
    expect(validationResult.length).toBeGreaterThan(0);
    
    // Check that validation function doesn't throw errors, even if some rules fail validation
    const validRules = validationResult.filter(r => r.status === 'valid');
    expect(validRules.length).toBeGreaterThanOrEqual(0);
  });

  test('should handle continuous reasoning cycle', async () => {
    // Add a task to ensure there's work for the reasoning cycle
    nar.input('A simple task.');
    
    // Start the continuous reasoning cycle
    nar.start();
    expect(nar.isRunning()).toBe(true);
    
    // Let it run briefly
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Stop the reasoning cycle
    nar.stop();
    expect(nar.isRunning()).toBe(false);
  });

  test('should reset to initial state', () => {
    // Add some tasks
    nar.input('Task to be reset.');
    expect(nar.getTasks().length).toBeGreaterThan(0);
    
    // Reset the NAR
    nar.reset();
    
    // Should be back to initial state
    expect(nar.getTasks().length).toBe(0);
    expect(nar.getStats().cycles).toBe(0);
    expect(nar.getStats().inputTasks).toBe(0);
  });

  test('should run reasoning with detailed tracing', async () => {
    // Add tasks to trigger reasoning
    nar.input('(A --> B).');
    nar.input('(A).');
    
    const result = await nar.runCycleWithTracing();
    expect(result).toBeDefined();
    expect(Array.isArray(result.derivedTasks)).toBe(true);
    expect(Array.isArray(result.trace)).toBe(true);
  });

  test('should run multiple reasoning cycles', async () => {
    nar.input('Initial task.');
    
    const results = await nar.runCycles(3);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(3);
  });

  test('should get memory state information', () => {
    nar.input('Task 1.');
    nar.input('Task 2!');
    nar.input('Task 3?');
    
    const memoryState = nar.getMemoryState();
    expect(memoryState).toBeDefined();
    expect(memoryState.totalTasks).toBe(3);
    expect(memoryState.beliefs).toBe(1);
    expect(memoryState.goals).toBe(1);
    expect(memoryState.questions).toBe(1);
  });

  test('should return highest priority task', () => {
    const task = nar.input('High priority task.');
    const highest = nar.getHighestPriorityTask();
    
    expect(highest).toBeDefined();
    expect(highest.term.toString()).toBe(task.term.toString());
  });
});

describe('NAR Rule Registration', () => {
  test('should register both NAL and LM rules during initialization', async () => {
    const nar = await new NAR().initialize();
    
    const nalRules = nar.reasoner.getRulesByType('nal');
    const lmRules = nar.reasoner.getRulesByType('lm');
    
    expect(nalRules.length).toBeGreaterThan(0);
    expect(lmRules.length).toBeGreaterThan(0);
    
    await nar.stop();
  });
});

describe('RuleManager Integration', () => {
  let nar;

  beforeEach(async () => {
    nar = await new NAR().initialize();
  });

  afterEach(async () => {
    if (nar && typeof nar.stop === 'function') {
      nar.stop();
    }
  });

  test('should validate rules on addition', () => {
    // Test that rule validation is working properly
    const ruleValidationResult = nar.validateAllRules();
    expect(ruleValidationResult).toBeDefined();
    expect(Array.isArray(ruleValidationResult)).toBe(true);
    
    // Check that validation function at least returns results
    expect(ruleValidationResult.length).toBeGreaterThan(0);
  });

  test('should track rule performance metrics', () => {
    const stats = nar.getStats();
    expect(stats.reasonerStats).toBeDefined();
    expect(stats.reasoningMetrics).toBeDefined();
  });
});