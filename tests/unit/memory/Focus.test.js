import {Focus} from '../../../src/memory/Focus.js';
import {Task} from '../../../src/task/Task.js';
import {TermFactory} from '../../../src/term/TermFactory.js';

describe('Focus', () => {
    let focus;
    let termFactory;
    let config;

    beforeEach(() => {
        termFactory = new TermFactory();
        config = {
            maxFocusSets: 3,
            defaultFocusSetSize: 5,
            attentionDecayRate: 0.1
        };
        focus = new Focus(config);
    });

    test('should initialize with default focus set', () => {
        expect(focus.getCurrentFocus()).toBe('default');
        expect(focus.getStats().currentFocus).toBe('default');
        expect(focus.getStats().totalFocusSets).toBe(1);
    });

    test('should create new focus sets correctly', () => {
        const created = focus.createFocusSet('test-set', 10);
        expect(created).toBe(true);
        expect(focus.getStats().totalFocusSets).toBe(2);
        expect(focus.getStats().focusSets['test-set']).toBeDefined();
    });

    test('should not create duplicate focus sets', () => {
        focus.createFocusSet('test-set');
        const createdAgain = focus.createFocusSet('test-set');
        expect(createdAgain).toBe(false);
        expect(focus.getStats().totalFocusSets).toBe(2); // default + test-set
    });

    test('should not exceed maximum focus sets', () => {
        focus.createFocusSet('set1');
        focus.createFocusSet('set2');

        const createdFourth = focus.createFocusSet('set4');
        expect(createdFourth).toBe(false);
        expect(focus.getStats().totalFocusSets).toBe(3);
    });

    test('should set current focus correctly', () => {
        focus.createFocusSet('test-set');
        const setSuccess = focus.setFocus('test-set');
        expect(setSuccess).toBe(true);
        expect(focus.getCurrentFocus()).toBe('test-set');
    });

    test('should not set non-existent focus as current', () => {
        const setSuccess = focus.setFocus('non-existent');
        expect(setSuccess).toBe(false);
        expect(focus.getCurrentFocus()).toBe('default');
    });

    test('should add tasks to current focus set', () => {
        const term = termFactory.create({name: 'A'});
        const task = new Task({
            term,
            truth: {frequency: 0.9, confidence: 0.8},
            punctuation: '.',
            budget: {priority: 0.7}
        });

        const added = focus.addTaskToFocus(task);
        expect(added).toBe(true);

        const tasks = focus.getTasks(10);
        expect(tasks).toHaveLength(1);
        expect(tasks[0]).toBe(task);
    });

    test('should not add task with duplicate hash', () => {
        const term = termFactory.create({name: 'A'});
        const task = new Task({
            term,
            truth: {frequency: 0.9, confidence: 0.8},
            punctuation: '.',
            budget: {priority: 0.7}
        });

        focus.addTaskToFocus(task);
        const addedAgain = focus.addTaskToFocus(task);
        expect(addedAgain).toBe(false);

        const tasks = focus.getTasks(10);
        expect(tasks).toHaveLength(1);
    });

    test('should remove lowest priority task when at capacity', () => {
        focus.createFocusSet('small-set', 2);
        focus.setFocus('small-set');

        const term1 = termFactory.create({name: 'A'});
        const term2 = termFactory.create({name: 'B'});
        const term3 = termFactory.create({name: 'C'});

        const task1 = new Task({term: term1, punctuation: '.', budget: {priority: 0.5}});
        const task2 = new Task({term: term2, punctuation: '.', budget: {priority: 0.3}});
        const task3 = new Task({term: term3, punctuation: '.', budget: {priority: 0.8}});

        focus.addTaskToFocus(task1);
        focus.addTaskToFocus(task2);
        focus.addTaskToFocus(task3);

        const tasks = focus.getTasks(10);
        expect(tasks).toHaveLength(2);
        expect(tasks[0].budget.priority).toBe(0.8); // task3
        expect(tasks[1].budget.priority).toBe(0.5); // task1
    });

    test('should remove task from all focus sets', () => {
        focus.createFocusSet('set1');
        focus.createFocusSet('set2');

        const term = termFactory.create({name: 'A'});
        const task = new Task({term, punctuation: '.', budget: {priority: 0.7}});

        focus.setFocus('set1');
        focus.addTaskToFocus(task);
        focus.setFocus('set2');
        focus.addTaskToFocus(task);

        const removed = focus.removeTaskFromFocus(task.stamp.id);
        expect(removed).toBe(true);

        focus.setFocus('set1');
        const tasks1 = focus.getTasks(10);
        expect(tasks1).toHaveLength(0);

        focus.setFocus('set2');
        const tasks2 = focus.getTasks(10);
        expect(tasks2).toHaveLength(0);
    });

    test('should update attention score correctly', () => {
        const initialStats = focus.getStats();
        const initialAttention = initialStats.focusSets['default'].attentionScore;

        focus.updateAttention('default', 0.2);

        const updatedStats = focus.getStats();
        expect(updatedStats.focusSets['default'].attentionScore).toBe(
            Math.max(0, Math.min(1, initialAttention + 0.2))
        );
    });

    test('should apply decay to all focus sets', () => {
        focus.createFocusSet('test-set');
        focus.updateAttention('default', 0.5);
        focus.updateAttention('test-set', 0.8);

        focus.applyDecay();

        const stats = focus.getStats();
        expect(stats.focusSets['default'].attentionScore).toBeLessThan(0.5);
        expect(stats.focusSets['test-set'].attentionScore).toBeLessThan(0.8);
    });

    test('should provide comprehensive statistics', () => {
        focus.createFocusSet('test-set');
        focus.updateAttention('default', 0.3);
        focus.updateAttention('test-set', 0.7);

        const stats = focus.getStats();
        expect(stats.currentFocus).toBe('default');
        expect(stats.totalFocusSets).toBe(2);
        expect(stats.focusSets['default']).toBeDefined();
        expect(stats.focusSets['test-set']).toBeDefined();
        expect(stats.focusSets['default'].attentionScore).toBe(0.3);
        expect(stats.focusSets['test-set'].attentionScore).toBe(0.7);
    });

    test('should clear all focus sets', () => {
        focus.createFocusSet('test-set');
        focus.updateAttention('default', 0.5);
        focus.updateAttention('test-set', 0.8);

        focus.clear();

        expect(focus.getCurrentFocus()).toBeNull();
        expect(focus.getStats().totalFocusSets).toBe(0);
    });

    test('should handle edge cases gracefully', () => {
        // Test getting tasks from non-existent focus
        focus.setFocus('non-existent');
        const tasks = focus.getTasks(10);
        expect(tasks).toEqual([]);

        // Test updating attention for non-existent focus
        expect(() => {
            focus.updateAttention('non-existent', 0.1);
        }).not.toThrow();

        // Test removing task that doesn't exist
        const removed = focus.removeTaskFromFocus('non-existent-hash');
        expect(removed).toBe(false);
    });
});