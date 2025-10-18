import { Task } from '../../../src/task/Task.js';
import { Stamp } from '../../../src/Stamp.js';
import { createTask, createTruth, createTerm } from '../../support/factories.js';

describe('Task', () => {
    let term;

    beforeEach(() => {
        term = createTerm('A');
    });

    test('creates with defaults', () => {
        const task = new Task({term});

        expect(task.term).toBe(term);
        expect(task.type).toBe('BELIEF');
        expect(task.truth).toBeNull();
        expect(task.budget).toEqual({priority: 0.5, durability: 0.5, quality: 0.5});
        expect(task.stamp).toBeInstanceOf(Stamp);
    });

    test('creates with custom properties', () => {
        const truth = createTruth();
        const budget = {priority: 0.7, durability: 0.6, quality: 0.7};
        const task = new Task({term, punctuation: '!', truth, budget});

        expect(task.type).toBe('GOAL');
        expect(task.truth).toEqual(truth);
        expect(task.budget).toEqual(budget);
    });

    test('throws for invalid term', () => {
        expect(() => new Task({term: 'not-a-term'})).toThrow('Task must be initialized with a valid Term object.');
    });

    test('enforces immutability', () => {
        const task = createTask({term});
        expect(() => task.type = 'GOAL').toThrow();
    });

    test('clones with modifications', () => {
        const task1 = createTask({term});
        const newTruth = createTruth(0.9, 0.9);
        const task2 = task1.clone({punctuation: '?', truth: newTruth});

        expect(task1.type).toBe('BELIEF');
        expect(task1.truth).toEqual(createTruth());
        expect(task2.type).toBe('QUESTION');
        expect(task2.truth).toEqual(newTruth);
        expect(task2.term).toBe(task1.term);
    });

    test('identifies types correctly', () => {
        const belief = createTask({term, punctuation: '.'});
        const goal = createTask({term, punctuation: '!'});
        const question = createTask({term, punctuation: '?'});

        expect(belief.isBelief()).toBe(true);
        expect(belief.isGoal()).toBe(false);
        expect(goal.isGoal()).toBe(true);
        expect(question.isQuestion()).toBe(true);
    });

    test('compares equality correctly', () => {
        const truth1 = createTruth(0.9, 0.9);
        const truth2 = createTruth(0.9, 0.9);
        const truth3 = createTruth(0.8, 0.8);
        const termB = createTerm('B');

        const task1 = createTask({term, punctuation: '.', truth: truth1});
        const task2 = createTask({term, punctuation: '.', truth: truth2});
        const task3 = createTask({term, punctuation: '.', truth: truth3});
        const task4 = createTask({term: termB, punctuation: '.', truth: truth1});
        const task5 = createTask({term, punctuation: '!', truth: truth1});

        expect(task1.equals(task2)).toBe(true);
        expect(task1.equals(task3)).toBe(false);
        expect(task1.equals(task4)).toBe(false);
        expect(task1.equals(task5)).toBe(false);
        expect(task1.equals(null)).toBe(false);
    });

    test('stringifies correctly', () => {
        const truth = createTruth();
        const task = createTask({term, punctuation: '.', truth});
        expect(task.toString()).toBe('A. %0.90;0.80%');
    });
});
