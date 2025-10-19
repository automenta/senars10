/**
 * @file baseTestUtils.js
 * @description Base test utilities to support common testing patterns across test files
 */

import {NAR} from '../../src/nar/NAR.js';
import {Truth} from '../../src/Truth.js';
import {createTestNAR, createTask, createTerm, createTruth, TEST_CONSTANTS} from './factories.js';

/**
 * Base test setup for NAR integration tests
 * Provides consistent initialization and cleanup for NAR instances
 */
export class NARTestSetup {
  constructor(config = {}) {
    this.config = {
      debug: {enabled: false},
      cycle: {delay: 10, maxTasksPerCycle: 5},
      ...config
    };
    this.nar = null;
  }

  async setup() {
    this.nar = new NAR(this.config);
    return this.nar;
  }

  teardown() {
    if (this.nar && this.nar.isRunning) {
      this.nar.stop();
    }
  }

  async reset() {
    if (this.nar) {
      this.nar.reset();
    }
  }
}

/**
 * Base test setup for component unit tests
 * Provides common initialization and utility methods
 */
export class ComponentTestSetup {
  constructor(ComponentClass, defaultConfig = {}) {
    this.ComponentClass = ComponentClass;
    this.defaultConfig = defaultConfig;
    this.instance = null;
  }

  setup(config = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    this.instance = new this.ComponentClass(finalConfig);
    return this.instance;
  }

  teardown() {
    this.instance = null;
  }
}

/**
 * Common test assertions for truth values
 */
export const truthAssertions = {
  /**
   * Asserts that a truth value matches expected values within epsilon
   */
  expectTruthCloseTo: (actual, expectedF, expectedC, precision = 5) => {
    expect(actual.f).toBeCloseTo(expectedF, precision);
    expect(actual.c).toBeCloseTo(expectedC, precision);
  },

  /**
   * Asserts truth equality using the equals method
   */
  expectTruthEquals: (actual, expected) => {
    expect(actual.equals(expected)).toBe(true);
  },

  /**
   * Asserts truth expectation value
   */
  expectTruthExpectation: (truth, expectedValue, precision = 5) => {
    const calculated = truth.f * (truth.c - 0.5) + 0.5;
    expect(calculated).toBeCloseTo(expectedValue, precision);
  }
};

/**
 * Common test assertions for tasks
 */
export const taskAssertions = {
  /**
   * Asserts that a task has the expected properties
   */
  expectTask: (task, expected) => {
    if (expected.term) expect(task.term).toEqual(expected.term);
    if (expected.type) expect(task.type).toBe(expected.type);
    if (expected.truth) expect(task.truth).toEqual(expected.truth);
    if (expected.budget) expect(task.budget).toEqual(expected.budget);
    if (expected.stamp) expect(task.stamp).toEqual(expected.stamp);
  },

  /**
   * Asserts that a task is of a specific type
   */
  expectTaskType: (task, type) => {
    switch (type.toUpperCase()) {
      case 'BELIEF':
        expect(task.isBelief()).toBe(true);
        break;
      case 'GOAL':
        expect(task.isGoal()).toBe(true);
        break;
      case 'QUESTION':
        expect(task.isQuestion()).toBe(true);
        break;
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  },

  /**
   * Asserts task punctuation
   */
  expectTaskPunctuation: (task, punctuation) => {
    const expectedType = punctuation === '.' ? 'BELIEF' : 
                         punctuation === '!' ? 'GOAL' : 
                         punctuation === '?' ? 'QUESTION' : '';
    expect(task.punctuation).toBe(punctuation);
    expect(task.type).toBe(expectedType);
  },

  /**
   * Finds a task by term in a collection
   */
  findTaskByTerm: (tasks, searchTerm) => {
    return tasks.find(t => 
      t.term.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.term.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
};

/**
 * Common test assertions for memory and concepts
 */
export const memoryAssertions = {
  /**
   * Asserts that a concept contains expected tasks
   */
  expectConceptContains: (concept, expectedTerm) => {
    expect(concept).toBeDefined();
    expect(concept.term).toBeDefined();
    expect(concept.term.toString().toLowerCase()).toContain(expectedTerm.toLowerCase());
  },

  /**
   * Asserts that memory contains a specific number of concepts
   */
  expectMemoryConcepts: (memory, expectedCount) => {
    const allConcepts = memory.getAllConcepts();
    expect(allConcepts.length).toBe(expectedCount);
  },

  /**
   * Asserts that a memory contains tasks with a specific term
   */
  expectMemoryContainsTerm: (memory, termName) => {
    const concepts = memory.getAllConcepts();
    const matchingConcept = concepts.find(c => 
      c.term.toString().toLowerCase().includes(termName.toLowerCase())
    );
    expect(matchingConcept).toBeDefined();
  }
};

/**
 * Common test patterns for initialization
 */
export const initializationTests = {
  /**
   * Runs standard initialization tests for a class
   */
  standardInitialization: (Constructor, requiredParams, defaultValues = {}) => {
    test('initializes with required parameters', () => {
      const instance = new Constructor(requiredParams);
      expect(instance).toBeDefined();
      Object.entries(defaultValues).forEach(([key, value]) => {
        if (value !== undefined) {
          expect(instance[key]).toEqual(value);
        }
      });
    });

    test('is immutable where applicable', () => {
      const instance = new Constructor(requiredParams);
      if (typeof instance._isImmutable === 'boolean' && instance._isImmutable) {
        // Test a few properties to see if they throw when modified
        const testProperty = Object.keys(instance).find(key => 
          key.startsWith('_') || key === 'f' || key === 'c' || key === 'term'
        );
        if (testProperty && instance[testProperty] !== undefined) {
          expect(() => {
            instance[testProperty] = 'modified';
          }).toThrow();
        }
      }
    });
  },

  /**
   * Tests constructor with various valid parameter combinations
   */
  parameterizedInitialization: (Constructor, validParamsList) => {
    test.each(validParamsList.map((params, i) => [i, params]))(
      'initializes correctly with params set %i',
      (index, params) => {
        const instance = new Constructor(params);
        expect(instance).toBeDefined();
      }
    );
  }
};

/**
 * Common test patterns for equality methods
 */
export const equalityTests = {
  /**
   * Tests equality method with standard test cases
   */
  standardEquality: (instance, equalInstance, differentInstance) => {
    test('equals method works for identical instances', () => {
      expect(instance.equals(equalInstance)).toBe(true);
      expect(equalInstance.equals(instance)).toBe(true);
    });

    if (differentInstance) {
      test('equals method returns false for different instances', () => {
        expect(instance.equals(differentInstance)).toBe(false);
        expect(differentInstance.equals(instance)).toBe(false);
      });
    }

    test('equals method returns false for null/undefined', () => {
      expect(instance.equals(null)).toBe(false);
      expect(instance.equals(undefined)).toBe(false);
    });
  },

  /**
   * Tests reflexivity, symmetry, and transitivity of equals method
   */
  runEqualityLaws: (objA, objB, objC) => {
    // Test reflexivity
    expect(objA.equals(objA)).toBe(true);

    // Test symmetry
    if (objA.equals(objB)) {
      expect(objB.equals(objA)).toBe(true);
    }

    // Test transitivity
    if (objA.equals(objB) && objB.equals(objC)) {
      expect(objA.equals(objC)).toBe(true);
    }
  }
};

/**
 * Common test patterns for string representations
 */
export const stringRepresentationTests = {
  /**
   * Tests toString method with expected string
   */
  verifyToString: (instance, expectedString) => {
    expect(instance.toString()).toBe(expectedString);
  },

  /**
   * Tests string representation consistency
   */
  verifyToStringConsistency: (instance, expectedPattern) => {
    const str = instance.toString();
    expect(str).toMatch(expectedPattern);
    // Test that it's consistent across multiple calls
    expect(instance.toString()).toBe(str);
  }
};

/**
 * Common test patterns for error handling
 */
export const errorHandlingTests = {
  /**
   * Tests that invalid inputs throw appropriate errors
   */
  standardErrorHandling: (testFunction, invalidInputs, errorType = Error) => {
    test.each(invalidInputs.map(input => [input]))(
      'throws error for invalid input: %s',
      (invalidInput) => {
        expect(() => testFunction(invalidInput)).toThrow(errorType);
      }
    );
  },

  /**
   * Tests async error handling
   */
  asyncErrorHandling: async (testFunction, invalidInputs, errorType = Error) => {
    for (const invalidInput of invalidInputs) {
      await expect(testFunction(invalidInput)).rejects.toThrow(errorType);
    }
  },

  /**
   * Tests error message content
   */
  errorWithMessage: (testFunction, invalidInput, expectedMessage) => {
    expect(() => testFunction(invalidInput)).toThrow(expectedMessage);
  }
};

/**
 * Common test patterns for async operations
 */
export const asyncTests = {
  /**
   * Tests async operations with timeout
   */
  asyncWithTimeout: async (asyncOperation, timeoutMs = 5000) => {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Test timeout')), timeoutMs)
    );
    
    const result = await Promise.race([
      asyncOperation(),
      timeoutPromise
    ]);
    
    return result;
  },

  /**
   * Tests promise resolution
   */
  expectPromiseResolved: async (promise) => {
    await expect(promise).resolves.toBeDefined();
  },

  /**
   * Tests promise rejection
   */
  expectPromiseRejected: async (promise) => {
    await expect(promise).rejects.toBeDefined();
  }
};

/**
 * Common test data generators
 */
export const testData = {
  /**
   * Gets common truth values for testing
   */
  getCommonTruthValues: () => [
    { f: 1.0, c: 1.0, name: 'certain' },
    { f: 0.9, c: 0.9, name: 'high' },
    { f: 0.5, c: 0.8, name: 'medium' },
    { f: 0.1, c: 0.2, name: 'low' },
    { f: 0.0, c: 0.1, name: 'false' }
  ],

  /**
   * Gets common budget values for testing
   */
  getCommonBudgetValues: () => [
    { priority: 0.9, durability: 0.8, quality: 0.7, name: 'high' },
    { priority: 0.5, durability: 0.5, quality: 0.5, name: 'medium' },
    { priority: 0.1, durability: 0.2, quality: 0.3, name: 'low' }
  ],

  /**
   * Gets common term names for testing
   */
  getCommonTermNames: () => [
    'cat', 'dog', 'animal', 'person', 'object', 'concept', 'thing', 'item'
  ],

  /**
   * Gets common compound term patterns
   */
  getCommonCompoundTerms: () => [
    ['(&, A, B)', '&', ['A', 'B']],
    ['(|, A, B)', '|', ['A', 'B']],
    ['(-->, A, B)', '-->', ['A', 'B']],
    ['(<->, A, B)', '<->', ['A', 'B']]
  ]
};

/**
 * Provides common test scenarios for NAR integration tests
 */
export const narTestScenarios = {
  /**
   * Tests basic input processing for different statement types
   */
  testBasicInputProcessing: async (nar, input, expectedType) => {
    const result = await nar.input(input);
    expect(result).toBe(true);

    let storage;
    switch (expectedType.toLowerCase()) {
      case 'belief':
        storage = nar.getBeliefs();
        break;
      case 'goal':
        storage = nar.getGoals();
        break;
      case 'question':
        storage = nar.getQuestions();
        break;
      default:
        throw new Error(`Unknown expected type: ${expectedType}`);
    }

    expect(storage.length).toBeGreaterThan(0);
    const task = storage.find(t => t.term.toString().includes(input.replace(/[^\w\s]/g, '')) || 
                                      t.term.toString().includes(input.split(/[^\w]/)[0]));
    expect(task).toBeDefined();
    expect(task.type).toBe(expectedType.toUpperCase());
  },

  /**
   * Tests compound term processing
   */
  testCompoundTermProcessing: async (nar, input) => {
    const result = await nar.input(input);
    expect(result).toBe(true);

    const beliefs = nar.getBeliefs();
    const compoundBelief = beliefs.find(b => 
      b.term.toString().includes('&') || 
      b.term.toString().includes('|') || 
      b.term.toString().includes('-->') || 
      b.term.toString().includes('==>')
    );
    
    expect(compoundBelief).toBeDefined();
  },

  /**
   * Tests system lifecycle operations
   */
  testSystemLifecycle: async (nar) => {
    expect(nar.isRunning).toBe(false);

    const started = nar.start();
    expect(started).toBe(true);
    expect(nar.isRunning).toBe(true);

    const stopped = nar.stop();
    expect(stopped).toBe(true);
    expect(nar.isRunning).toBe(false);

    // Test reset functionality
    await nar.input('test.');
    expect(nar.getBeliefs().length).toBeGreaterThan(0);
    
    nar.reset();
    expect(nar.getBeliefs().length).toBe(0);
  }
};

/**
 * Waits for a condition to be true with timeout
 */
export const waitForCondition = async (condition, timeoutMs = 1000, intervalMs = 10) => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (condition()) {
        clearInterval(interval);
        resolve();
      }
    }, intervalMs);
    
    setTimeout(() => {
      clearInterval(interval);
      reject(new Error('Timeout waiting for condition'));
    }, timeoutMs);
  });
};

/**
 * Runs performance tests with time measurement
 */
export const runPerformanceTest = async (testFn, maxDurationMs = 5000, description = 'Performance test') => {
  const startTime = Date.now();
  const result = await testFn();
  const duration = Date.now() - startTime;
  
  expect(duration).toBeLessThan(maxDurationMs);
  console.log(`${description} completed in ${duration}ms`);
  
  return result;
};

/**
 * Common test patterns for parameterized tests
 */
export const parameterizedTests = {
  /**
   * Run tests with multiple parameter combinations
   */
  runWithParams: (testCases, testFn) => {
    test.each(testCases.map((testCase, i) => [i, testCase]))(
      'test case %i: %s',
      (index, testCase) => {
        testFn(testCase);
      }
    );
  },

  /**
   * Run async tests with multiple parameter combinations
   */
  runAsyncWithParams: async (testCases, testFn) => {
    for (const [index, testCase] of testCases.entries()) {
      await test(`${index}: ${JSON.stringify(testCase)}`, () => testFn(testCase));
    }
  }
};