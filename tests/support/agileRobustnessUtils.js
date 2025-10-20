/**
 * @file agileRobustnessUtils.js
 * @description Test utilities designed for robustness in agile development
 *
 * These utilities use flexible assertions and patterns that adapt to implementation changes
 * without breaking tests during ongoing development.
 */

import {runPerformanceTest, waitForCondition} from './baseTestUtils.js';

/**
 * Agile-robust assertions that are tolerant of implementation changes
 */
export const AgileAssertions = {
    /**
     * Assert that a value is close to expected within tolerance, with detailed error reporting
     */
    expectCloseTo: (actual, expected, tolerance = 0.01, description = '') => {
        const message = description ? ` (${description})` : '';
        const diff = Math.abs(actual - expected);
        if (diff > tolerance) {
            console.warn(`Value ${actual} differs from expected ${expected} by ${diff}${message}`);
        }
        expect(diff).toBeLessThanOrEqual(tolerance);
    },

    /**
     * Assert that a collection has at least some items, rather than exact count
     */
    expectAtLeast: (collection, minCount, description = '') => {
        const count = Array.isArray(collection) ? collection.length :
            collection.size || collection.length || Object.keys(collection || {}).length;
        const message = description ? ` (${description})` : '';
        expect(count).toBeGreaterThanOrEqual(minCount);
    },

    /**
     * Assert that a value is within an expected range with flexible bounds
     */
    expectInRange: (actual, min, max, description = '') => {
        const message = description ? ` (${description})` : '';
        expect(actual).toBeGreaterThanOrEqual(min);
        expect(actual).toBeLessThanOrEqual(max);
    },

    /**
     * Flexible object comparison with tolerance for numeric values
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
    },

    /**
     * Expect a condition to be true within a retryable timeframe
     */
    expectEventually: async (conditionFn, timeoutMs = 1000, intervalMs = 50, description = '') => {
        const message = description ? ` (${description})` : '';
        await waitForCondition(() => {
            try {
                return conditionFn() === true;
            } catch (e) {
                return false; // If condition throws, return false to keep waiting
            }
        }, timeoutMs, intervalMs);
    }
};

/**
 * Agile-robust NAR test utilities that adapt to changes in implementation
 */
export const AgileNARTests = {
    /**
     * Run NAR operations with flexible timing that adapts to different system speeds
     */
    runWithFlexibleTiming: async (operation, maxDurationMs = 10000, description = 'NAR operation') => {
        const startTime = Date.now();
        const result = await operation();
        const duration = Date.now() - startTime;

        // Log duration but don't fail unless significantly over limit
        console.log(`${description} completed in ${duration}ms (max: ${maxDurationMs}ms)`);
        expect(duration).toBeLessThanOrEqual(maxDurationMs);

        return result;
    },

    /**
     * Check for expected results with retry logic to handle async operations reliably
     */
    expectWithRetry: async (checkFn, maxRetries = 10, intervalMs = 100, description = 'Expectation check') => {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
            try {
                await checkFn();
                return; // Success, exit early
            } catch (error) {
                lastError = error;
                if (i === maxRetries - 1) {
                    // Last attempt, throw the error with context
                    throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
                }
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, intervalMs));
            }
        }
    },

    /**
     * Look for expected results with flexible matching (find expected pattern rather than exact match)
     */
    findExpectedResult: (collection, matcherFn, description = 'Expected result') => {
        const result = Array.isArray(collection) ? collection.find(matcherFn) :
            Array.from(collection || []).find(matcherFn);
        if (!result) {
            const collectionDesc = Array.isArray(collection) ? collection.length : collection.size || 0;
            throw new Error(`Could not find ${description} in collection with ${collectionDesc} items`);
        }
        return result;
    },

    /**
     * Test NAR input processing with flexible matching for term identification
     */
    testInputProcessing: async (nar, input, expectedType) => {
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

        // Flexible matching - look for terms that include the main part of the input
        const mainTermPart = input.split(/[^A-Za-z0-9_]/)[0] || input.split(/[^A-Za-z0-9_]/)[1] || input;
        const task = storage.find(t =>
            t.term.toString().toLowerCase().includes(mainTermPart.toLowerCase())
        );

        expect(task).toBeDefined();
        expect(task.type).toBe(expectedType.toUpperCase());
    }
};

/**
 * Agile-robust performance testing utilities
 */
export const AgilePerformanceTests = {
    /**
     * Run performance test with flexible timing expectations that can adapt to different environments
     */
    runFlexiblePerformanceTest: async (testFn, baselineDurationMs, description = 'Performance test') => {
        const startTime = Date.now();
        const result = await testFn();
        const duration = Date.now() - startTime;

        // Use adaptive tolerance based on baseline
        const tolerance = Math.max(1000, baselineDurationMs * 0.5); // 50% tolerance or 1s, whichever is larger
        const maxAllowed = baselineDurationMs + tolerance;

        console.log(`${description} completed in ${duration}ms (baseline: ${baselineDurationMs}ms, max allowed: ${maxAllowed}ms)`);
        expect(duration).toBeLessThanOrEqual(maxAllowed);

        return result;
    },

    /**
     * Test scalability with flexible expectations on resource usage
     */
    testScalability: async (operation, scales = [10, 50, 100], description = 'Scalability test') => {
        for (const scale of scales) {
            const duration = await runPerformanceTest(async () => {
                for (let i = 0; i < scale; i++) {
                    await operation(i);
                }
            }, 10000, `${description} at scale ${scale}`);

            // Log performance per item
            const durationPerItem = duration / scale;
            console.log(`${description} at scale ${scale}: ${duration}ms total, ${durationPerItem.toFixed(2)}ms per item`);

            // Use flexible expectation - performance should scale reasonably
            expect(durationPerItem).toBeLessThan(500); // Each operation should take less than 500ms on average
        }
    }
};

/**
 * Agile-robust test configuration that can adapt to changing requirements
 */
export const AgileTestConfig = {
    // Conservative timeouts that work across different environments
    timeouts: {
        short: 1000,
        medium: 5000,
        long: 10000
    },

    // Flexible tolerance settings that can be adjusted based on implementation
    tolerances: {
        numeric: 0.01,
        performance: 0.1, // 10% tolerance for performance variations
        timing: 0.2      // 20% tolerance for timing variations
    },

    // Retry settings for flaky operations
    retry: {
        maxRetries: 3,
        intervalMs: 100
    }
};

/**
 * Utility functions for creating robust test patterns
 */
export const AgileTestPatterns = {
    /**
     * Create a test that adapts to different implementation approaches
     */
    forImplementation: (implementationName, testFn) => {
        return test(`${implementationName} implementation`, async () => {
            await testFn();
        });
    },

    /**
     * Create parameterized tests with flexible expectations
     */
    parameterizedFlexible: (testName, testCases, testFn) => {
        test.each(testCases.map((testCase, i) => [i, testCase]))(
            `${testName} - case %i`,
            (index, testCase) => {
                testFn(testCase);
            }
        );
    },

    /**
     * Create tests that verify behavior rather than exact implementation
     */
    behavioralTest: (description, setupFn, operationFn, verificationFn) => {
        test(`Behavioral: ${description}`, async () => {
            const context = await setupFn();
            const result = await operationFn(context);
            await verificationFn(result, context);
        });
    }
};

// Export all agile-robust utilities
export const AgileRobustUtils = {
    AgileAssertions,
    AgileNARTests,
    AgilePerformanceTests,
    AgileTestConfig,
    AgileTestPatterns
};

export default AgileRobustUtils;