/**
 * @file generalTestSuites.js
 * @description General-purpose reusable test suites to reduce duplication across test files
 */

import {
    comprehensiveTestSuites,
    equalityTests,
    errorHandlingTests,
    flexibleAssertions,
    initializationTests,
    memoryAssertions,
    runPerformanceTest,
    stringRepresentationTests,
    taskAssertions,
    truthAssertions
} from './baseTestUtils.js';

/**
 * Standard test suite for data models with basic properties and immutability
 * @param {string} modelName - Name of the model for test descriptions
 * @param {Function} Constructor - Constructor function or class
 * @param {Object} testData - Test data containing validInput, expectedProperties, etc.
 * @param {boolean} testImmutability - Whether to test immutability
 * @param {boolean} testEquality - Whether to test equality methods
 */
export const dataModelTestSuite = (modelName, Constructor, testData, testImmutability = true, testEquality = true) => {
    describe(`${modelName} Data Model Tests`, () => {
        test('should create instance with provided data', () => {
            const instance = new Constructor(testData.validInput);
            expect(instance).toBeDefined();

            // Check that properties match input data
            Object.entries(testData.expectedProperties || {}).forEach(([key, value]) => {
                if (typeof value === 'number') {
                    flexibleAssertions.expectCloseTo(instance[key], value, testData.tolerance || 0.01, `property ${key}`);
                } else {
                    expect(instance[key]).toEqual(value);
                }
            });
        });

        test('should have expected string representation', () => {
            const instance = new Constructor(testData.validInput);
            if (testData.expectedString) {
                stringRepresentationTests.verifyToString(instance, testData.expectedString);
            }
        });

        if (testImmutability) {
            test('should be immutable', () => {
                const instance = new Constructor(testData.validInput);
                // Check if the object has immutability markers
                if (typeof instance._isImmutable === 'boolean' && instance._isImmutable) {
                    const firstKey = Object.keys(instance).find(key =>
                        key.startsWith('_') || ['f', 'c', 'term'].includes(key)
                    );
                    if (firstKey && instance[firstKey] !== undefined) {
                        expect(() => {
                            instance[firstKey] = 'modified';
                        }).toThrow();
                    }
                }
            });
        }

        if (testEquality) {
            test('should implement equality correctly', () => {
                const instance1 = new Constructor(testData.validInput);
                const instance2 = new Constructor(testData.validInput);
                const instance3 = new Constructor(testData.differentInput || testData.validInput);

                expect(instance1.equals(instance2)).toBe(true);
                if (testData.differentInput) {
                    expect(instance1.equals(instance3)).toBe(false);
                }
            });
        }
    });
};

/**
 * Test suite for classes with initialization parameters
 * @param {string} className - Name of the class for test descriptions
 * @param {Function} Constructor - Constructor function or class
 * @param {Object} requiredParams - Required parameters for initialization
 * @param {Object} defaultValues - Expected default values after initialization
 */
export const initializationTestSuite = (className, Constructor, requiredParams, defaultValues = {}) => {
    describe(`${className} Initialization Tests`, () => {
        initializationTests.standardInitialization(Constructor, requiredParams, defaultValues);
    });
};

/**
 * Test suite for classes with equality methods
 * @param {string} className - Name of the class for test descriptions
 * @param {Object} instance - Instance to test
 * @param {Object} equalInstance - Equal instance for comparison
 * @param {Object} differentInstance - Different instance for comparison
 */
export const equalityTestSuite = (className, instance, equalInstance, differentInstance) => {
    describe(`${className} Equality Tests`, () => {
        equalityTests.standardEquality(instance, equalInstance, differentInstance);
    });
};

/**
 * Test suite for error handling in constructors and methods
 * @param {string} className - Name of the class for test descriptions
 * @param {Function} testFunction - Function to test for errors
 * @param {Array} invalidInputs - Array of invalid inputs to test
 * @param {Function} errorType - Expected error type (default: Error)
 */
export const errorHandlingTestSuite = (className, testFunction, invalidInputs, errorType = Error) => {
    describe(`${className} Error Handling Tests`, () => {
        errorHandlingTests.standardErrorHandling(testFunction, invalidInputs, errorType);
    });
};

/**
 * Test suite for truth value classes (like Truth.js)
 * @param {Object} truthValue - Truth value instance to test
 * @param {number} expectedF - Expected frequency
 * @param {number} expectedC - Expected confidence
 * @param {number} tolerance - Tolerance for floating point comparisons
 */
export const truthValueTestSuite = (truthValue, expectedF, expectedC, tolerance = 0.01) => {
    describe('Truth Value Tests', () => {
        test('frequency and confidence match expected values', () => {
            flexibleAssertions.expectCloseTo(truthValue.f, expectedF, tolerance, 'frequency');
            flexibleAssertions.expectCloseTo(truthValue.c, expectedC, tolerance, 'confidence');
        });

        test('expectation calculation is correct', () => {
            const expected = expectedF * (expectedC - 0.5) + 0.5;
            truthAssertions.expectTruthExpectation(truthValue, expected, 5);
        });

        test('truth equality within tolerance', () => {
            const similarTruth = new (Object.getPrototypeOf(truthValue).constructor)(expectedF, expectedC);
            expect(truthValue.equals(similarTruth)).toBe(true);
        });
    });
};

/**
 * Test suite for task-related classes
 * @param {Object} task - Task instance to test
 * @param {Object} expectedData - Expected task data
 */
export const taskTestSuite = (task, expectedData) => {
    describe('Task Tests', () => {
        test('task properties match expected values', () => {
            if (expectedData.term) {
                expect(task.term.toString()).toBe(expectedData.term.toString());
            }
            if (expectedData.type) {
                taskAssertions.expectTaskType(task, expectedData.type);
            }
            if (expectedData.truth) {
                truthAssertions.expectTruthEquals(task.truth, expectedData.truth);
            }
            if (expectedData.budget) {
                expect(task.budget).toEqual(expectedData.budget);
            }
        });

        test('task string representation is correct', () => {
            if (expectedData.expectedString) {
                stringRepresentationTests.verifyToString(task, expectedData.expectedString);
            }
        });
    });
};

/**
 * Test suite for classes with lifecycle methods (start, stop, reset, etc.)
 * @param {string} componentName - Name of the component for test descriptions
 * @param {Function} createComponent - Function to create the component instance
 * @param {Object} config - Configuration for the component
 */
export const lifecycleComponentTestSuite = (componentName, createComponent, config = {}) => {
    describe(`${componentName} Lifecycle Tests`, () => {
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
};

/**
 * Performance test suite for operations that need to meet timing requirements
 * @param {string} operationName - Name of the operation for test descriptions
 * @param {Function} operation - Async function to test for performance
 * @param {number} maxDurationMs - Maximum allowed duration in milliseconds
 */
export const performanceTestSuite = (operationName, operation, maxDurationMs = 5000) => {
    describe(`${operationName} Performance Tests`, () => {
        test(`should complete within ${maxDurationMs}ms`, async () => {
            await runPerformanceTest(operation, maxDurationMs, `${operationName} performance test`);
        });
    });
};

/**
 * Flexible assertion test suite that uses tolerance-based comparisons for numeric values
 * @param {string} testName - Name of the test for descriptions
 * @param {Object} actual - Actual object to test
 * @param {Object} expected - Expected object to compare against
 * @param {number} tolerance - Tolerance for numeric comparisons
 */
export const flexibleAssertionTestSuite = (testName, actual, expected, tolerance = 0.01) => {
    describe(`${testName} Flexible Assertion Tests`, () => {
        test('object properties match with tolerance', () => {
            flexibleAssertions.expectObjectContainingFlexible(actual, expected, tolerance);
        });

        test('numeric values are within tolerance range', () => {
            Object.entries(expected).forEach(([key, expectedValue]) => {
                if (typeof expectedValue === 'number' && typeof actual[key] === 'number') {
                    flexibleAssertions.expectCloseTo(actual[key], expectedValue, tolerance, `property ${key}`);
                }
            });
        });
    });
};

/**
 * Complete test suite for memory-related operations
 * @param {Object} memory - Memory instance to test
 * @param {Object} config - Memory configuration
 */
export const memoryTestSuite = (memory, config) => {
    describe('Memory Operations Tests', () => {
        test('memory initializes with correct default state', () => {
            expect(memory.concepts).toBeDefined();
            expect(memory.focusConcepts).toBeDefined();
            expect(memory.config).toEqual(config);
        });

        test('memory operations work correctly', () => {
            memoryAssertions.expectMemoryConcepts(memory, memory.getAllConcepts().length);
        });
    });
};

/**
 * Standard test suite for classes that follow common patterns
 * @param {string} className - Name of the class for test descriptions
 * @param {Function} Constructor - Constructor function or class
 * @param {any} requiredParams - Required parameters for initialization
 * @param {Object} defaultValues - Expected default values after initialization
 */
export const standardClassTestSuite = (className, Constructor, requiredParams, defaultValues) => {
    comprehensiveTestSuites.standardClassTests(className, Constructor, requiredParams, defaultValues);
};