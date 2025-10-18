// Test to verify the new convenience constructor functionality
import {TermFactory} from '../../../src/term/TermFactory.js';
import {Task} from '../../../src/task/Task.js';
import {Truth} from '../../../src/Truth.js';

describe('Task convenience constructor', () => {
    let termFactory;
    let term;

    beforeEach(() => {
        termFactory = new TermFactory();
        term = termFactory.create("test");
    });

    test('should create task with convenience constructor (term, punctuation, truth, priority)', () => {
        const truth = new Truth(0.8, 0.7);
        const task = new Task(term, '.', truth, 0.9);

        expect(task.term).toBe(term);
        expect(task.type).toBe('BELIEF');
        expect(task.truth).toBe(truth);
        expect(task.priority).toBe(0.9);
    });

    test('should create belief task with punctuation "."', () => {
        const task = new Task(term, '.', null, 0.5);

        expect(task.type).toBe('BELIEF');
    });

    test('should create goal task with punctuation "!"', () => {
        const task = new Task(term, '!', null, 0.5);

        expect(task.type).toBe('GOAL');
    });

    test('should create question task with punctuation "?"', () => {
        const task = new Task(term, '?', null, 0.5);

        expect(task.type).toBe('QUESTION');
    });

    test('should use default priority when not provided', () => {
        const task = new Task(term, '.', null);

        expect(task.priority).toBe(0.5); // Default priority
    });

    test('should use null truth when not provided', () => {
        const task = new Task(term, '.', null);

        expect(task.truth).toBeNull();
    });

    test('should throw error for invalid punctuation', () => {
        expect(() => {
            new Task(term, '*', null, 0.5);
        }).toThrow('Invalid punctuation: *');
    });

    test('should throw error for non-string punctuation', () => {
        expect(() => {
            new Task(term, 123, null, 0.5);
        }).toThrow('Punctuation must be a string');
    });

    test('should maintain compatibility with old constructor', () => {
        const oldTask = new Task({
            term,
            type: 'BELIEF',
            truth: new Truth(0.7, 0.8),
            priority: 0.6
        });

        expect(oldTask.term).toBe(term);
        expect(oldTask.type).toBe('BELIEF');
        expect(oldTask.truth.f).toBe(0.7);
        expect(oldTask.priority).toBe(0.6);
    });

    test('should work with immutable operations', () => {
        const task = new Task(term, '.', new Truth(0.8, 0.7), 0.5);
        const updatedTask = task.withPriority(0.9);

        expect(updatedTask.priority).toBe(0.9);
        expect(updatedTask.term).toBe(task.term);
        expect(updatedTask.truth.f).toBe(0.8);
        expect(updatedTask.type).toBe('BELIEF');
    });

    test('should work with withTruth operation after convenience constructor', () => {
        const task = new Task(term, '.', null, 0.5);
        const newTruth = new Truth(0.9, 0.8);
        const updatedTask = task.withTruth(newTruth);

        expect(task.truth).toBeNull();
        expect(updatedTask.truth).toBe(newTruth);
    });
});