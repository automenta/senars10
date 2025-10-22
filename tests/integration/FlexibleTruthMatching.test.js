/**
 * @file FlexibleTruthMatching.test.js
 * @description Test demonstrating the new flexible truth matching capabilities
 * This test shows how to use the enhanced TestNAR with tolerance-based matching
 */

import {TaskMatch, TestNAR} from '../../src/testing/TestNAR.js';
import {flexible} from '../support/testOrganizer.js';

describe('Flexible Truth Matching Tests', () => {
    it('should match truth values with tolerance using new withFlexibleTruth method', async () => {
        // Use the new flexible truth matching with tolerance
        // The reasoning might produce slightly different values due to floating point precision
        // or algorithmic variations, so we use tolerance-based matching
        const result = await new TestNAR()
            .input('(a ==> b)', 0.9, 0.9)
            .input('a', 0.8, 0.8)
            .run(2)
            .expect(
                new TaskMatch('b')
                    .withFlexibleTruth(0.72, 0.65, 0.05) // freq=0.72±0.05, conf=0.65±0.05
            )
            .execute();

        expect(result).toBe(true);
    });

    it('should still support exact minimum threshold matching for backward compatibility', async () => {
        // This demonstrates that the original functionality is preserved
        const result = await new TestNAR()
            .input('(a ==> b)', 0.9, 0.9)
            .input('a', 0.8, 0.8)
            .run(2)
            .expect(
                new TaskMatch('b')
                    .withTruth(0.70, 0.60) // Minimum threshold approach (original)
            )
            .execute();

        expect(result).toBe(true);
    });

    it('should demonstrate flexible assertion utilities', () => {
        // This shows how to use the new flexible assertion utilities
        const actualFreq = 0.718;
        const expectedFreq = 0.72;

        // Using the new flexible assertion with 0.01 tolerance (1%)
        expect(() => {
            flexible.assertions.expectCloseTo(actualFreq, expectedFreq, 0.01);
        }).not.toThrow();

        // Using range-based assertion
        expect(() => {
            flexible.assertions.expectInRange(actualFreq, 0.70, 0.75);
        }).not.toThrow();
    });

    it('should work for conjunction reasoning with flexible matching', async () => {
        const result = await new TestNAR()
            .input('(&&, <a --> b>, <b --> c>)', 0.9, 0.9)  // a is b AND b is c
            .run(3)
            .expect(
                new TaskMatch('(&&, <a --> b>, <b --> c>)')  // Expect the conjunction itself
                    .withFlexibleTruth(0.9, 0.9, 0.1)  // With tolerance
            )
            .execute();

        expect(result).toBe(true);
    });

    it('should handle cases where exact values might vary due to implementation changes', async () => {
        // This test demonstrates resilience to minor implementation variations
        const testNar = new TestNAR()
            .input('cat --> animal', 0.9, 0.8)
            .input('dog --> animal', 0.85, 0.75)
            .run(2);

        // Test with flexible matching to accommodate possible minor variations
        const result = await testNar
            .expect(
                new TaskMatch('cat --> animal')
                    .withFlexibleTruth(0.9, 0.8, 0.05)  // Allow ±5% tolerance
            )
            .execute();

        expect(result).toBe(true);
    });
});

describe('Flexible Test Utilities Integration', () => {
    it('should work with the flexible test configuration', () => {
        const tolerance = flexible.config.getTolerance('truthValues');
        expect(tolerance).toBe(0.01);  // Default tolerance for truth values

        const performanceTolerance = flexible.config.getTolerance('performance');
        expect(performanceTolerance).toBe(100);  // Default performance tolerance
    });

    it('should support retry mechanism for timing-sensitive tests', async () => {
        // This demonstrates the retry functionality for async/resilient testing
        const testFn = async () => {
            // Simulate a test that might have timing issues
            return new Promise(resolve => {
                setTimeout(() => resolve(true), 50);
            });
        };

        const result = await flexible.wrappers.withRetry(testFn, 3, 100);
        expect(result).toBe(true);
    });
});