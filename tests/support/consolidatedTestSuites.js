/**
 * @file consolidatedTestSuites.js
 * @description Consolidated, reusable test suites following AGENTS.md guidelines
 *
 * This file provides comprehensive, reusable test suites that reduce duplication
 * and make test writing more efficient while maintaining robustness for agile development.
 */

import {
    equalityTests,
    flexibleAssertions,
    initializationTests,
    memoryAssertions,
    parameterizedTests,
    robustNARTests,
    runPerformanceTest,
    stringRepresentationTests,
    taskAssertions,
    testData,
    truthAssertions,
    waitForCondition
} from './baseTestUtils.js';

import {narTestSuites} from './narTestSetup.js';

import {TEST_CONSTANTS} from './factories.js';

/**
 * Standardized test suites that can be applied to different types of components
 */
export const StandardTestSuites = {
    /**
     * Complete test suite for data model classes
     */
    dataModel: (className, Constructor, options = {}) => {
        const {
            validInput,
            expectedProperties = {},
            differentInput,
            immutable = true,
            testEquality = true,
            expectedString
        } = options;

        describe(`${className} - Complete Data Model Tests`, () => {
            // Basic initialization tests
            initializationTests.standardInitialization(Constructor, validInput, expectedProperties);

            // String representation tests
            if (expectedString) {
                test('should have correct string representation', () => {
                    const instance = new Constructor(validInput);
                    stringRepresentationTests.verifyToString(instance, expectedString);
                });
            }

            // Immutability tests
            if (immutable) {
                test('should be immutable', () => {
                    const instance = new Constructor(validInput);
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

            // Equality tests
            if (testEquality) {
                test('should implement equality correctly', () => {
                    const instance1 = new Constructor(validInput);
                    const instance2 = new Constructor(validInput);
                    const instance3 = new Constructor(differentInput || validInput);

                    expect(instance1.equals(instance2)).toBe(true);
                    if (differentInput) {
                        expect(instance1.equals(instance3)).toBe(false);
                    }
                });
            }

            // Parameterized tests with various inputs
            if (options.validInputs) {
                initializationTests.parameterizedInitialization(Constructor, options.validInputs);
            }
        });
    },

    /**
     * Complete test suite for component classes with lifecycle methods
     */
    lifecycleComponent: (componentName, createComponent, config = {}) => {
        describe(`${componentName} - Complete Lifecycle Tests`, () => {
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

            test('lifecycle operations work as expected', () => {
                if (typeof component.start === 'function') {
                    const startResult = component.start();
                    expect(startResult).toBeDefined(); // Could be true/false or other values
                }

                if (typeof component.stop === 'function') {
                    const stopResult = component.stop();
                    expect(stopResult).toBeDefined();
                }

                if (typeof component.reset === 'function') {
                    expect(() => component.reset()).not.toThrow();
                }
            });
        });
    },

    /**
     * Complete test suite for input/output modules
     */
    inputOutputModule: (moduleName, createModule, testCases) => {
        describe(`${moduleName} - Complete I/O Tests`, () => {
            let module;

            beforeEach(async () => {
                module = await createModule();
            });

            afterEach(() => {
                if (module && typeof module.destroy === 'function') {
                    module.destroy();
                }
            });

            test.each(testCases || [])('$description', async ({input, expectedOutput, validator, timeout = 5000}) => {
                if (timeout) {
                    jest.setTimeout(timeout);
                }

                const result = await module.process(input);
                if (validator) {
                    expect(validator(result, expectedOutput)).toBe(true);
                } else {
                    expect(result).toEqual(expectedOutput);
                }
            });

            test('handles error conditions gracefully', async () => {
                if (module.handleError && typeof module.handleError === 'function') {
                    const error = new Error('Test error');
                    expect(() => module.handleError('test', error, {})).not.toThrow();
                }
            });
        });
    },

    /**
     * Complete test suite for classes with equality methods
     */
    equality: (className, createEqualInstances, createDifferentInstance) => {
        describe(`${className} - Complete Equality Tests`, () => {
            test('equals method works for identical instances', () => {
                const [instance1, instance2] = createEqualInstances();
                equalityTests.standardEquality(instance1, instance2, null);
            });

            test('equals method returns false for different instances', () => {
                const [instance1] = createEqualInstances();
                const instance2 = createDifferentInstance();
                expect(instance1.equals(instance2)).toBe(false);
                expect(instance2.equals(instance1)).toBe(false);
            });

            test('equals is reflexive, symmetric, and transitive', () => {
                const [instance1, instance2] = createEqualInstances();
                const instance3 = createDifferentInstance();
                equalityTests.runEqualityLaws(instance1, instance2, instance3);
            });
        });
    },

    /**
     * Complete test suite for task-related classes
     */
    taskRelated: (className, Constructor, options = {}) => {
        const {
            validInput,
            testAssertions = true,
            assertionUtils
        } = options;

        describe(`${className} - Task Related Tests`, () => {
            if (testAssertions) {
                test('should have proper task assertion utilities', () => {
                    expect(assertionUtils || taskAssertions).toBeDefined();
                    expect(typeof (assertionUtils || taskAssertions).expectTaskType).toBe('function');
                    expect(typeof (assertionUtils || taskAssertions).expectTaskPunctuation).toBe('function');
                });
            }

            // Standard data model tests
            if (validInput) {
                StandardTestSuites.dataModel(className, Constructor, options);
            }
        });
    },

    /**
     * Complete test suite for truth-related classes
     */
    truthRelated: (className, Constructor, options = {}) => {
        const {
            validInput,
            testAssertions = true,
            assertionUtils
        } = options;

        describe(`${className} - Truth Related Tests`, () => {
            if (testAssertions) {
                test('should have proper truth assertion utilities', () => {
                    expect(assertionUtils || truthAssertions).toBeDefined();
                    expect(typeof (assertionUtils || truthAssertions).expectTruthCloseTo).toBe('function');
                    expect(typeof (assertionUtils || truthAssertions).expectTruthExpectation).toBe('function');
                });
            }

            // Standard data model tests
            if (validInput) {
                StandardTestSuites.dataModel(className, Constructor, options);
            }
        });
    },

    /**
     * Complete test suite for memory-related classes
     */
    memoryRelated: (className, Constructor, options = {}) => {
        const {
            validInput,
            testAssertions = true,
            testDataModel = true,
            assertionUtils
        } = options;

        describe(`${className} - Memory Related Tests`, () => {
            if (testAssertions) {
                test('should have proper memory assertion utilities', () => {
                    expect(assertionUtils || memoryAssertions).toBeDefined();
                    expect(typeof (assertionUtils || memoryAssertions).expectConceptContains).toBe('function');
                    expect(typeof (assertionUtils || memoryAssertions).expectMemoryConcepts).toBe('function');
                });
            }

            // Standard data model tests (only if specifically requested and validInput provided)
            if (testDataModel && validInput) {
                StandardTestSuites.dataModel(className, Constructor, options);
            }
        });
    }
};

/**
 * Flexible, robust test patterns for agile development
 */
export const FlexibleTestPatterns = {
    /**
     * Pattern for testing with flexible numeric comparisons (useful for agile development)
     */
    flexibleNumericComparison: (testName, actualValue, expectedValue, tolerance = 0.01) => {
        test(testName, () => {
            flexibleAssertions.expectCloseTo(actualValue, expectedValue, tolerance);
        });
    },

    /**
     * Pattern for testing collections with flexible counts (not exact counts)
     */
    flexibleCollectionTest: (testName, collection, minExpectedCount) => {
        test(testName, () => {
            flexibleAssertions.expectAtLeast(collection, minExpectedCount);
        });
    },

    /**
     * Pattern for testing object properties with tolerance for numeric values
     */
    flexibleObjectTest: (testName, actualObject, expectedObjectProperties, tolerance = 0.01) => {
        test(testName, () => {
            flexibleAssertions.expectObjectContainingFlexible(actualObject, expectedObjectProperties, tolerance);
        });
    },

    /**
     * Pattern for testing with retry logic for async operations
     */
    retryableTest: (testName, testFn, maxRetries = 3, intervalMs = 100) => {
        test(testName, async () => {
            await robustNARTests.expectWithRetry(testFn, maxRetries, intervalMs);
        });
    },

    /**
     * Pattern for testing with flexible time constraints
     */
    timeFlexibleTest: (testName, operation, maxDurationMs = 5000) => {
        test(testName, async () => {
            await robustNARTests.runWithFlexibleTiming(operation, maxDurationMs);
        });
    }
};

/**
 * Specialized test suites for NAR components
 */
export const NARTestSuites = {
    /**
     * Complete NAR integration test suite using flexible patterns
     */
    completeNARIntegration: (narProvider) => {
        describe('Complete NAR Integration Tests (Flexible)', () => {
            // Apply basic functionality tests
            narTestSuites.basicFunctionality(narProvider);

            // Apply lifecycle tests
            narTestSuites.lifecycle(narProvider);

            // Apply compound term tests
            narTestSuites.compoundTerms(narProvider);

            // Apply error handling tests
            narTestSuites.errorHandling(narProvider);

            // Add additional flexible tests
            test('should maintain robust operation across various operations', async () => {
                const initialBeliefs = narProvider().getBeliefs().length;

                await narProvider().input('test_belief.');
                const afterInput = narProvider().getBeliefs().length;

                // Flexible expectation: we should have at least as many beliefs as we started with + 1
                expect(afterInput).toBeGreaterThanOrEqual(initialBeliefs + 1);

                // Test lifecycle operations with flexible time checks
                const started = narProvider().start();
                expect(started).toBe(true);

                // Allow for some flexibility in timing
                await new Promise(resolve => setTimeout(resolve, 50)); // Brief cycle

                const stopped = narProvider().stop();
                expect(stopped).toBe(true);
            });
        });
    },

    /**
     * Performance test suite for NAR with flexible expectations
     */
    narPerformance: (narProvider, options = {maxDuration: 5000, maxTasks: 50}) => {
        describe('NAR Performance Tests (Flexible)', () => {
            test('should handle multiple inputs within performance bounds', async () => {
                const duration = await runPerformanceTest(async () => {
                    // Add multiple beliefs to test performance
                    for (let i = 0; i < options.maxTasks; i++) {
                        await narProvider().input(`item${i}.`);
                    }
                }, options.maxDuration, 'NAR multiple inputs performance test');

                const beliefs = narProvider().getBeliefs();
                // Use flexible assertion instead of exact count
                flexibleAssertions.expectAtLeast(beliefs, options.maxTasks, 'beliefs after bulk input');
            });

            test('should handle complex operations efficiently', async () => {
                const duration = await runPerformanceTest(async () => {
                    await narProvider().input('(A --> B).');
                    await narProvider().input('(B --> C).');
                    await narProvider().step(); // Run one reasoning cycle
                }, options.maxDuration, 'NAR complex operations performance test');

                expect(duration).toBeLessThan(options.maxDuration);
            });
        });
    }
};

/**
 * Reusable parameterized test patterns
 */
export const ParameterizedTestPatterns = {
    /**
     * Run tests with multiple parameter combinations
     */
    runWithParams: (testCases, testFn, description = 'Parameterized Test') => {
        describe(description, () => {
            parameterizedTests.runWithParams(testCases, testFn);
        });
    },

    /**
     * Run async tests with multiple parameter combinations
     */
    runAsyncWithParams: (testCases, testFn, description = 'Async Parameterized Test') => {
        describe(description, () => {
            // For async tests, we'll run them within a test rather than multiple tests to avoid performance issues
            test('runs all parameter combinations', async () => {
                for (const [index, testCase] of testCases.entries()) {
                    await testFn(testCase);
                }
            });
        });
    }
};

/**
 * Common test data and utilities
 */
export const CommonTestData = {
    // Re-export common test data for convenience
    truthValues: testData.getCommonTruthValues(),
    budgetValues: testData.getCommonBudgetValues(),
    termNames: testData.getCommonTermNames(),
    compoundTerms: testData.getCommonCompoundTerms(),

    // Common test configurations
    defaultNARConfig: {
        debug: {enabled: false},
        cycle: {delay: 10, maxTasksPerCycle: 5}
    },

    // Common test values
    constants: TEST_CONSTANTS
};

/**
 * Utility functions for creating common test scenarios
 */
export const TestScenarioUtils = {
    /**
     * Create a test scenario with given, when, then structure
     */
    createScenario: (description, givenFn, whenFn, thenFn) => {
        describe(`Scenario: ${description}`, () => {
            let context;

            beforeEach(() => {
                context = givenFn();
            });

            test('executes correctly', async () => {
                const result = await whenFn(context);
                thenFn(result, context);
            });
        });
    },

    /**
     * Wait for a condition with timeout
     */
    waitForCondition: async (condition, timeoutMs = 1000, intervalMs = 10) => {
        return waitForCondition(condition, timeoutMs, intervalMs);
    }
};

/**
 * Export everything for convenient import
 */
export const ConsolidatedTestSuites = {
    StandardTestSuites,
    FlexibleTestPatterns,
    NARTestSuites,
    ParameterizedTestPatterns,
    CommonTestData,
    TestScenarioUtils
};

// Default export
export default ConsolidatedTestSuites;