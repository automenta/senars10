import {Task} from '../../../src/core/task/Task.js';
import {Truth} from '../../../src/core/Truth.js';
import {Stamp} from '../../../src/core/Stamp.js';
import {TermFactory} from '../../../src/core/term/TermFactory.js';

describe('Task', () => {
    let termFactory;
    let term;
    let atomB;

    beforeEach(() => {
        termFactory = new TermFactory();
        term = termFactory.create({components: ['A']});
        atomB = termFactory.create({components: ['B']});
    });

    test('should create tasks with correct properties', () => {
        const truth = new Truth(0.9, 0.8);
        const task = new Task(term, '.', truth);

        expect(task.term).toBe(term);
        expect(task.type).toBe('BELIEF');
        expect(task.truth).toBe(truth);
        expect(task.priority).toBe(0.5); // default
        expect(task.budget).toBe(1.0); // default
        expect(task.stamp).toBeInstanceOf(Stamp);
        expect(task.createdAt).toBeDefined();
        expect(task.accessedAt).toBe(task.createdAt);
    });

    test('should throw an error if not initialized with a Term', () => {
        expect(() => new Task({
            term: 'not-a-term',
            type: 'BELIEF'
        })).toThrow('Task must be initialized with a valid Term object.');
    });

    test('should maintain strict immutability', () => {
        const task = new Task(term, '.', null);
        expect(() => {
            task.type = 'GOAL';
        }).toThrow();
    });

    test('should create immutable copies with modified properties', () => {
        const task1 = new Task(term, '.', null, 0.5);

        const task2 = task1.withPriority(0.8);
        expect(task1.priority).toBe(0.5);
        expect(task2.priority).toBe(0.8);
        expect(task2.term).toBe(task1.term);

        const truth = new Truth(0.9, 0.9);
        const task3 = task2.withTruth(truth);
        expect(task2.truth).toBeNull();
        expect(task3.truth).toBe(truth);

        const time = Date.now() + 1000;
        const task4 = task3.withAccessedAt(time);
        expect(task3.accessedAt).not.toBe(time);
        expect(task4.accessedAt).toBe(time);
    });

    test('should identify task types correctly', () => {
        const belief = new Task(term, '.');
        const goal = new Task(term, '!');
        const question = new Task(term, '?');

        expect(belief.isBelief()).toBe(true);
        expect(belief.isGoal()).toBe(false);
        expect(goal.isGoal()).toBe(true);
        expect(question.isQuestion()).toBe(true);
    });

    test('should implement proper equality comparison', () => {
        const truth1 = new Truth(0.9, 0.9);
        const truth2 = new Truth(0.9, 0.9);
        const truth3 = new Truth(0.8, 0.8);

        const task1 = new Task(term, '.', truth1);
        const task2 = new Task(term, '.', truth2); // Same content
        const task3 = new Task(term, '.', truth3); // Different truth
        const task4 = new Task(atomB, '.', truth1); // Different term
        const task5 = new Task(term, '!', truth1); // Different type

        expect(task1.equals(task2)).toBe(true);
        expect(task1.equals(task3)).toBe(false);
        expect(task1.equals(task4)).toBe(false);
        expect(task1.equals(task5)).toBe(false);
        expect(task1.equals(null)).toBe(false);
    });
});