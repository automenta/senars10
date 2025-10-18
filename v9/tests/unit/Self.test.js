/**
 * @file: tests/unit/Self.test.js
 * @description: Unit tests for the Self component.
 */

import { jest } from '@jest/globals';
import Self from '../../core/system/Self.js';
import Component from '../../core/base/Component.js';

describe('Self Component', () => {
  let self;
  let mockCore;

  beforeEach(() => {
    self = new Self();

    const mockMemory = new Component();
    mockMemory.getMetrics = () => ({ usage: 0.95 });

    const mockCycle = new Component();
    mockCycle.getMetrics = () => ({ avgLatency: 250 });

    mockCore = {
      componentMap: new Map([
        ['memory', mockMemory],
        ['cycle', mockCycle],
      ]),
      messages: {
        emit: jest.fn(),
      },
    };
    self.core = mockCore;
    self.initialize();
  });

  test('getSystemStats should aggregate metrics from all components', () => {
    const stats = self.getSystemStats();
    expect(stats).toHaveProperty('memory');
    expect(stats).toHaveProperty('cycle');
    expect(stats.memory.usage).toBe(0.95);
    expect(stats.cycle.avgLatency).toBe(250);
  });

  test('optimize should emit events for performance issues', async () => {
    await self.optimize();
    expect(mockCore.messages.emit).toHaveBeenCalledWith('system.memory.high_pressure', { usage: 0.95 });
    expect(mockCore.messages.emit).toHaveBeenCalledWith('system.cycle.high_latency', { latency: 250 });
  });

  test('should add and apply a performance rule', async () => {
    const mockRule = jest.fn();
    self.addPerformanceRule(mockRule);
    await self.optimize();
    expect(mockRule).toHaveBeenCalledWith(mockCore, expect.any(Object));
  });

  test('getSystemStats should handle components without getMetrics', () => {
    mockCore.componentMap.set('no-metrics', new Component());
    const stats = self.getSystemStats();
    expect(stats).not.toHaveProperty('no-metrics');
  });
});