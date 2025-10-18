/**
 * @file tests/unit/NARConvenienceMethods.test.js
 * @description Tests for the new convenience methods in NAR API.
 */

import { describe, test, expect } from '@jest/globals';
import { NAR } from '../../core/NAR.js';
import { Punctuation } from '../../core/Task.js';

describe('NAR Convenience Methods', () => {
  let nar;

  beforeEach(async () => {
    nar = await new NAR().initialize();
  });

  afterEach(async () => {
    if (nar && typeof nar.stop === 'function') {
      nar.stop();
    }
  });

  test('should create belief with convenience method', () => {
    const task = nar.believe('The sky is blue', { frequency: 0.8, confidence: 0.9 });
    expect(task).toBeDefined();
    expect(task.punctuation).toBe(Punctuation.BELIEF);
    expect(task.truth.frequency).toBe(0.8);
    expect(task.truth.confidence).toBe(0.9);
  });

  test('should create goal with convenience method', () => {
    const task = nar.want('Complete the project', { frequency: 0.7, confidence: 0.85 });
    expect(task).toBeDefined();
    expect(task.punctuation).toBe(Punctuation.GOAL);
    expect(task.truth.frequency).toBe(0.7);
    expect(task.truth.confidence).toBe(0.85);
  });

  test('should create question with convenience method', () => {
    const task = nar.ask('Is the project complete?');
    expect(task).toBeDefined();
    expect(task.punctuation).toBe(Punctuation.QUESTION);
  });

  test('should run quick thinking with think method', async () => {
    const result = await nar.think('A simple belief.');
    expect(result).toBeDefined();
    expect(result.term.toString()).toContain('A simple belief');
  });

  test('should run thinking with detailed response', async () => {
    const result = await nar.thinkAndRespond('Another simple belief.');
    expect(result).toBeDefined();
    expect(result.input).toBeDefined();
    expect(Array.isArray(result.derived)).toBe(true);
    expect(Array.isArray(result.tasks)).toBe(true);
  });

  test('should get rule counts and summary', () => {
    const counts = nar.getRuleCounts();
    expect(counts).toBeDefined();
    
    const summary = nar.getRulesSummary();
    expect(summary).toBeDefined();
    expect(typeof summary.total).toBe('number');
    expect(Array.isArray(summary.types)).toBe(true);
  });


});