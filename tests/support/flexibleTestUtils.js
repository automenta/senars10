/**
 * @file flexibleTestUtils.js
 * @description Flexible test utilities to support agile development
 * These utilities complement existing test utilities without replacing them
 */

/**
 * Flexible assertion methods that support tolerance-based comparisons
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
 * Flexible truth value utilities
 */
export const flexibleTruthUtils = {
    /**
     * Check if two truth values are close within tolerance
     */
    areTruthValuesClose: (truth1, truth2, tolerance = 0.01) => {
        if (!truth1 || !truth2) return false;
        const freqDiff = Math.abs(truth1.f - truth2.f);
        const confDiff = Math.abs(truth1.c - truth2.c);
        return freqDiff <= tolerance && confDiff <= tolerance;
    },

    /**
     * Assert truth values with tolerance
     */
    expectTruthCloseTo: (actual, expectedFreq, expectedConf, tolerance = 0.01) => {
        expect(Math.abs(actual.f - expectedFreq)).toBeLessThanOrEqual(tolerance);
        expect(Math.abs(actual.c - expectedConf)).toBeLessThanOrEqual(tolerance);
    }
};

/**
 * Flexible test configuration
 */
export const flexibleTestConfig = {
    /**
     * Default tolerance values for different types of tests
     */
    defaultTolerances: {
        truthValues: 0.01,      // 1% tolerance for truth values
        performance: 100,       // 100ms tolerance for performance tests
        counts: 1,              // Allow difference of 1 for counts
        precision: 5            // Decimal places for closeTo comparisons
    },

    /**
     * Get tolerance based on test type
     */
    getTolerance: (testType) => {
        return flexibleTestConfig.defaultTolerances[testType] || 0.01;
    }
};

/**
 * Flexible test wrappers that add resilience to implementation changes
 */
export const flexibleTestWrappers = {
    /**
     * Run test with retry logic to handle async timing issues
     */
    withRetry: async (testFn, maxRetries = 3, delayMs = 100) => {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await testFn();
            } catch (error) {
                if (i === maxRetries - 1) {
                    throw error; // Re-throw on last attempt
                }
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    },

    /**
     * Expect with tolerance-based matching
     */
    expectWithTolerance: (actual, expected, tolerance = 0.01) => {
        if (typeof actual === 'number' && typeof expected === 'number') {
            expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
        } else {
            expect(actual).toEqual(expected);
        }
    }
};

/**
 * Export everything for easy import
 */
export default {
    flexibleAssertions,
    flexibleTruthUtils,
    flexibleTestConfig,
    flexibleTestWrappers
};