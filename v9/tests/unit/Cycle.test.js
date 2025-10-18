/**
 * @file: tests/unit/Cycle.test.js
 * @description: Unit tests for the Cycle component.
 */

import { jest } from '@jest/globals';
import Cycle from '../../core/orchestration/Cycle.js';

describe('Cycle Component', () => {
  let cycle;
  let mockCore;

  beforeEach(() => {
    jest.useFakeTimers();
    cycle = new Cycle();

    mockCore = {
      config: {
        get: jest.fn().mockReturnValue(10), // focusSetSize
      },
      memory: {
        getAllTasks: jest.fn().mockReturnValue([]),
        consolidate: jest.fn().mockResolvedValue(),
      },
      reasoner: {
        reason: jest.fn().mockResolvedValue([]),
      },
    };

    cycle.core = mockCore;
    cycle.initialize({ cycleIntervalMs: 50 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should initialize with correct interval', () => {
    expect(cycle.cycleIntervalMs).toBe(50);
  });

  test('should start and run the cycle loop', async () => {
    const runCycleSpy = jest.spyOn(cycle, '_runCycle');
    await cycle.start();
    expect(cycle.isRunning).toBe(true);
    expect(cycle.cycleTimer).not.toBeNull();

    jest.advanceTimersByTime(100); // Advance time by 2 cycles

    expect(runCycleSpy).toHaveBeenCalledTimes(2);
    runCycleSpy.mockRestore();
  });

  test('should stop the cycle loop', async () => {
    await cycle.start();
    await cycle.stop();
    expect(cycle.isRunning).toBe(false);
    expect(cycle.cycleTimer).toBeNull();
  });

  test('_runCycle should call memory, reasoner, and other phases', async () => {
    const focusSet = [{ id: 'task1' }];
    mockCore.memory.getAllTasks.mockReturnValue(focusSet);

    await cycle._runCycle();

    expect(mockCore.memory.getAllTasks).toHaveBeenCalled();
    expect(mockCore.reasoner.reason).toHaveBeenCalledWith(focusSet);
    expect(mockCore.memory.consolidate).toHaveBeenCalled();
  });

  test('_selectFocusSet should select tasks from memory', async () => {
    const tasks = [
      { term: { hash: 'task1' }, createdAt: 100 },
      { term: { hash: 'task2' }, createdAt: 200 },
    ];
    mockCore.memory.getAllTasks.mockReturnValue(tasks);

    const focusSet = await cycle._selectFocusSet();

    expect(focusSet.length).toBe(2);
    expect(focusSet[0].term.hash).toBe('task2'); // Should be sorted by createdAt descending
  });
});