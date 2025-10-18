import Component from '../../core/base/Component.js';
import {
  createTestComponent,
  testLifecycleTransitions,
  expectToHaveStatus,
  expectToBeHealthy
} from './enhanced-test-utils.js';

describe('Component', () => {
  let originalConsoleError;

  beforeEach(() => {
    // Store original console.error and suppress it during tests to keep output clean
    originalConsoleError = console.error;
    console.error = () => {};
  });

  afterEach(() => {
    // Restore original console.error
    console.error = originalConsoleError;
  });

  testLifecycleTransitions(() => createTestComponent());

  test('should provide default health status', () => {
    const component = createTestComponent();
    expectToBeHealthy(component);
  });

  test('should provide empty metrics by default', () => {
    const component = createTestComponent();
    expect(component.getMetrics()).toEqual({});
  });

  test('should provide performance statistics', async () => {
    const component = createTestComponent();
    await component.initialize({});

    const stats = component.getPerformanceStats();
    expect(stats).toHaveProperty('status');
    expect(stats).toHaveProperty('component');
    expect(stats).toHaveProperty('timestamp');
    expect(stats.component).toBe('TestComponent');
  });

  test('should handle errors gracefully during operations', async () => {
    const component = createTestComponent();
    const testError = new Error('Test error');

    component.triggerError('initialize', testError);

    await component.initialize({});
    expectToHaveStatus(component, 'initialized');
  });

  test('should provide health information', () => {
    const component = createTestComponent();
    expectToBeHealthy(component);
  });
});