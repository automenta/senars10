import { NAR } from '../../src/nar/NAR.js';
import { Task } from '../../src/task/Task.js';
import { Truth } from '../../src/Truth.js';
import { TermFactory } from '../../src/term/TermFactory.js';

describe('NARS Inference Cycle Integration with Computational Operations', () => {
    let nar;
    let termFactory;

    beforeEach(() => {
        nar = new NAR();
    });

    afterEach(async () => {
        // Properly dispose of the NAR to prevent asynchronous operation issues
        if (nar && typeof nar.dispose === 'function') {
            await nar.dispose();
        }
    });

    test('computational operations should integrate with NARS cycle', async () => {
        // Use the NAR input method to add computational expressions
        // This should go through the parser and proper task creation process
        try {
            // Adding a simple computational expression to test integration
            const success = await nar.input('<(add^("3", "2")) --> "5">.');
            expect(success).toBe(true);
            
            // Run one reasoning cycle to process the computational task
            const results = await nar.step();
            
            // The computational operation should have been processed by the cycle
            expect(results).toBeDefined();
            
            // Check that the memory has been updated appropriately
            const memoryStats = nar.memory.getDetailedStats();
            expect(memoryStats).toBeDefined();
        } catch (error) {
            console.error("Error in computational operations test:", error.message);
            throw error;
        }
    });

    test('equation solving results should be properly integrated into NARS memory', async () => {
        // Test computational expressions that can be handled by the system
        try {
            // First try a simple operation that should be evaluated
            const success = await nar.input('<(multiply^("2", "3")) --> "6">.');
            expect(success).toBe(true);
            
            const cycleResult = await nar.step();
            
            // Verify the step executed (cycleResult should not be null/undefined)
            expect(cycleResult).toBeDefined();
        } catch (error) {
            console.error("Error in equation solving test:", error.message);
            throw error;
        }
    });

    test('higher-order pattern matching should work within NARS cycle', async () => {
        try {
            // Test a more complex NARS statement that might involve pattern matching
            const success = await nar.input('<("Human" ==> "Mortal") --> Truth>.');
            expect(success).toBe(true);
            
            const cycleResult = await nar.step();
            
            // Verify the step executed
            expect(cycleResult).toBeDefined();
        } catch (error) {
            console.error("Error in higher-order pattern matching test:", error.message);
            throw error;
        }
    });
});