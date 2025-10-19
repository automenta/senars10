/**
 * @file testUtils.js
 * @description Common test utilities to reduce duplication
 */

import {createMemoryConfig, createTask, createTerm, createTruth, TEST_CONSTANTS} from './factories.js';

/**
 * Common test setup pattern for object initialization tests
 * @param {Function} Constructor - The constructor function to test
 * @param {Object} defaultParams - Default parameters for the constructor
 * @param {Function} assertions - Function that takes the created instance and runs assertions
 * @returns {Function} A test function that can be passed to Jest
 */
export const testInitialization = (Constructor, defaultParams, assertions) => {
    return () => {
        const instance = new Constructor(defaultParams);
        assertions(instance);
    };
};

/**
 * Common test pattern for methods that should throw errors with invalid inputs
 * @param {Function} constructorOrFunction - The function to test
 * @param {Array} invalidInputs - Array of invalid inputs that should throw
 * @returns {Function} A test function that can be passed to Jest
 */
export const testErrorHandling = (constructorOrFunction, invalidInputs) => {
    return () => {
        invalidInputs.forEach((invalidInput, index) => {
            expect(() => {
                if (typeof invalidInput === 'function') {
                    invalidInput();
                } else {
                    constructorOrFunction(invalidInput);
                }
            }).toThrow();
        });
    };
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
 * Common test data for truth values across multiple tests
 */
export const COMMON_TRUTH_VALUES = [
    { f: 1.0, c: 1.0, name: 'certain' },
    { f: 0.9, c: 0.9, name: 'high' },
    { f: 0.5, c: 0.8, name: 'medium' },
    { f: 0.1, c: 0.2, name: 'low' },
    { f: 0.0, c: 0.1, name: 'false' }
];

/**
 * Common test data for budget values across multiple tests
 */
export const COMMON_BUDGET_VALUES = [
    { priority: 0.9, durability: 0.8, quality: 0.7, name: 'high' },
    { priority: 0.5, durability: 0.5, quality: 0.5, name: 'medium' },
    { priority: 0.1, durability: 0.2, quality: 0.3, name: 'low' }
];

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
 * Common test pattern for parameterized tests
 * @param {Array} testCases - Array of test case objects with the format { name, ...args }
 * @param {Function} testFunction - Function that takes a testCase and runs the test
 * @returns {void}
 */
export const runParameterizedTests = (testCases, testFunction) => {
    testCases.forEach(testCase => {
        const { name, ...args } = testCase;
        test(`should work for ${name}`, () => {
            testFunction(args);
        });
    });
};

/**
 * Common setup for memory-related tests
 * @returns {Object} An object with memory, config, and helper functions
 */
export const setupMemoryTest = () => {
    const config = createMemoryConfig();
    const memory = require('../../src/memory/Memory.js').Memory; // This will need to be updated
    // For now, we'll return the config and factories
    return {
        config,
        createTask,
        createTerm,
        createTruth,
        TEST_CONSTANTS
    };
};

/**
 * Waits for a condition to be true with a timeout
 * @param {Function} condition - Function that returns true when condition is met
 * @param {number} timeoutMs - Maximum time to wait in milliseconds
 * @param {number} intervalMs - Interval to check the condition
 * @returns {Promise} Resolves when condition is met, rejects on timeout
 */
export const waitForCondition = (condition, timeoutMs = 1000, intervalMs = 10) => {
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