import {Concept} from '../../../src/core/memory/Concept.js';
import {Task} from '../../../src/core/task/Task.js';
import {Truth} from '../../../src/core/Truth.js';
import {TermFactory} from '../../../src/core/term/TermFactory.js';

describe('Concept', () => {
    let concept;
    let term;
    let config;
    let termFactory;
    let newAtom;

    beforeEach(() => {
        termFactory = new TermFactory();
        newAtom = name => termFactory.create({components: [name]});
        term = newAtom('A');
        config = {priorityDecayRate: 0.9};
        concept = new Concept(term, config);
    });

    test('should initialize with correct default state', () => {
        expect(concept.term).toBe(term);
        expect(concept.getAllTasks()).toEqual([]);
        expect(concept.totalTasks).toBe(0);
        expect(concept.activation).toBe(0);
        expect(concept.quality).toBe(0);
        expect(concept.useCount).toBe(0);
    });

    test('should add a task correctly', () => {
        const task = new Task(term, '.', new Truth(0.9, 0.8));
        const added = concept.addTask(task);
        expect(added).toBe(true);
        expect(concept.totalTasks).toBe(1);
        expect(concept.getAllTasks()).toContain(task);
    });

    test('should not add a duplicate task', () => {
        const task = new Task(term, '.', new Truth(0.9, 0.8));
        concept.addTask(task);
        const added = concept.addTask(task);
        expect(added).toBe(false);
        expect(concept.totalTasks).toBe(1);
    });

    test('should retrieve tasks by type', () => {
        const belief = new Task(term, '.', new Truth(0.9, 0.8));
        const goal = new Task(term, '!');
        concept.addTask(belief);
        concept.addTask(goal);
        const beliefs = concept.getTasksByType('BELIEF');
        expect(beliefs).toHaveLength(1);
        expect(beliefs[0]).toBe(belief);
    });

    test('should remove a task correctly', () => {
        const task = new Task(term, '.', new Truth(0.9, 0.8));
        concept.addTask(task);
        const removed = concept.removeTask(task);
        expect(removed).toBe(true);
        expect(concept.totalTasks).toBe(0);
    });

    test('should boost activation correctly', () => {
        concept.boostActivation(0.5);
        expect(concept.activation).toBe(0.5);
        concept.boostActivation(0.3);
        expect(concept.activation).toBe(0.8);
        concept.boostActivation(0.3);
        expect(concept.activation).toBe(1.0); // Capped at 1.0
    });

    test('should apply decay correctly', () => {
        concept.boostActivation(1.0);
        concept.applyDecay(0.2);
        expect(concept.activation).toBe(0.8);
    });

    test('should update quality correctly', () => {
        concept.updateQuality(0.5);
        expect(concept.quality).toBe(0.5);
        concept.updateQuality(-0.2);
        expect(concept.quality).toBe(0.3);
    });

    test('should increment use count', () => {
        concept.incrementUseCount();
        expect(concept.useCount).toBe(1);
    });

    test('should return correct average priority', () => {
        const task1 = new Task(term, '.', null, 0.8);
        const task2 = new Task(term, '.', null, 0.6);
        concept.addTask(task1);
        concept.addTask(task2);
        expect(concept.averagePriority).toBe(0.7);
    });
});