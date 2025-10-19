import {Task} from '../../../src/task/Task.js';
import {Stamp} from '../../../src/Stamp.js';
import {createTask, createTerm, createTruth} from '../../support/factories.js';

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

    test.each([
        {punctuation: '.', method: 'isBelief', expected: true},
        {punctuation: '.', method: 'isGoal', expected: false},
        {punctuation: '!', method: 'isGoal', expected: true},
        {punctuation: '?', method: 'isQuestion', expected: true},
    ])('identifies types correctly for punctuation "$punctuation"', ({punctuation, method, expected}) => {
        const task = createTask({term, punctuation});
        expect(task[method]()).toBe(expected);
    });

    test.each([
        {
            name: 'equal',
            getOther: (t) => createTask({term: t, punctuation: '.', truth: createTruth(0.9, 0.9)}),
            expected: true
        },
        {
            name: 'different truth',
            getOther: (t) => createTask({term: t, punctuation: '.', truth: createTruth(0.8, 0.8)}),
            expected: false
        },
        {
            name: 'different term',
            getOther: (t) => createTask({term: createTerm('B'), punctuation: '.', truth: createTruth(0.9, 0.9)}),
            expected: false
        },
        {
            name: 'different punctuation',
            getOther: (t) => createTask({term: t, punctuation: '!', truth: createTruth(0.9, 0.9)}),
            expected: false
        },
        {name: 'null', getOther: (t) => null, expected: false},
    ])('compares equality correctly when other is $name', ({getOther, expected}) => {
        const task = createTask({term, punctuation: '.', truth: createTruth(0.9, 0.9)});
        const other = getOther(term);
        expect(task.equals(other)).toBe(expected);
    });

    test('stringifies correctly', () => {
        const truth = createTruth();
        const task = createTask({term, punctuation: '.', truth});
        expect(task.toString()).toBe('A. %0.90;0.80%');
    });
});
