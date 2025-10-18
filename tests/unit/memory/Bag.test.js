import {Bag} from '../../../src/memory/Bag.js';
import {Task} from '../../../src/task/Task.js';
import {TermFactory} from '../../../src/term/TermFactory.js';

describe('Bag', () => {
    let bag;
    let term;
    let termFactory;
    let newAtom;

    beforeEach(() => {
        termFactory = new TermFactory();
        newAtom = name => termFactory.create({components: [name]});
        bag = new Bag(10);
        term = newAtom('A');
    });

    test('should initialize with correct default state', () => {
        expect(bag.size).toBe(0);
        expect(bag.maxSize).toBe(10);
    });

    test('should add an item', () => {
        const task = new Task(term, '.', null);
        const added = bag.add(task, 0.5);
        expect(added).toBe(true);
        expect(bag.size).toBe(1);
    });

    test('should not add a duplicate item', () => {
        const task = new Task(term, '.', null);
        bag.add(task, 0.5);
        const added = bag.add(task, 0.5);
        expect(added).toBe(false);
        expect(bag.size).toBe(1);
    });

    test('should remove an item', () => {
        const task = new Task(term, '.', null);
        bag.add(task, 0.5);
        const removed = bag.remove(task);
        expect(removed).toBe(true);
        expect(bag.size).toBe(0);
    });

    test('should peek at the highest priority item', () => {
        const task1 = new Task(term, '.', null, 0.5);
        const task2 = new Task(newAtom('B'), '.', null, 0.8);
        bag.add(task1, 0.5);
        bag.add(task2, 0.8);
        expect(bag.peek()).toBe(task2);
    });

    test('should get items in priority order', () => {
        const task1 = new Task(term, '.', null, 0.5);
        const task2 = new Task(newAtom('B'), '.', null, 0.8);
        bag.add(task1, 0.5);
        bag.add(task2, 0.8);
        const items = bag.getItemsInPriorityOrder();
        expect(items).toEqual([task2, task1]);
    });

    test('should apply decay to priorities', () => {
        const task1 = new Task(term, '.', null, 0.5);
        const task2 = new Task(newAtom('B'), '.', null, 0.8);
        bag.add(task1, 0.5);
        bag.add(task2, 0.8);
        bag.applyDecay(0.5);
        const items = bag.getItemsInPriorityOrder();
        // Priorities are updated in the task objects directly
        expect(items[0].priority).toBe(0.4);
        expect(items[1].priority).toBe(0.25);
    });
});