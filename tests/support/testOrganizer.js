/**
 * @file testOrganizer.js
 * @description Organized, consolidated test utilities following AGENTS.md guidelines
 *
 * This file organizes test utilities to reduce duplication, improve maintainability,
 * and make the test suite more robust for agile development.
 */

// Import existing utilities to consolidate them in one organized interface
import * as baseUtils from './baseTestUtils.js';
import * as narUtils from './narTestSetup.js';
import * as factories from './factories.js';
import * as commonSuites from './commonTestSuites.js';
import * as generalSuites from './generalTestSuites.js';
import * as consolidatedSuites from './consolidatedTestSuites.js';
import * as enhancedSuites from './enhancedTestSuites.js';
import * as testSuiteFactory from './testSuiteFactory.js';
import * as flexibleUtils from './flexibleTestUtils.js';
import * as templateFactory from './TestTemplateFactory.js';

/**
 * Consolidated test utilities organized by functionality
 */
const TestOrganizer = {
    // Basic assertions and utilities
    assertions: {
        flexible: baseUtils.flexibleAssertions,
        truth: baseUtils.truthAssertions,
        task: baseUtils.taskAssertions,
        memory: baseUtils.memoryAssertions,
        stringRepresentation: baseUtils.stringRepresentationTests
    },

    // Test patterns and utilities
    patterns: {
        initialization: baseUtils.initializationTests,
        equality: baseUtils.equalityTests,
        errorHandling: baseUtils.errorHandlingTests,
        async: baseUtils.asyncTests,
        parameterized: baseUtils.parameterizedTests,
        robustNAR: baseUtils.robustNARTests
    },

    // NAR-specific utilities
    nar: {
        patterns: narUtils.narTestPatterns,
        suites: narUtils.narTestSuites,
        testSetup: narUtils.StandardNARTestSetup,
        createSetup: narUtils.createStandardNARTestSetup,
        testSuites: narUtils.narTestSuites
    },

    // Test data and factories
    factories: {
        ...factories,
        testData: baseUtils.testData,
        commonTruthValues: baseUtils.COMMON_TRUTH_VALUES,
        commonBudgetValues: baseUtils.COMMON_BUDGET_VALUES
    },

    // Comprehensive test suites
    suites: {
        ...commonSuites,
        ...generalSuites,
        ...consolidatedSuites, // Include the new consolidated test suites
        ...enhancedSuites,     // Include the enhanced test suites
        factory: testSuiteFactory, // Include the test suite factory
        comprehensive: baseUtils.comprehensiveTestSuites
    },

    // Flexible test utilities for agile development
    flexible: {
        assertions: flexibleUtils.flexibleAssertions,
        truth: flexibleUtils.flexibleTruthUtils,
        config: flexibleUtils.flexibleTestConfig,
        wrappers: flexibleUtils.flexibleTestWrappers
    },

    // Test templates for standardized, flexible testing
    templates: {
        factory: templateFactory.TestTemplateFactory,
        ...templateFactory
    },

    // Common helper functions
    helpers: {
        waitForCondition: baseUtils.waitForCondition,
        runPerformanceTest: baseUtils.runPerformanceTest,
        testImmutability: baseUtils.testImmutability,
        testEqualityMethod: baseUtils.testEqualityMethod,
        testStringRepresentation: baseUtils.testStringRepresentation
    }
};

// Export everything for backward compatibility and organized access
export const {
    assertions,
    patterns,
    nar,
    factories: testFactories,  // Rename to avoid conflict
    suites,
    flexible,  // Export the new flexible utilities
    templates,  // Export the new template utilities
    helpers
} = TestOrganizer;

// Also export the original for backward compatibility
export {TestOrganizer};

// Export everything individually for backward compatibility
// Note: Be careful of conflicts when using star exports
// The flexibleAssertions from baseTestUtils and flexibleTestUtils conflict
export * from './baseTestUtils.js';
export * from './narTestSetup.js';
export * from './factories.js';
export * from './commonTestSuites.js';
export * from './generalTestSuites.js';
export * from './consolidatedTestSuites.js';
export * from './enhancedTestSuites.js';
export * from './agileRobustnessUtils.js';
export * from './testSuiteFactory.js';
// Don't star-export flexibleTestUtils to avoid conflicts, export individually where needed
// export * from './flexibleTestUtils.js';

// Export flexible utilities individually to avoid conflicts
export {
    flexibleAssertions, flexibleTruthUtils, flexibleTestConfig, flexibleTestWrappers, default as flexibleTestUtils
} from './flexibleTestUtils.js';
export {TestTemplateFactory, default as testTemplateFactory} from './TestTemplateFactory.js';

/**
 * Fluent test API for more readable and expressive tests
 */
export class FluentTestAPI {
    constructor() {
        this.testData = {};
        this.steps = [];
    }

    withData(data) {
        this.testData = {...this.testData, ...data};
        return this;
    }

    given(description, setupFn) {
        this.steps.push({type: 'given', description, fn: setupFn});
        return this;
    }

    when(description, actionFn) {
        this.steps.push({type: 'when', description, fn: actionFn});
        return this;
    }

    then(description, assertionFn) {
        this.steps.push({type: 'then', description, fn: assertionFn});
        return this;
    }

    execute() {
        for (const step of this.steps) {
            describe(`${step.type}: ${step.description}`, () => {
                step.fn(this.testData);
            });
        }
    }
}

/**
 * Test environment setup for consistent test initialization
 */
export class TestEnvironment {
    constructor(config = {}) {
        this.config = {
            nar: {debug: {enabled: false}, cycle: {delay: 10, maxTasksPerCycle: 5}},
            ...config
        };
        this.resources = new Map();
    }

    register(name, resource) {
        this.resources.set(name, resource);
        return this;
    }

    get(name) {
        return this.resources.get(name);
    }

    async setup() {
        // Common setup logic
        return this;
    }

    async teardown() {
        // Clean up resources
        for (const [name, resource] of this.resources) {
            if (resource && typeof resource.destroy === 'function') {
                resource.destroy();
            }
        }
        this.resources.clear();
    }
}

// Default export for convenience
export default TestOrganizer;