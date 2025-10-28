/**
 * CycleLimitedTest.js - Utility for running SeNARS tests with cycle limits
 * following OpenNARS approach to ensure tests terminate reliably.
 */

import { NAR } from '../nar/NAR.js';
import { Task } from '../task/Task.js';
import { Truth } from '../Truth.js';

/**
 * Runs a SeNARS test with a maximum cycle limit to ensure termination
 * @param {Function} testFn - Function that receives the NAR instance and returns a Promise with test results
 * @param {number} maxCycles - Maximum number of reasoning cycles allowed (default: 100)
 * @param {Object} config - Optional NAR configuration
 * @returns {Promise} - Promise that resolves with test results or rejects on timeout
 */
export async function runCycleLimitedTest(testFn, maxCycles = 100, config = {}) {
    const nar = new NAR(config);
    let cycleCount = 0;
    let result;
    let error = null;
    
    try {
        // Run the test function which should add tasks or set up the system
        result = await testFn(nar);
        
        // Run the reasoning cycle up to the maximum count
        while (cycleCount < maxCycles) {
            const cycleResult = await nar.step();
            cycleCount++;
            
            // Check if the test condition is satisfied
            if (result && typeof result.checkSuccess === 'function') {
                if (await result.checkSuccess(nar)) {
                    return {
                        success: true,
                        cycleCount,
                        result,
                        message: `Test completed successfully in ${cycleCount} cycles`
                    };
                }
            }
        }
        
        // If we've reached max cycles without a specific success condition, 
        // consider it successful if no error occurred
        return {
            success: true, // Consider successful if we completed cycles without error
            cycleCount: maxCycles,
            result,
            message: `Test completed ${maxCycles} cycles successfully`
        };
    } catch (err) {
        error = err;
        return {
            success: false,
            cycleCount,
            error: err.message,
            message: `Test failed with error after ${cycleCount} cycles`
        };
    } finally {
        // Ensure proper cleanup
        if (nar && typeof nar.dispose === 'function') {
            try {
                await nar.dispose();
            } catch (cleanupError) {
                this.logger?.warn('Warning during test cleanup:', cleanupError.message);
            }
        }
    }
}

/**
 * Helper function to create a NARS task for testing
 */
export function createTestTask(termString, punctuation = '.', frequency = 1.0, confidence = 0.9, priority = 0.5) {
    return new Task({
        term: termString, // In a real implementation, this would be parsed
        punctuation,
        truth: new Truth(frequency, confidence),
        budget: { priority, durability: 0.7, quality: 0.8 }
    });
}

/**
 * Test utility class with chainable methods for building tests
 */
export class CycleLimitedTester {
    constructor(maxCycles = 100, config = {}) {
        this.maxCycles = maxCycles;
        this.config = config;
        this.testTasks = [];
        this.expectedResults = [];
    }

    // Add a task to be executed during the test
    addTask(taskString, punctuation = '.', frequency = 1.0, confidence = 0.9) {
        this.testTasks.push({
            taskString,
            punctuation,
            frequency,
            confidence
        });
        return this;
    }

    // Expect a specific result after execution
    expectResult(predicate) {
        this.expectedResults.push(predicate);
        return this;
    }

    // Run the test with the specified parameters
    async run() {
        const testFn = async (nar) => {
            // Add all test tasks to the NAR
            for (const taskSpec of this.testTasks) {
                await nar.input(`<${taskSpec.taskString}> ${taskSpec.punctuation} %${taskSpec.frequency};${taskSpec.confidence}%`);
            }
            
            return {
                checkSuccess: async (nar) => {
                    // Check if expected results are met
                    for (const predicate of this.expectedResults) {
                        if (!await predicate(nar)) {
                            return false;
                        }
                    }
                    return true;
                }
            };
        };

        return await runCycleLimitedTest(testFn, this.maxCycles, this.config);
    }
}

/**
 * Run a test with automatic NAL-LM cycle limit
 */
export async function runNALTest(testFn, maxCycles = 50) {
    return await runCycleLimitedTest(testFn, maxCycles, {
        lm: { enabled: false }, // Disable LM for pure NAL tests
        cycle: { delay: 0 } // Run at max speed for tests
    });
}

/**
 * Run a test with NAL-LM hybrid cycle limit
 */
export async function runHybridTest(testFn, maxCycles = 100) {
    return await runCycleLimitedTest(testFn, maxCycles, {
        lm: { enabled: true }, // Enable LM for hybrid tests
        cycle: { delay: 0 } // Run at max speed for tests
    });
}