import {Concept} from '../../../src/memory/Concept.js';
import {createTask, createTerm} from '../../support/factories.js';

describe('Concept', () => {
    let concept;
    let term;

    beforeEach(() => {
        term = createTerm('A');
        concept = new Concept(term, {priorityDecayRate: 0.9});
    });

    describe('Initialization', () => {
        test('initializes with the correct default state', () => {
            expect(concept.term).toBe(term);
            expect(concept.getAllTasks()).toEqual([]);
            expect(concept.totalTasks).toBe(0);
            expect(concept.activation).toBe(0);
            expect(concept.quality).toBe(0);
            expect(concept.useCount).toBe(0);
        });
    });

    describe('Task Management', () => {
        let task;

        beforeEach(() => {
            task = createTask({term});
        });

        test('adds a task correctly', () => {
            expect(concept.addTask(task)).toBe(true);
            expect(concept.totalTasks).toBe(1);
            expect(concept.getAllTasks()).toContain(task);
        });

        test('does not add a duplicate task', () => {
            concept.addTask(task);
            expect(concept.addTask(task)).toBe(false);
            expect(concept.totalTasks).toBe(1);
        });

        test('retrieves tasks by type', () => {
            const belief = createTask({term, punctuation: '.'});
            const goal = createTask({term, punctuation: '!'});
            concept.addTask(belief);
            concept.addTask(goal);
            const beliefs = concept.getTasksByType('BELIEF');
            expect(beliefs).toHaveLength(1);
            expect(beliefs[0]).toBe(belief);
        });

        test('removes a task correctly', () => {
            concept.addTask(task);
            expect(concept.removeTask(task)).toBe(true);
            expect(concept.totalTasks).toBe(0);
        });
    });

    describe('Concept Properties', () => {
        test('boosts activation correctly', () => {
            concept.boostActivation(0.5);
            expect(concept.activation).toBe(0.5);
            concept.boostActivation(0.3);
            expect(concept.activation).toBe(0.8);
            concept.boostActivation(0.3);
            expect(concept.activation).toBe(1.0); // Capped at 1.0
        });

        test('applies decay correctly', () => {
            concept.boostActivation(1.0);
            concept.applyDecay(0.2);
            expect(concept.activation).toBe(0.8);
        });

        test('updates quality correctly', () => {
            concept.updateQuality(0.5);
            expect(concept.quality).toBe(0.5);
            concept.updateQuality(-0.2);
            expect(concept.quality).toBe(0.3);
        });

        test('increments use count', () => {
            concept.incrementUseCount();
            expect(concept.useCount).toBe(1);
        });

        test('returns the correct average priority', () => {
            const task1 = createTask({term, budget: {priority: 0.8}});
            const task2 = createTask({term, budget: {priority: 0.6}});
            concept.addTask(task1);
            concept.addTask(task2);
            expect(concept.averagePriority).toBe(0.7);
        });
    });
});
