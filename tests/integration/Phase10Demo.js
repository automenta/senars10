/**
 * Integration test/demonstration of Phase 10 fault tolerance features
 */
import { Task } from '../../src/task/Task.js';
import { Term, TermType } from '../../src/term/Term.js';
import { CircuitBreaker } from '../../src/util/CircuitBreaker.js';
import { MemoryValidator } from '../../src/util/MemoryValidator.js';
import { Memory } from '../../src/memory/Memory.js';

async function demonstratePhase10Features() {
    console.log('=== SeNARS Phase 10: Fault Tolerance & Reliability Architecture ===\n');

    // 1. Demonstrate Bounded Evaluation
    console.log('1. Bounded Evaluation:');
    const taskWithBudget = new Task({
        term: new Term(TermType.ATOM, 'bounded-task'),
        budget: { priority: 0.8, durability: 0.7, quality: 0.6, cycles: 5, depth: 3 }
    });
    console.log(`   - Task created with cycles budget: ${taskWithBudget.budget.cycles}, depth budget: ${taskWithBudget.budget.depth}`);
    
    // Simulate cycle execution that decrements budget
    function applyBudgetConstraints(inferences) {
        return inferences.map(inference => {
            if (!inference.budget) return inference;
            
            const newCycles = Math.max(0, inference.budget.cycles - 1);
            const newDepth = Math.max(0, inference.budget.depth - 1);
            
            const newBudget = {
                ...inference.budget,
                cycles: newCycles,
                depth: newDepth
            };
            
            return inference.clone({ budget: newBudget });
        });
    }
    
    const processedTask = applyBudgetConstraints([taskWithBudget])[0];
    console.log(`   - After one cycle: cycles left: ${processedTask.budget.cycles}, depth left: ${processedTask.budget.depth}`);
    
    // Filtering based on budget
    function filterTasksByBudget(tasks) {
        return tasks.filter(task => {
            if (!task.budget) return true;
            return task.budget.cycles > 0 && task.budget.depth > 0;
        });
    }
    
    const tasks = [
        taskWithBudget,  // 5 cycles, 3 depth (valid initially)
        new Task({ term: new Term(TermType.ATOM, 'exhausted'), budget: { cycles: 0, depth: 1 } })  // exhausted
    ];
    
    console.log(`   - Before filtering: ${tasks.length} tasks`);
    console.log(`   - After filtering: ${filterTasksByBudget(tasks).length} tasks (exhausted tasks filtered out)`);
    console.log('');

    // 2. Demonstrate Circuit Breaker
    console.log('2. Circuit Breaker Implementation:');
    const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 1000  // 1 second
    });
    
    console.log(`   - Initial state: ${circuitBreaker.getState().state}`);
    
    // Cause circuit to open with 2 failures
    try {
        await circuitBreaker.execute(() => Promise.reject(new Error('API failure')));
    } catch (e) {
        console.log(`   - First failure: ${e.message}`);
    }
    
    try {
        await circuitBreaker.execute(() => Promise.reject(new Error('API failure')));
    } catch (e) {
        console.log(`   - Second failure: ${e.message}`);
    }
    
    console.log(`   - After 2 failures: ${circuitBreaker.getState().state}`);
    
    // Next call should fail immediately due to OPEN circuit
    try {
        await circuitBreaker.execute(() => Promise.resolve('success'));
    } catch (e) {
        console.log(`   - Call blocked while circuit OPEN: ${e.message}`);
    }
    
    console.log(`   - State before timeout: ${circuitBreaker.getState().state}`);
    
    // Wait for timeout and try again (simulate the reset behavior)
    console.log('   - Waiting for reset timeout...');
    await new Promise(resolve => setTimeout(resolve, 1010));  // Wait longer than resetTimeout
    
    // Now the circuit should transition on the next call
    try {
        const result = await circuitBreaker.execute(() => Promise.resolve('success'));
        console.log(`   - Success after timeout: ${result}`);
        console.log(`   - Final state: ${circuitBreaker.getState().state}`);
    } catch (e) {
        console.log(`   - Error: ${e.message}`);
        console.log(`   - Final state: ${circuitBreaker.getState().state}`);
    }
    console.log('');

    // 3. Demonstrate Memory Validation
    console.log('3. Memory Validation:');
    const validator = new MemoryValidator({ enableChecksums: true });
    
    const testObject = { data: 'important-info', value: 42 };
    const key = 'critical-data';
    
    // Store checksum
    const checksum = validator.storeChecksum(key, testObject);
    console.log(`   - Stored checksum for key '${key}': ${checksum}`);
    
    // Validate unchanged object
    const result1 = validator.validate(key, testObject);
    console.log(`   - Validation result (unchanged): ${result1.valid} - ${result1.message}`);
    
    // Modify object and test validation
    testObject.value = 99;
    const result2 = validator.validate(key, testObject);
    console.log(`   - Validation result (modified): ${result2.valid} - ${result2.message}`);
    console.log('');

    // 4. Demonstrate Memory Integration
    console.log('4. Memory with Validation Integration:');
    const memory = new Memory({ enableMemoryValidation: true });
    
    // This would normally validate memory structures
    const validationStats = memory.getMemoryValidationStats();
    console.log(`   - Memory validation enabled: ${validationStats.validationEnabled}`);
    console.log(`   - Memory validation stats:`, JSON.stringify(validationStats, null, 2));

    console.log('\n=== Phase 10 Implementation Complete ===');
}

// Run the demonstration
demonstratePhase10Features().catch(console.error);