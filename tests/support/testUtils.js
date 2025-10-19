/**
 * @file testUtils.js
 * @description Common test utilities to reduce duplication
 * 
 * NOTE: This file is being consolidated with baseTestUtils.js
 * New test utilities should be added to baseTestUtils.js
 */

import {createMemoryConfig, createTask, createTerm, createTruth, TEST_CONSTANTS} from './factories.js';
import * as baseTestUtils from './baseTestUtils.js';

// Re-exporting functionality that will be maintained for backward compatibility
// New functionality should be in baseTestUtils.js

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
    { f: 1.0, c: 1.0, name: 'certain' },
    { f: 0.9, c: 0.9, name: 'high' },
    { f: 0.5, c: 0.8, name: 'medium' },
    { f: 0.1, c: 0.2, name: 'low' },
    { f: 0.0, c: 0.1, name: 'false' }
];

export const COMMON_BUDGET_VALUES = [
    { priority: 0.9, durability: 0.8, quality: 0.7, name: 'high' },
    { priority: 0.5, durability: 0.5, quality: 0.5, name: 'medium' },
    { priority: 0.1, durability: 0.2, quality: 0.3, name: 'low' }
];

// Re-export all test utilities for backward compatibility and ease of use
export * from './baseTestUtils.js';
export * from './narTestSetup.js';