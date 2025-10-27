import { Task } from '../../src/task/Task.js';
import { Term, TermType } from '../../src/term/Term.js';
import { CircuitBreaker } from '../../src/util/CircuitBreaker.js';
import { MemoryValidator } from '../../src/util/MemoryValidator.js';
import { Memory } from '../../src/memory/Memory.js';

async function demonstratePhase10Features() {
    // 1. Demonstrate Bounded Evaluation
    const taskWithBudget = new Task({
        term: new Term(TermType.ATOM, 'bounded-task'),
        budget: { priority: 0.8, durability: 0.7, quality: 0.6, cycles: 5, depth: 3 }
    });
    
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
    
    // Verify filtered tasks functionality
    const filteredTasks = filterTasksByBudget(tasks);

    // 2. Demonstrate Circuit Breaker
    const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 1000  // 1 second
    });
    
    const initialState = circuitBreaker.getState().state;
    
    // Cause circuit to open with 2 failures
    let errors = [];
    try {
        await circuitBreaker.execute(() => Promise.reject(new Error('API failure')));
    } catch (e) {
        errors.push(e.message);
    }
    
    try {
        await circuitBreaker.execute(() => Promise.reject(new Error('API failure')));
    } catch (e) {
        errors.push(e.message);
    }
    
    const afterFailuresState = circuitBreaker.getState().state;
    
    // Next call should fail immediately due to OPEN circuit
    let blockedCallError = '';
    try {
        await circuitBreaker.execute(() => Promise.resolve('success'));
    } catch (e) {
        blockedCallError = e.message;
    }
    
    // Wait for timeout and try again (simulate the reset behavior)
    await new Promise(resolve => setTimeout(resolve, 1010));  // Wait longer than resetTimeout
    
    // Now the circuit should transition on the next call
    let successResult = '';
    let finalState = '';
    try {
        const result = await circuitBreaker.execute(() => Promise.resolve('success'));
        successResult = result;
        finalState = circuitBreaker.getState().state;
    } catch (e) {
        successResult = e.message;
        finalState = circuitBreaker.getState().state;
    }

    // 3. Demonstrate Memory Validation
    const validator = new MemoryValidator({ enableChecksums: true });
    
    const testObject = { data: 'important-info', value: 42 };
    const key = 'critical-data';
    
    // Store checksum
    const checksum = validator.storeChecksum(key, testObject);
    
    // Validate unchanged object
    const result1 = validator.validate(key, testObject);
    
    // Modify object and test validation
    testObject.value = 99;
    const result2 = validator.validate(key, testObject);

    // 4. Demonstrate Memory Integration
    const memory = new Memory({ enableMemoryValidation: true });
    
    // This would normally validate memory structures
    const validationStats = memory.getMemoryValidationStats();
    
    // Return results for verification to avoid console noise
    return {
        taskBudget: { initial: taskWithBudget.budget, processed: processedTask.budget },
        filteredTasksCount: filteredTasks.length,
        circuitBreakerResults: {
            initialState,
            afterFailuresState,
            blockedCallError,
            successResult,
            finalState
        },
        validatorResults: {
            checksum,
            validationUnchanged: result1,
            validationModified: result2
        },
        memoryValidation: validationStats
    };
}

// Run the demonstration
demonstratePhase10Features().catch(console.error);