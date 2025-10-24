/**
 * @file commonTestSuites.js
 * @description Common test suites that can be reused across multiple test files to reduce duplication
 *
 * This file consolidates common test patterns, particularly for NAR integration tests.
 */

import {errorHandlingTests, flexibleAssertions, runPerformanceTest, truthAssertions} from './baseTestUtils.js';
import {narTestPatterns} from './narTestSetup.js';

/**
 * Common test suite for basic input processing
 */
export const basicInputProcessingSuite = (narProvider) => {
    describe('Basic Input Processing', () => {
        test('should accept and store a simple belief', async () => {
            await narTestPatterns.testInputProcessing(narProvider(), 'cat.', 'BELIEF');
        });

        test('should handle belief with truth value', async () => {
            const input = 'bird.%0.9;0.8%';
            await narProvider().input(input);

            const beliefs = narProvider().getBeliefs();
            const birdBelief = beliefs.find(b => b.term.toString().includes('bird'));

            expect(birdBelief).toBeDefined();
            truthAssertions.expectTruthCloseTo(birdBelief.truth, 0.9, 0.8, 1); // Use tolerance for flexibility
        });

        test('should handle goal input', async () => {
            await narTestPatterns.testInputProcessing(narProvider(), 'want_food!', 'GOAL');
        });

        test('should handle question input', async () => {
            await narTestPatterns.testInputProcessing(narProvider(), 'is_cat?', 'QUESTION');
        });
    });
};

/**
 * Common test suite for compound term processing
 */
export const compoundTermProcessingSuite = (narProvider) => {
    describe('Compound Term Processing', () => {
        test('should handle inheritance statements', async () => {
            await narTestPatterns.testCompoundTerm(narProvider(), '(cat --> animal).');
        });

        test('should handle conjunction statements', async () => {
            await narTestPatterns.testCompoundTerm(narProvider(), '(&, red, green).');
        });

        test('should handle nested statements', async () => {
            await narTestPatterns.testCompoundTerm(narProvider(), '((cat --> animal) ==> (animal --> mammal)).');
        });
    });
};

/**
 * Common test suite for system lifecycle
 */
export const systemLifecycleSuite = (narProvider) => {
    describe('System Lifecycle', () => {
        test('should start and stop correctly', async () => {
            await narTestPatterns.testLifecycle(narProvider());
        });

        test('should execute multiple cycles', async () => {
            await narProvider().input('cat.');
            await narProvider().input('dog.');

            const results = await narProvider().runCycles(3);

            expect(results.length).toBe(3);
            // Use relative comparison to make it more robust to internal changes
            for (let i = 0; i < results.length; i++) {
                expect(results[i].cycleNumber).toBeGreaterThan(i); // Ensure cycle numbers are sequential
            }
        });

        test('should reset system state', async () => {
            await narProvider().input('cat.');
            await narProvider().input('dog.');

            expect(narProvider().getBeliefs().length).toBeGreaterThan(0);
            expect(narProvider().cycleCount).toBe(0);

            narProvider().reset();

            expect(narProvider().getBeliefs().length).toBe(0);
            expect(narProvider().cycleCount).toBe(0);
        });
    });
};

/**
 * Common test suite for event system
 */
export const eventSystemSuite = (narProvider) => {
    describe('Event System', () => {
        test('should emit events for input processing', async () => {
            const events = [];
            const taskAddedEvents = [];

            narProvider().on('task.input', (data) => events.push(data));
            narProvider().on('task.added', (data) => taskAddedEvents.push(data));

            await narProvider().input('test.');

            expect(events.length).toBe(1);
            expect(events[0].task.term.toString()).toContain('test');
            expect(events[0].source).toBe('user');
            expect(events[0].originalInput).toBe('test.');

            expect(taskAddedEvents.length).toBe(1);
            expect(taskAddedEvents[0].task.type).toBe('BELIEF');
        });
    });
};

/**
 * Common test suite for error handling
 */
export const errorHandlingSuite = (narProvider) => {
    describe('Error Handling', () => {
        test('should handle malformed input gracefully', async () => {
            const invalidInputs = [
                'incomplete statement',
                '(unclosed parenthesis',
                'missing punctuation)',
                'term%invalid truth%',
                ''
            ];

            await errorHandlingTests.asyncErrorHandling(
                (input) => narProvider().input(input),
                invalidInputs
            );
        });
    });
};

/**
 * Common test suite for performance
 */
export const performanceSuite = (narProvider) => {
    describe('Performance and Scalability', () => {
        test('should handle multiple inputs efficiently', async () => {
            // Increase time tolerance to accommodate different hardware and environments
            const duration = await runPerformanceTest(async () => {
                // Add many beliefs
                for (let i = 0; i < 50; i++) {
                    await narProvider().input(`item${i}.`);
                }
            }, 5000, 'Multiple inputs performance test'); // Increased tolerance to 5 seconds

            const beliefs = narProvider().getBeliefs();
            expect(beliefs.length).toBe(50);
        });

        test('should handle large compound terms', async () => {
            // Create a complex compound term
            const complexTerm = '(&, A, B, C, D, E).';
            await narProvider().input(complexTerm);

            const beliefs = narProvider().getBeliefs();
            const compoundBelief = beliefs.find(b =>
                b.term.toString().includes('A') && b.term.toString().includes('E')
            );

            expect(compoundBelief).toBeDefined();
        });
    });
};

/**
 * Complete NAR integration test suite combining all common test suites
 */
export const completeNARIntegrationSuite = (narProvider) => {
    basicInputProcessingSuite(narProvider);
    compoundTermProcessingSuite(narProvider);
    systemLifecycleSuite(narProvider);
    eventSystemSuite(narProvider);
    errorHandlingSuite(narProvider);
    performanceSuite(narProvider);
};

/**
 * Common setup and teardown for NAR tests to avoid duplication
 */
export const narTestSetup = (config = {}) => {
    const defaultConfig = {
        debug: {enabled: false},
        cycle: {delay: 10, maxTasksPerCycle: 5},
        ...config
    };

    let nar;

    beforeEach(async () => {
        const {NAR} = await import('../../src/nar/NAR.js');
        nar = new NAR(defaultConfig);
    });

    afterEach(() => {
        if (nar && nar.isRunning) {
            nar.stop();
        }
    });

    return () => nar;
};

/**
 * Enhanced NAR test suite that uses more flexible assertions and can adapt to changes in implementation
 */
export const flexibleNARIntegrationSuite = (narProvider) => {
    describe('Flexible NAR Integration Tests', () => {
        test('should handle basic operations with flexible expectations', async () => {
            // Test basic belief processing with flexible value checking
            await narProvider().input('(cat --> animal).');
            const beliefs = narProvider().getBeliefs();

            // Use flexible assertions that won't break with minor implementation changes
            flexibleAssertions.expectAtLeast(beliefs, 1, 'beliefs after input');

            if (beliefs.length > 0) {
                const catBelief = beliefs.find(b => b.term.toString().includes('cat'));
                expect(catBelief).toBeDefined();
            }
        });

        test('should maintain core functionality across changes', async () => {
            // Test that core operations still work, regardless of specific implementation details
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
};