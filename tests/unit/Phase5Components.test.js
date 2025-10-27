/**
 * Phase5Components.test.js - Unit tests for Phase 5: Unified Evaluation Core & Agentic Loop
 */

import { Agent, InputTasks } from '../../src/Agent.js';
import { EvaluationEngine } from '../../src/reasoning/EvaluationEngine.js';
import { PrologParser } from '../../src/parser/PrologParser.js';
import { NAR } from '../../src/nar/NAR.js';
import { Task } from '../../src/task/Task.js';
import { TermFactory } from '../../src/term/TermFactory.js';
import { Truth } from '../../src/Truth.js';

describe('Phase 5: Unified Evaluation Core & Agentic Loop', () => {
    let termFactory;
    
    beforeEach(() => {
        termFactory = new TermFactory();
    });

    describe('Unified Evaluator', () => {
        it('should consolidate arithmetic, boolean, and structural evaluation', async () => {
            const evaluationEngine = new EvaluationEngine();

            // Test arithmetic operations
            const addPredicate = termFactory.create({ name: 'add', type: 'atomic' });
            const args = termFactory.create({ 
                operator: ',', 
                components: [
                    termFactory.create({ name: '2', type: 'atomic' }),
                    termFactory.create({ name: '3', type: 'atomic' })
                ] 
            });
            
            const operationTerm = termFactory.create({
                operator: '^',
                components: [addPredicate, args]
            });
            
            const result = await evaluationEngine.evaluate(operationTerm, null, new Map());
            expect(result.success).toBe(true);
            expect(result.result.name).toBe('5');
            expect(result.functorName).toBe('add');

            // Test boolean operations
            const trueTerm = termFactory.create({ name: 'True', type: 'atomic' });
            const falseTerm = termFactory.create({ name: 'False', type: 'atomic' });
            
            const andTerm = termFactory.create({
                operator: '&',
                components: [trueTerm, falseTerm]
            });
            
            const boolResult = await evaluationEngine.evaluate(andTerm, null, new Map());
            expect(boolResult.success).toBe(true);
            expect(boolResult.result.name).toBe('False');
            expect(boolResult.message).toContain('contains False');

            // Test structural reduction
            const reducedTerm = evaluationEngine.reduce(andTerm);
            expect(reducedTerm.name).toBe('False');
        });
    });

    describe('Agent and InputTasks', () => {
        it('should manage input tasks with priority system', () => {
            const inputTasks = new InputTasks();
            
            // Create a simple task
            const testTerm = termFactory.create({ name: 'test', type: 'atomic' });
            const testTask = new Task({
                term: testTerm,
                punctuation: '.',
                truth: new Truth(0.9, 0.8),
                budget: { priority: 0.7, durability: 0.6, quality: 0.5 }
            });
            
            // Add tasks with different priorities
            inputTasks.addTask(testTask, 5);
            inputTasks.addTask(testTask, 10); // Higher priority
            inputTasks.addTask(testTask, 1); // Lower priority

            expect(inputTasks.size()).toBe(3);
            
            const highestPriorityTask = inputTasks.getHighestPriorityTask();
            expect(highestPriorityTask.priority).toBe(10);
            
            // Verify correct sorting
            const allTasks = inputTasks.getAllTasks();
            const priorities = allTasks.map(t => t.priority);
            expect(priorities).toEqual([10, 5, 1]); // Should be sorted by priority
        });

        it('should support task management operations', () => {
            const inputTasks = new InputTasks();
            
            const testTerm = termFactory.create({ name: 'test', type: 'atomic' });
            const testTask = new Task({
                term: testTerm,
                punctuation: '.',
                truth: new Truth(0.9, 0.8),
                budget: { priority: 0.7, durability: 0.6, quality: 0.5 }
            });
            
            // Add task
            inputTasks.addTask(testTask, 5);
            expect(inputTasks.size()).toBe(1);
            
            // Update priority
            const result = inputTasks.updatePriority(0, 15);
            expect(result).toBe(true);
            expect(inputTasks.getHighestPriorityTask().priority).toBe(15);
            
            // Remove task
            const removed = inputTasks.removeTask(0);
            expect(removed).not.toBeNull();
            expect(inputTasks.size()).toBe(0);
        });

        it('should create agent with proper components', () => {
            const agent = new Agent();
            
            expect(agent).toBeDefined();
            expect(agent.getNAR()).toBeInstanceOf(NAR);
            expect(agent.getEvaluator()).toBeDefined(); // Using correct getter name
            expect(agent.getInputTasks()).toBeInstanceOf(InputTasks);
            
            // Verify the evaluator is properly integrated
            const evaluator = agent.getEvaluator();
            expect(evaluator.getFunctorRegistry()).toBeDefined();
        });
    });

    describe('Prolog Parsing', () => {
        it('should parse Prolog facts to SeNARS tasks', () => {
            const prologParser = new PrologParser(termFactory);
            
            const prologFacts = `
parent(tom, bob).
parent(bob, liz).
`;
            
            const tasks = prologParser.parseProlog(prologFacts);
            expect(tasks.length).toBe(2);
            
            // Verify tasks are properly formed
            for (const task of tasks) {
                expect(task).toBeInstanceOf(Task);
                expect(task.punctuation).toBe('.'); // Belief
                expect(task.truth).toBeDefined();
                expect(task.term.operator).toBe('^'); // Operation operator
            }
        });

        it('should parse Prolog queries correctly', () => {
            const prologParser = new PrologParser(termFactory);
            
            const prologQuery = `
parent(tom, X) ?
`;
            
            const tasks = prologParser.parseProlog(prologQuery);
            expect(tasks.length).toBe(1);
            
            const queryTask = tasks[0];
            expect(queryTask).toBeInstanceOf(Task);
            expect(queryTask.punctuation).toBe('?'); // Question
            expect(queryTask.term.operator).toBe('^'); // Operation operator
            
            // Should contain a variable
            expect(queryTask.term.components[1].components[1].name).toBe('?x'); // Variable
        });

        it('should parse Prolog rules correctly', () => {
            const prologParser = new PrologParser(termFactory);
            
            const prologRule = `
grandparent(X, Z) :- parent(X, Y), parent(Y, Z).
`;
            
            const tasks = prologParser.parseProlog(prologRule);
            // The rule parsing creates multiple tasks (head + body components)
            expect(tasks.length).toBeGreaterThan(0);
            
            for (const task of tasks) {
                expect(task).toBeInstanceOf(Task);
                expect(task.punctuation).toBe('.'); // Beliefs
            }
        });
    });

    describe('Integration', () => {
        it('should integrate evaluator with NAR cycle', () => {
            const nar = new NAR();
            
            // Verify that NAR has the evaluator as a core component
            expect(nar._evaluator).toBeDefined();
            expect(nar._evaluator).toBeInstanceOf(EvaluationEngine);
            
            // Verify the cycle has access to the evaluator
            expect(nar._cycle.evaluator).toBeDefined();
            expect(nar._cycle.evaluator).toBeInstanceOf(EvaluationEngine);
        });

        it('should process tasks through integrated evaluator', async () => {
            const evaluationEngine = new EvaluationEngine();
            
            // Create an arithmetic operation
            const addPredicate = termFactory.create({ name: 'add', type: 'atomic' });
            const args = termFactory.create({ 
                operator: ',', 
                components: [
                    termFactory.create({ name: '1', type: 'atomic' }),
                    termFactory.create({ name: '2', type: 'atomic' })
                ] 
            });
            
            const operationTerm = termFactory.create({
                operator: '^',
                components: [addPredicate, args]
            });
            
            // Process through evaluator
            const result = await evaluationEngine.evaluate(operationTerm, null, new Map());
            
            expect(result.success).toBe(true);
            expect(result.result.name).toBe('3');
        });
    });
});