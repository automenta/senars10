import {NAR} from '../../src/nar/NAR.js';
import {createTask, createTerm, createTruth, TEST_CONSTANTS} from './factories.js';

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
        const finalConfig = {...this.defaultConfig, ...config};
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
 * Flexible assertion utilities for more robust testing during agile development
 */
export const flexibleAssertions = {
    /**
     * Compares values with configurable tolerance to handle changes in implementation
     */
    expectCloseTo: (actual, expected, tolerance = 0.01, description = '') => {
        const message = description ? ` (${description})` : '';
        const diff = Math.abs(actual - expected);
        expect(diff).toBeLessThanOrEqual(tolerance);
    },

    /**
     * Checks if a value is within expected range (more flexible than exact values)
     */
    expectInRange: (actual, min, max, description = '') => {
        const message = description ? ` (${description})` : '';
        expect(actual).toBeGreaterThanOrEqual(min);
        expect(actual).toBeLessThanOrEqual(max);
    },

    /**
     * Checks if collection has 'at least' a certain number of items (not exact count)
     */
    expectAtLeast: (collection, minCount, description = '') => {
        const count = Array.isArray(collection) ? collection.length : collection.size || collection.length || Object.keys(collection).length;
        const message = description ? ` (${description})` : '';
        expect(count).toBeGreaterThanOrEqual(minCount);
    },

    /**
     * Flexible comparison for objects that allows for implementation changes
     */
    expectObjectContainingFlexible: (actual, expectedSubset, tolerance = 0.01) => {
        Object.entries(expectedSubset).forEach(([key, expectedValue]) => {
            if (typeof expectedValue === 'number' && typeof actual[key] === 'number') {
                // Use tolerance-based comparison for numbers
                const diff = Math.abs(actual[key] - expectedValue);
                expect(diff).toBeLessThanOrEqual(tolerance);
            } else {
                // Use exact comparison for non-numbers
                expect(actual[key]).toEqual(expectedValue);
            }
        });
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
        {f: 1.0, c: 1.0, name: 'certain'},
        {f: 0.9, c: 0.9, name: 'high'},
        {f: 0.5, c: 0.8, name: 'medium'},
        {f: 0.1, c: 0.2, name: 'low'},
        {f: 0.0, c: 0.1, name: 'false'}
    ],

    /**
     * Gets common budget values for testing
     */
    getCommonBudgetValues: () => [
        {priority: 0.9, durability: 0.8, quality: 0.7, name: 'high'},
        {priority: 0.5, durability: 0.5, quality: 0.5, name: 'medium'},
        {priority: 0.1, durability: 0.2, quality: 0.3, name: 'low'}
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
        const task = storage.find(t =>
            t.term.toString().includes(input.replace(/[^\w\s]/g, '')) ||
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

/**
 * Provides comprehensive test suites for different system components
 */
export const comprehensiveTestSuites = {
    /**
     * Standard test suite for classes implementing common patterns like equality, immutability, etc.
     */
    standardClassTests: (className, Constructor, requiredParams, defaultValues, testEquality = true, testImmutability = true) => {
        describe(`${className} Standard Class Tests`, () => {
            initializationTests.standardInitialization(Constructor, requiredParams, defaultValues);

            if (testEquality) {
                describe('Equality Tests', () => {
                    test('self equality', () => {
                        const instance = new Constructor(requiredParams);
                        expect(instance.equals(instance)).toBe(true);
                    });

                    test('null/undefined equality', () => {
                        const instance = new Constructor(requiredParams);
                        expect(instance.equals(null)).toBe(false);
                        expect(instance.equals(undefined)).toBe(false);
                    });
                });
            }

            if (testImmutability) {
                test('immutability validation', () => {
                    const instance = new Constructor(requiredParams);
                    if (typeof instance._isImmutable === 'boolean' && instance._isImmutable) {
                        const testProperty = Object.keys(instance).find(key =>
                            key.startsWith('_') || ['f', 'c', 'term'].includes(key)
                        );
                        if (testProperty && instance[testProperty] !== undefined) {
                            expect(() => {
                                instance[testProperty] = 'modified';
                            }).toThrow();
                        }
                    }
                });
            }
        });
    },

    /**
     * Standard test suite for components with lifecycle methods
     */
    lifecycleComponentTests: (componentName, createComponent, config = {}) => {
        describe(`${componentName} Lifecycle Component Tests`, () => {
            let component;

            beforeEach(() => {
                component = createComponent(config);
            });

            afterEach(() => {
                if (component && typeof component.destroy === 'function') {
                    component.destroy();
                }
            });

            test('initializes correctly', () => {
                expect(component).toBeDefined();
            });

            test('has required lifecycle methods', () => {
                expect(typeof component.start).toBe('function');
                expect(typeof component.stop).toBe('function');
                if (component.reset) {
                    expect(typeof component.reset).toBe('function');
                }
            });
        });
    },

    /**\n   * Test suite for modules that process input and produce output
     */
    inputOutputModuleTests: (moduleName, createModule, testCases) => {
        describe(`${moduleName} Input/Output Module Tests`, () => {
            let module;

            beforeEach(async () => {
                module = await createModule();
            });

            afterEach(() => {
                if (module && typeof module.destroy === 'function') {
                    module.destroy();
                }
            });

            test.each(testCases)('$description', async ({input, expectedOutput, validator}) => {
                const result = await module.process(input);
                if (validator) {
                    expect(validator(result, expectedOutput)).toBe(true);
                } else {
                    expect(result).toEqual(expectedOutput);
                }
            });
        });
    },

    /**
     * Standard test suite for data model classes with basic properties
     */
    dataModelTests: (modelName, Constructor, testData) => {
        describe(`${modelName} Data Model Tests`, () => {
            test('should create instance with provided data', () => {
                const instance = new Constructor(testData.validInput);
                expect(instance).toBeDefined();

                // Check that properties match input data
                Object.entries(testData.expectedProperties).forEach(([key, value]) => {
                    expect(instance[key]).toEqual(value);
                });
            });

            test('should have expected string representation', () => {
                const instance = new Constructor(testData.validInput);
                if (testData.expectedString) {
                    expect(instance.toString()).toBe(testData.expectedString);
                }
            });

            if (testData.immutable) {
                test('should be immutable', () => {
                    const instance = new Constructor(testData.validInput);
                    const firstKey = Object.keys(instance)[0];
                    if (firstKey && instance[firstKey] !== undefined) {
                        expect(() => {
                            instance[firstKey] = 'modified';
                        }).toThrow();
                    }
                });
            }

            if (testData.testEquality) {
                test('should implement equality correctly', () => {
                    const instance1 = new Constructor(testData.validInput);
                    const instance2 = new Constructor(testData.validInput);
                    const instance3 = new Constructor(testData.differentInput || {});

                    expect(instance1.equals(instance2)).toBe(true);
                    if (testData.differentInput) {
                        expect(instance1.equals(instance3)).toBe(false);
                    }
                });
            }
        });
    }
};

/**
 * Utilities for more robust NAR and integration testing during agile development
 */
export const robustNARTests = {
    /**
     * Run NAR tests with flexible timing to handle different system speeds
     */
    runWithFlexibleTiming: async (narOperation, maxDurationMs = 10000, description = 'NAR operation') => {
        const startTime = Date.now();
        const result = await narOperation();
        const duration = Date.now() - startTime;

        expect(duration).toBeLessThanOrEqual(maxDurationMs);

        return result;
    },

    /**
     * Check for expected results with retry logic to handle async operations
     */
    expectWithRetry: async (checkFn, maxRetries = 10, intervalMs = 100, description = 'Expectation check') => {
        for (let i = 0; i < maxRetries; i++) {
            try {
                await checkFn();
                return; // Success, exit early
            } catch (error) {
                if (i === maxRetries - 1) {
                    // Last attempt, throw the error
                    throw error;
                }
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, intervalMs));
            }
        }
    },

    /**
     * Look for expected results with flexible matching (find what we expect rather than exact matching)
     */
    findExpectedResult: (collection, matcherFn, description = 'Expected result') => {
        const result = Array.isArray(collection) ? collection.find(matcherFn) :
            Array.from(collection).find(matcherFn);
        if (!result) {
            const collectionDesc = Array.isArray(collection) ? collection.length : collection.size;
            throw new Error(`Could not find ${description} in collection with ${collectionDesc} items`);
        }
        return result;
    }
};

/**
 * Common test pattern for property immutability
 * @param {Object} instance - The instance to test
 * @param {Object} properties - Object with {propertyName: value} pairs to attempt to modify
 * @returns {void}
 */
export const testImmutability = (instance, properties) => {
    Object.keys(properties).forEach(propertyName => {
        expect(() => {
            instance[propertyName] = properties[propertyName];
        }).toThrow();
    });
};

/**
 * Common test pattern for equality methods
 * @param {*} obj1 - First object to compare
 * @param {*} obj2 - Second object to compare (should be equal to obj1)
 * @param {*} differentObj - Object that should not equal obj1
 * @returns {void}
 */
export const testEqualityMethod = (obj1, obj2, differentObj) => {
    if (obj2 !== undefined) {
        expect(obj1.equals(obj2)).toBe(true);
        expect(obj2.equals(obj1)).toBe(true);
    }
    if (differentObj) {
        expect(obj1.equals(differentObj)).toBe(false);
        expect(differentObj.equals(obj1)).toBe(false);
    }
};

/**
 * Common assertion for object string representations
 * @param {Object} obj - Object to test
 * @param {string} expectedString - Expected string representation
 */
export const testStringRepresentation = (obj, expectedString) => {
    expect(obj.toString()).toBe(expectedString);
};

/**
 * Common setup for memory-related tests
 * @returns {Object} An object with memory, config, and helper functions
 */
export const setupMemoryTest = () => {
    const config = createMemoryConfig();
    return {
        config,
        createTask,
        createTerm,
        createTruth,
        TEST_CONSTANTS
    };
};

// Exporting common test data
export const COMMON_TRUTH_VALUES = [
    {f: 1.0, c: 1.0, name: 'certain'},
    {f: 0.9, c: 0.9, name: 'high'},
    {f: 0.5, c: 0.8, name: 'medium'},
    {f: 0.1, c: 0.2, name: 'low'},
    {f: 0.0, c: 0.1, name: 'false'}
];

export const COMMON_BUDGET_VALUES = [
    {priority: 0.9, durability: 0.8, quality: 0.7, name: 'high'},
    {priority: 0.5, durability: 0.5, quality: 0.5, name: 'medium'},
    {priority: 0.1, durability: 0.2, quality: 0.3, name: 'low'}
];