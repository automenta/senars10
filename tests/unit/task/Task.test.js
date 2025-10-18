import {Task} from '../../../src/task/Task.js';
import {Truth} from '../../../src/Truth.js';
import {Stamp} from '../../../src/Stamp.js';
import {TermFactory} from '../../../src/term/TermFactory.js';

describe('Task', () => {
    let termFactory;
    let term;

    beforeEach(() => {
        termFactory = new TermFactory();
        term = termFactory.create({name: 'A'});
    });

    test('should create a task with correct default properties', () => {
        const task = new Task({term});

        expect(task.term).toBe(term);
        expect(task.type).toBe('BELIEF');
        expect(task.truth).toBeNull();
        expect(task.budget).toEqual({priority: 0.5, durability: 0.5, quality: 0.5});
        expect(task.stamp).toBeInstanceOf(Stamp);
    });

    test('should create a task with specified properties', () => {
        const truth = new Truth(0.9, 0.8);
        const budget = {priority: 0.7, durability: 0.6, quality: 0.9};
        const task = new Task({term, punctuation: '!', truth, budget});

        expect(task.type).toBe('GOAL');
        expect(task.truth).toEqual(truth);
        expect(task.budget).toEqual(budget);
    });

    test('should throw an error if not initialized with a Term', () => {
        expect(() => new Task({term: 'not-a-term'})).toThrow('Task must be initialized with a valid Term object.');
    });

    test('should be immutable', () => {
        const task = new Task({term});
        expect(() => {
            task.type = 'GOAL';
        }).toThrow();
    });

    test('should create an immutable copy with modified properties using clone()', () => {
        const task1 = new Task({term});

        const newTruth = new Truth(0.9, 0.9);
        const task2 = task1.clone({punctuation: '?', truth: newTruth});

        expect(task1.type).toBe('BELIEF');
        expect(task1.truth).toBeNull();
        expect(task2.type).toBe('QUESTION');
        expect(task2.truth).toEqual(newTruth);
        expect(task2.term).toBe(task1.term);
    });

    test('should identify task types correctly', () => {
        const belief = new Task({term, punctuation: '.'});
        const goal = new Task({term, punctuation: '!'});
        const question = new Task({term, punctuation: '?'});

        expect(belief.isBelief()).toBe(true);
        expect(belief.isGoal()).toBe(false);
        expect(goal.isGoal()).toBe(true);
        expect(question.isQuestion()).toBe(true);
    });

    test('should implement proper equality comparison', () => {
        const truth1 = new Truth(0.9, 0.9);
        const truth2 = new Truth(0.9, 0.9);
        const truth3 = new Truth(0.8, 0.8);
        const termB = termFactory.create({name: 'B'});

        const task1 = new Task({term, punctuation: '.', truth: truth1});
        const task2 = new Task({term, punctuation: '.', truth: truth2}); // Same content
        const task3 = new Task({term, punctuation: '.', truth: truth3}); // Different truth
        const task4 = new Task({term: termB, punctuation: '.', truth: truth1}); // Different term
        const task5 = new Task({term, punctuation: '!', truth: truth1}); // Different type

        expect(task1.equals(task2)).toBe(true);
        expect(task1.equals(task3)).toBe(false);
        expect(task1.equals(task4)).toBe(false);
        expect(task1.equals(task5)).toBe(false);
        expect(task1.equals(null)).toBe(false);
    });

    test('should produce a correct string representation', () => {
        const truth = new Truth(0.9, 0.8);
        const task = new Task({term, punctuation: '.', truth});
        expect(task.toString()).toBe('A. %0.90;0.80%');
    });
});