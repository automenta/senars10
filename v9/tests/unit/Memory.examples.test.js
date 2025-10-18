import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import createCore from '../../core/orchestration/createCore.js';

describe('Memory Examples', () => {
  let core;

  beforeEach(async () => {
    core = await createCore();
  });

  afterEach(async () => {
    await core.stop();
    await core.destroy();
  });

  describe('Focus Sets', () => {
    test('create and manage focus sets', () => {
      const focusSets = [
        { name: 'working-memory', capacity: 5 },
        { name: 'long-term-storage', capacity: 10 },
        { name: 'attention-focus', capacity: 3 },
        { name: 'pattern-buffer', capacity: 8 },
      ];

      focusSets.forEach(({ name, capacity }) => {
        core.memory.focus.createFocusSet(name, capacity);
      });

      core.memory.focus.setFocus('working-memory');
      expect(core.memory.focus.getCurrentFocus()).toBe('working-memory');
    });

    test('add items with metadata', () => {
      const testItems = [
        {
          key: 'urgent-alert',
          value: { content: 'Critical system temperature exceeded threshold', priority: 10, type: 'alert' },
          options: { type: 'alert', tags: ['urgent', 'system'], priority: 10 }
        },
        {
          key: 'meeting-task',
          value: { content: 'Daily standup meeting', priority: 7, type: 'task' },
          options: { type: 'task', tags: ['meeting', 'daily'], priority: 7 }
        },
        {
          key: 'low-priority',
          value: { content: 'Background monitoring', priority: 3, type: 'system' },
          options: { type: 'system', tags: ['background'], priority: 3 }
        }
      ];

      testItems.forEach(({ key, value, options }) => {
        core.memory.set(key, value, options);
      });

      testItems.forEach(({ key }) => {
        expect(core.memory.has(key)).toBe(true);
      });

      const urgentItem = core.memory.get('urgent-alert');
      expect(urgentItem.priority).toBe(10);
      expect(urgentItem.type).toBe('alert');
    });

    test('manage focus set assignments', () => {
      core.memory.focus.createFocusSet('working-memory', 5);
      core.memory.set('test-item', { content: 'test' }, { priority: 5 });
      core.memory.focus.updateFocusSets('test-item', { focusSet: 'working-memory' });

      const focusItems = core.memory.focus.getFocusItems(10);
      expect(Array.isArray(focusItems)).toBe(true);
    });
  });

  describe('Attention Mechanism', () => {
    test('update focus attention', () => {
      core.memory.focus.createFocusSet('working-memory', 5);
      core.memory.focus.createFocusSet('attention-focus', 3);

      core.memory.focus.updateFocusAttention('working-memory', 0.8);
      core.memory.focus.updateFocusAttention('attention-focus', 0.6);

      const stats = core.memory.focus.getFocusSetStats();
      expect(stats['working-memory']).toBeDefined();
      expect(stats['attention-focus']).toBeDefined();
    });

    test('retrieve items by attention focus', () => {
      core.memory.focus.createFocusSet('test-focus', 5);
      core.memory.set('attention-item', { content: 'test', priority: 8 });
      core.memory.focus.updateFocusSets('attention-item', { focusSet: 'test-focus' });

      core.memory.focus.setFocus('test-focus');
      const items = core.memory.focus.getFocusItems(5);
      expect(Array.isArray(items)).toBe(true);
    });
  });

  describe('Query Optimization', () => {
    test('query by priority', () => {
      core.memory.set('high-priority', { content: 'high' }, { priority: 9 });
      core.memory.set('medium-priority', { content: 'medium' }, { priority: 6 });
      core.memory.set('low-priority', { content: 'low' }, { priority: 3 });

      const results = core.memory.query({ minPriority: 8, limit: 5 });
      expect(results.length).toBeGreaterThan(0);
    });

    test('query by type', () => {
      core.memory.set('alert-1', { content: 'alert' }, { type: 'alert' });
      core.memory.set('task-1', { content: 'task' }, { type: 'task' });

      const results = core.memory.query({ type: 'alert', limit: 5 });
      expect(results.length).toBeGreaterThan(0);
    });

    test('query by tags', () => {
      core.memory.set('urgent-item', { content: 'urgent' }, {
        tags: ['urgent', 'system']
      });

      const results = core.memory.query({ tags: ['urgent'], limit: 5 });
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    test('provide memory statistics', () => {
      core.memory.set('stat-test-1', { content: 'test1' });
      core.memory.set('stat-test-2', { content: 'test2' });

      const stats = core.memory.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats.storageSize).toBe('number');
      expect(stats.storageSize).toBeGreaterThan(0);
    });
  });
});