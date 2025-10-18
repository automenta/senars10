import {FocusSetSelector} from '../../../src/memory/FocusSetSelector.js';
import {Task} from '../../../src/task/Task.js';
import {TermFactory} from '../../../src/term/TermFactory.js';
import {ArrayStamp} from '../../../src/Stamp.js';

describe('FocusSetSelector', () => {
    let selector;
    let termFactory;
    let currentTime;

    beforeEach(() => {
        termFactory = new TermFactory();
        currentTime = Date.now();
        selector = new FocusSetSelector({
            maxSize: 3,
            priorityThreshold: 0.2,
            priorityWeight: 0.5,
            urgencyWeight: 0.3,
            diversityWeight: 0.2
        });
    });

    test('should initialize with correct configuration', () => {
        expect(selector.config.maxSize).toBe(3);
        expect(selector.config.priorityThreshold).toBe(0.2);
        expect(selector.config.priorityWeight).toBe(0.5);
        expect(selector.config.urgencyWeight).toBe(0.3);
        expect(selector.config.diversityWeight).toBe(0.2);
    });

    test('should return empty array for no tasks', () => {
        const selected = selector.select([], currentTime);
        expect(selected).toEqual([]);
    });

    test('should return empty array for null/undefined tasks', () => {
        expect(selector.select(null, currentTime)).toEqual([]);
        expect(selector.select(undefined, currentTime)).toEqual([]);
    });

    test('should filter tasks below priority threshold', () => {
        const term = termFactory.create({name: 'A'});
        const lowPriorityTask = new Task({
            term,
            punctuation: '.',
            budget: {priority: 0.1} // Below threshold
        });
        const highPriorityTask = new Task({
            term,
            punctuation: '.',
            budget: {priority: 0.5} // Above threshold
        });

        const selected = selector.select([lowPriorityTask, highPriorityTask], currentTime);
        expect(selected).toHaveLength(1);
        expect(selected[0]).toBe(highPriorityTask);
    });

    test('should select tasks based on composite scoring', () => {
        const term1 = termFactory.create({name: 'A'});
        const term2 = termFactory.create({name: 'B'});
        const term3 = termFactory.create({name: 'C'});

        // Create tasks with different characteristics using stamps with different occurrence times
        const task1 = new Task({
            term: term1,
            punctuation: '.',
            budget: {priority: 0.8},
            stamp: new ArrayStamp({id: 'id1', creationTime: currentTime - 1000, source: 'INPUT'}),
        });

        const task2 = new Task({
            term: term2,
            punctuation: '.',
            budget: {priority: 0.6},
            stamp: new ArrayStamp({id: 'id2', creationTime: currentTime - 500, source: 'INPUT'}),
        });

        const task3 = new Task({
            term: term3,
            punctuation: '.',
            budget: {priority: 0.4},
            stamp: new ArrayStamp({id: 'id3', creationTime: currentTime - 2000, source: 'INPUT'}),
        });

        const selected = selector.select([task1, task2, task3], currentTime);
        expect(selected).toHaveLength(3);

        // Task1 should be first due to high priority and urgency
        expect(selected[0]).toBe(task1);
    });

    test('should respect maximum size limit', () => {
        const tasks = [];
        for (let i = 0; i < 5; i++) {
            const term = termFactory.create({components: [String.fromCharCode(65 + i)]});
            const task = new Task({
                term,
                punctuation: '.',
                budget: {priority: 0.5 + (i * 0.1)},
                stamp: new ArrayStamp({id: `id${i}`, creationTime: currentTime - (i * 100), source: 'INPUT'}),
            });
            tasks.push(task);
        }

        const selected = selector.select(tasks, currentTime);
        expect(selected).toHaveLength(3); // maxSize limit
    });

    test('should handle urgency calculation correctly', () => {
        const term = termFactory.create({components: ['A']});

        const recentTask = new Task({
            term,
            punctuation: '.',
            budget: {priority: 0.5},
            stamp: new ArrayStamp({id: 'recent', creationTime: currentTime - 100, source: 'INPUT'}),
        });

        const oldTask = new Task({
            term,
            punctuation: '.',
            budget: {priority: 0.5},
            stamp: new ArrayStamp({id: 'old', creationTime: currentTime - 10000, source: 'INPUT'}),
        });

        const selected = selector.select([recentTask, oldTask], currentTime);

        // Old task should be selected due to higher urgency
        expect(selected).toHaveLength(2);
        expect(selected[0]).toBe(oldTask);
    });

    test('should consider term complexity for diversity', () => {
        const simpleTerm = termFactory.create({name: 'A'});
        const complexTerm = termFactory.create({
            operator: '-->',
            components: [termFactory.create({name: 'A'}), termFactory.create({name: 'B'})]
        });

        const simpleTask = new Task({term: simpleTerm, punctuation: '.', budget: {priority: 0.5}});
        const complexTask = new Task({term: complexTerm, punctuation: '.', budget: {priority: 0.5}});

        const selected = selector.select([simpleTask, complexTask], currentTime);

        // Both should be selected, but complex task might get slight boost
        expect(selected).toHaveLength(2);
    });

    test('should update configuration correctly', () => {
        selector.configure({
            maxSize: 5,
            priorityThreshold: 0.3,
            priorityWeight: 0.6
        });

        expect(selector.config.maxSize).toBe(5);
        expect(selector.config.priorityThreshold).toBe(0.3);
        expect(selector.config.priorityWeight).toBe(0.6);
        expect(selector.config.urgencyWeight).toBe(0.3); // Unchanged
    });

    test('should handle edge case of all tasks having same timestamp', () => {
        const term1 = termFactory.create({name: 'A'});
        const term2 = termFactory.create({name: 'B'});

        const task1 = new Task({term: term1, punctuation: '.', budget: {priority: 0.5}});
        const task2 = new Task({term: term2, punctuation: '.', budget: {priority: 0.8}});

        // Same timestamp - urgency should be 0 for both
        const selected = selector.select([task1, task2], currentTime);

        expect(selected).toHaveLength(2);
        expect(selected[0]).toBe(task2); // Higher priority should win
    });

    test('should handle tasks with zero complexity', () => {
        const term = termFactory.create({name: 'A'});
        const task = new Task({term, punctuation: '.', budget: {priority: 0.5}});

        const selected = selector.select([task], currentTime);
        expect(selected).toHaveLength(1);
        expect(selected[0]).toBe(task);
    });

    test('should maintain selection stability across multiple calls', () => {
        const term = termFactory.create({name: 'A'});
        const task1 = new Task({term, punctuation: '.', budget: {priority: 0.8}});
        const task2 = new Task({term, punctuation: '.', budget: {priority: 0.6}});

        const selected1 = selector.select([task1, task2], currentTime);
        const selected2 = selector.select([task1, task2], currentTime);

        expect(selected1).toHaveLength(2);
        expect(selected2).toHaveLength(2);
        expect(selected1[0]).toBe(task1);
        expect(selected2[0]).toBe(task1);
    });
});