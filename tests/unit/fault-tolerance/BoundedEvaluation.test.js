import { Task } from '../../../src/task/Task.js';
import { Term, TermType } from '../../../src/term/Term.js';

describe('Bounded Evaluation Tests', () => {
    // Create a minimal Cycle-like object with the methods we need to test
    const createTestCycle = () => ({
        _filterTasksByBudget(tasks) {
            return tasks.filter(task => {
                if (!task.budget) return true;
                
                return (task.budget.cycles === undefined || task.budget.cycles > 0) &&
                       (task.budget.depth === undefined || task.budget.depth > 0);
            });
        },
        
        _applyBudgetConstraints(inferences) {
            return inferences.map(inference => {
                if (!inference.budget) return inference;
                
                const newCycles = Math.max(0, (inference.budget.cycles ?? 0) - 1);
                const newDepth = Math.max(0, (inference.budget.depth ?? 0) - 1);
                
                const newBudget = {
                    ...inference.budget,
                    cycles: newCycles,
                    depth: newDepth
                };
                
                return inference.clone({ budget: newBudget });
            });
        }
    });

    test('Task budget includes cycles and depth fields', () => {
        const task = new Task({
            term: new Term(TermType.ATOM, 'test'),
            budget: { cycles: 50, depth: 5, priority: 0.5, durability: 0.5, quality: 0.5 }
        });

        expect(task.budget.cycles).toBe(50);
        expect(task.budget.depth).toBe(5);
    });

    test('Default task budget includes cycles and depth fields', () => {
        const task = new Task({
            term: new Term(TermType.ATOM, 'test')
        });

        expect(task.budget.cycles).toBe(100);
        expect(task.budget.depth).toBe(10);
    });

    test('Cycle filters tasks based on budget constraints', () => {
        const cycle = createTestCycle();
        
        const validTask = new Task({
            term: new Term(TermType.ATOM, 'valid'),
            budget: { priority: 0.5, durability: 0.5, quality: 0.5, cycles: 5, depth: 3 }
        });

        const exhaustedCycleTask = new Task({
            term: new Term(TermType.ATOM, 'exhausted-cycles'),
            budget: { priority: 0.5, durability: 0.5, quality: 0.5, cycles: 0, depth: 3 }
        });

        const exhaustedDepthTask = new Task({
            term: new Term(TermType.ATOM, 'exhausted-depth'),
            budget: { priority: 0.5, durability: 0.5, quality: 0.5, cycles: 5, depth: 0 }
        });

        const tasks = [validTask, exhaustedCycleTask, exhaustedDepthTask];
        const filteredTasks = cycle._filterTasksByBudget(tasks);

        expect(filteredTasks).toHaveLength(1);
        expect(filteredTasks[0].term.toString()).toBe('valid');
    });

    test('Cycle applies budget constraints to inferences', () => {
        const cycle = createTestCycle();
        
        const task = new Task({
            term: new Term(TermType.ATOM, 'test'),
            budget: { priority: 0.5, durability: 0.5, quality: 0.5, cycles: 10, depth: 5 }
        });

        const processedTask = cycle._applyBudgetConstraints([task])[0];

        expect(processedTask.budget.cycles).toBe(9);
        expect(processedTask.budget.depth).toBe(4);
    });

    test('Budget values do not go below zero', () => {
        const cycle = createTestCycle();
        
        const task = new Task({
            term: new Term(TermType.ATOM, 'zero-test'),
            budget: { priority: 0.5, durability: 0.5, quality: 0.5, cycles: 1, depth: 1 }
        });

        let processedTask = cycle._applyBudgetConstraints([task])[0];
        processedTask = cycle._applyBudgetConstraints([processedTask])[0];
        processedTask = cycle._applyBudgetConstraints([processedTask])[0];

        expect(processedTask.budget.cycles).toBe(0);
        expect(processedTask.budget.depth).toBe(0);
    });
});