/**
 * @file testSuiteFactory.js
 * @description Factory functions for creating comprehensive, reusable test suites
 *
 * Following AGENTS.md guidelines: Elegant, Consolidated, Consistent, Organized, Deeply deduplicated
 * Abstract, Modularized, Parameterized with Terse syntax, Few comments: rely on self-documenting code
 */

import {FlexibleTestPatterns, ParameterizedTestPatterns, StandardTestSuites} from './consolidatedTestSuites.js';
import {flexibleAssertions, memoryAssertions, taskAssertions, truthAssertions} from './baseTestUtils.js';
import {T} from './enhancedTestSuites.js';

/**
 * Factory function to create comprehensive test suites for different types of classes
 */
export const TestSuiteFactory = {
    /**
     * Create a comprehensive test suite for data model classes
     */
    createDataModelSuite: (config) => {
        const {
            className,
            Constructor,
            validInput,
            differentInput,
            testEquality = true,
            testImmutability = true,
            expectedString,
            additionalTests = []
        } = config;

        StandardTestSuites.dataModel(className, Constructor, {
            validInput,
            expectedProperties: validInput,
            differentInput,
            testEquality,
            testImmutability,
            expectedString
        });

        // Run additional custom tests if provided
        if (additionalTests.length > 0) {
            describe(`${className} - Additional Tests`, () => {
                additionalTests.forEach(({name, testFn}) => {
                    test(name, testFn);
                });
            });
        }
    },

    /**
     * Create a comprehensive test suite for task-related classes
     */
    createTaskRelatedSuite: (config) => {
        const {
            className,
            Constructor,
            validInput,
            testAssertions = true,
            additionalTests = []
        } = config;

        StandardTestSuites.taskRelated(className, Constructor, {
            validInput,
            testAssertions
        });

        // Run additional custom tests if provided
        if (additionalTests.length > 0) {
            describe(`${className} - Additional Task Tests`, () => {
                additionalTests.forEach(({name, testFn}) => {
                    test(name, testFn);
                });
            });
        }
    },

    /**
     * Create a comprehensive test suite for truth-related classes
     */
    createTruthRelatedSuite: (config) => {
        const {
            className,
            Constructor,
            validInput,
            testAssertions = true,
            additionalTests = []
        } = config;

        StandardTestSuites.truthRelated(className, Constructor, {
            validInput,
            testAssertions
        });

        // Run additional custom tests if provided
        if (additionalTests.length > 0) {
            describe(`${className} - Additional Truth Tests`, () => {
                additionalTests.forEach(({name, testFn}) => {
                    test(name, testFn);
                });
            });
        }
    },

    /**
     * Create a comprehensive test suite for memory-related classes
     */
    createMemoryRelatedSuite: (config) => {
        const {
            className,
            Constructor,
            validInput,
            testAssertions = true,
            testDataModel = true,
            additionalTests = []
        } = config;

        StandardTestSuites.memoryRelated(className, Constructor, {
            validInput,
            testAssertions,
            testDataModel
        });

        // Run additional custom tests if provided
        if (additionalTests.length > 0) {
            describe(`${className} - Additional Memory Tests`, () => {
                additionalTests.forEach(({name, testFn}) => {
                    test(name, testFn);
                });
            });
        }
    },

    /**
     * Create a parameterized test suite for multiple test cases
     */
    createParameterizedSuite: (config) => {
        const {
            className,
            testCases,
            testFn,
            description = 'Parameterized Tests'
        } = config;

        ParameterizedTestPatterns.runWithParams(testCases, testFn, description);
    },

    /**
     * Create a flexible, agile-ready test suite with retry and tolerance logic
     */
    createAgileSuite: (config) => {
        const {
            className,
            testOperations,
            maxRetries = 3,
            tolerance = 0.01
        } = config;

        describe(`${className} - Agile-Ready Tests`, () => {
            testOperations.forEach(({name, operation, expected}) => {
                FlexibleTestPatterns.retryableTest(
                    name,
                    () => operation(),
                    maxRetries
                );

                if (expected !== undefined) {
                    FlexibleTestPatterns.flexibleNumericComparison(
                        `${name} - with tolerance`,
                        operation(),
                        expected,
                        tolerance
                    );
                }
            });
        });
    },

    /**
     * Get assertion utilities based on class type
     */
    getAssertions: (type) => {
        switch (type) {
            case 'truth':
                return truthAssertions;
            case 'task':
                return taskAssertions;
            case 'memory':
                return memoryAssertions;
            case 'flexible':
            default:
                return flexibleAssertions;
        }
    },

    /**
     * Create a combined suite using the T shorthand from enhancedTestSuites
     */
    createShorthandSuite: (type, ...args) => {
        return T.suite(type, ...args);
    }
};

// Export for convenience
export const {
    createDataModelSuite,
    createTaskRelatedSuite,
    createTruthRelatedSuite,
    createMemoryRelatedSuite,
    createParameterizedSuite,
    createAgileSuite
} = TestSuiteFactory;

// Default export
export default TestSuiteFactory;