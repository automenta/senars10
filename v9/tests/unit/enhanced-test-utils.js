import createCore from '../../core/orchestration/createCore.js';
import Component from '../../core/base/Component.js';
import { Reasoner } from '../../core/Reasoner.js';

export const createCoreWithLifecycle = async (config = {}) => {
  const core = await createCore(config);
  return {
    core,
    async cleanup() {
      await core.stop();
      await core.destroy();
    }
  };
};

export const withCoreLifecycle = (testFn) => {
  return async () => {
    const { core, cleanup } = await createCoreWithLifecycle();
    try {
      await testFn(core);
    } finally {
      await cleanup();
    }
  };
};

export const createTestComponent = (overrides = {}) => {
  class TestComponent extends Component {
    constructor() {
      super();
      this.errorTriggered = false;
      this.initializeError = null;
      this.startError = null;
      this.stopError = null;
      this.destroyError = null;
      this.customProps = {};
    }

    _doInitialize = async (config) => {
      if (this.initializeError) throw this.initializeError;
      Object.assign(this.customProps, overrides);
    };

    _doStart = async () => {
      if (this.startError) throw this.startError;
    };

    _doStop = async () => {
      if (this.stopError) throw this.stopError;
    };

    _doDestroy = async () => {
      if (this.destroyError) throw this.destroyError;
    };

    triggerError = (phase, error) => {
      this[`${phase}Error`] = error;
    };
  }

  return new TestComponent();
};

export const lifecycleTransitions = [
  { method: 'initialize', from: 'uninitialized', to: 'initialized', args: [{}] },
  { method: 'start', from: 'initialized', to: 'running', args: [] },
  { method: 'stop', from: 'running', to: 'stopped', args: [] },
  { method: 'destroy', from: 'stopped', to: 'destroyed', args: [] },
];

export const testLifecycleTransitions = (componentFactory) => {
  lifecycleTransitions.forEach(({ method, from, to, args }) => {
    test(`${method} should transition from ${from} to ${to}`, async () => {
      const component = componentFactory();

      // Navigate to the 'from' state
      for (const transition of lifecycleTransitions) {
        if (transition.method === method) break;
        await component[transition.method](...(transition.args || [{}]));
      }

      await component[method](...args);
      expect(component.getStatus().status).toBe(to);
    });
  });
};

export const createTestData = {
  tasks: {
    simple: { content: 'test task', priority: 5 },
    urgent: { content: 'urgent task', priority: 10 },
    low: { content: 'low priority task', priority: 1 },
  },

  rules: {
    simple: {
      name: 'test-rule',
      condition: (ctx) => ctx?.term?.name === 'A',
      action: (ctx) => ({ result: 'B' }),
      priority: 5
    },
    complex: {
      name: 'complex-rule',
      type: 'inference',
      complexity: 'complex',
      condition: (ctx) => ctx?.priority > 5,
      action: (ctx) => ({ result: 'high-priority' }),
      priority: 8
    }
  },

  memoryItems: {
    alert: {
      key: 'alert-1',
      value: { content: 'system alert', type: 'alert' },
      options: { type: 'alert', tags: ['system'], priority: 10 }
    },
    task: {
      key: 'task-1',
      value: { content: 'scheduled task', type: 'task' },
      options: { type: 'task', tags: ['scheduled'], priority: 5 }
    }
  }
};

export const performanceThresholds = {
  ruleEvaluation: 50,
  memoryOperation: 10,
  componentLifecycle: 100,
  bulkOperation: 1000,
};

export const measurePerformance = async (operation) => {
  const start = Date.now();
  await operation();
  return Date.now() - start;
};

export const expectPerformance = (actualTime, threshold) => {
  expect(actualTime).toBeLessThan(threshold);
};

// Common test patterns
export const testErrorHandling = (operation, error, expectedError) => {
  test(`should handle ${error.name} errors`, async () => {
    const component = createTestComponent();
    component.triggerError('initialize', error);
    await expect(operation(component)).rejects.toThrow(expectedError || error.message);
  });
};

export const testPerformanceThreshold = (operation, threshold, description) => {
  test(`should meet performance threshold: ${description}`, async () => {
    const time = await measurePerformance(operation);
    expectPerformance(time, threshold);
  });
};

// Common assertion helpers
export const expectToHaveStatus = (component, expectedStatus) => {
  expect(component.getStatus().status).toBe(expectedStatus);
};

// Core lifecycle management utilities
export const setupCore = async (config = {}) => {
  const core = await createCore(config);
  core.reasoner = new Reasoner();
  await core.reasoner.initialize();
  core.memory.reasoner = core.reasoner;
  return { core };
};

export const teardownCore = async (core) => {
  if (core) {
    await core.stop();
    await core.destroy();
  }
};

export const withCoreSetup = (testFn) => {
  return async (...args) => {
    const { core } = await setupCore();
    try {
      return await testFn(core, ...args);
    } finally {
      await teardownCore(core);
    }
  };
};

export const expectToBeHealthy = (component) => {
  const health = component.getHealth();
  expect(health.status).toBe('healthy');
  expect(health.issues).toEqual([]);
};


// Common test data factories
export const createTestRules = {
  simple: (overrides = {}) => ({
    name: 'test-rule',
    condition: (ctx) => ctx?.term?.name === 'A',
    action: (ctx) => ({ result: 'B' }),
    priority: 5,
    ...overrides
  }),

  deduction: (condition, action, priority = 10) => ({
    name: `deduction-${Date.now()}`,
    condition,
    action,
    priority,
    type: 'inference',
    complexity: 'simple'
  }),

  cognitive: (type, complexity = 'simple') => ({
    name: `${type}-${Date.now()}`,
    type,
    complexity,
    condition: (ctx) => true,
    action: (ctx) => ({ result: `${type}-processed` }),
    priority: 5
  })
};

// Counter for unique key generation
let itemCounter = 0;

export const createTestMemoryItems = {
  task: (content, priority = 5) => {
    itemCounter++;
    return {
      key: `task-${Date.now()}-${itemCounter}`,
      value: { content, type: 'task' },
      options: { type: 'task', tags: ['test'], priority }
    };
  },

  observation: (sensor, value, confidence = 0.9) => {
    itemCounter++;
    return {
      key: `obs-${Date.now()}-${itemCounter}`,
      value: { sensor, value, type: 'observation' },
      options: { type: 'observation', tags: ['test'], priority: Math.floor(confidence * 10) }
    };
  },

  pattern: (patternData, confidence = 0.8) => {
    itemCounter++;
    return {
      key: `pattern-${Date.now()}-${itemCounter}`,
      value: { pattern: patternData, type: 'pattern' },
      options: { type: 'pattern', tags: ['analysis'], priority: Math.floor(confidence * 10) }
    };
  }
};

// Common assertion patterns
export const expectRuleFired = (result, expectedResult) => {
  expect(result).toBeDefined();
  expect(result.result).toBe(expectedResult);
};

export const expectMemoryItem = (memory, key, expectedValue) => {
  const item = memory.get(key);
  expect(item).toBeDefined();
  expect(item).toEqual(expectedValue);
};

export const expectPerformanceWithin = (actualTime, threshold) => {
  expect(actualTime).toBeLessThan(threshold);
};

// Bulk test operations
export const testBulkOperations = async (operation, itemCount, operationName) => {
  const startTime = Date.now();

  await measurePerformance(async () => {
    for (let i = 0; i < itemCount; i++) {
      await operation(i);
    }
  });

  const totalTime = Date.now() - startTime;
  expectPerformanceWithin(totalTime, performanceThresholds.bulkOperation);

  return totalTime;
};

// Common test scenarios
export const cognitiveCycleScenarios = {
  perception: (core) => {
    const rule = createTestRules.cognitive('perception');
    rule.condition = (ctx) => ctx.inputType === 'observation' && ctx.confidence > 0.7;
    rule.action = (ctx) => {
      core.memory.set(`obs-${Date.now()}`, ctx.observation, {
        type: 'observation',
        tags: ['perceived'],
        priority: Math.floor(ctx.confidence * 10)
      });
      return { result: 'perception-processed', stored: true };
    };
    core.rules.add(rule);

    return {
      input: {
        inputType: 'observation',
        confidence: 0.9,
        observation: { sensor: 'test', value: 100 }
      },
      expectedResult: 'perception-processed'
    };
  },

  patternRecognition: (core) => {
    const rule = createTestRules.cognitive('reasoning', 'complex');
    rule.condition = (ctx) => ctx.dataType === 'pattern' && ctx.size > 50;
    rule.action = (ctx) => {
      const insights = {
        pattern: ctx.pattern,
        confidence: ctx.confidence,
        implications: ['trend-detected'],
        generatedAt: new Date().toISOString()
      };

      core.memory.set(`insight-${Date.now()}`, insights, {
        type: 'insight',
        tags: ['pattern', 'analysis'],
        priority: 8
      });

      return { result: 'reasoning-processed', insights };
    };
    core.rules.add(rule);

    return {
      input: {
        dataType: 'pattern',
        size: 120,
        pattern: { type: 'trend', direction: 'up' }
      },
      expectedResult: 'reasoning-processed'
    };
  },

  decision: (core) => {
    const rule = createTestRules.cognitive('decision');
    rule.condition = (ctx) => ctx.requiresAction && ctx.urgency > 7;
    rule.action = (ctx) => ({
      result: 'decision-made',
      decision: { action: ctx.recommendedAction }
    });
    core.rules.add(rule);

    return {
      input: {
        requiresAction: true,
        urgency: 9,
        recommendedAction: 'test-action'
      },
      expectedResult: 'decision-made'
    };
  }
};
