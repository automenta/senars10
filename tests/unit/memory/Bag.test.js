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
        newAtom = name => termFactory.create({name});
        bag = new Bag(10);
        term = newAtom('A');
    });

    test('should initialize with correct default state', () => {
        expect(bag.size).toBe(0);
        expect(bag.maxSize).toBe(10);
    });

    test('should add an item', () => {
        const task = new Task({term});
        const added = bag.add(task);
        expect(added).toBe(true);
        expect(bag.size).toBe(1);
    });

    test('should not add a duplicate item', () => {
        const task = new Task({term});
        bag.add(task);
        const added = bag.add(task);
        expect(added).toBe(false);
        expect(bag.size).toBe(1);
    });

    test('should remove an item', () => {
        const task = new Task({term});
        bag.add(task);
        const removed = bag.remove(task);
        expect(removed).toBe(true);
        expect(bag.size).toBe(0);
    });

    test('should peek at the highest priority item', () => {
        const task1 = new Task({term, budget: {priority: 0.5}});
        const task2 = new Task({term: newAtom('B'), budget: {priority: 0.8}});
        bag.add(task1);
        bag.add(task2);
        expect(bag.peek()).toBe(task2);
    });

    test('should get items in priority order', () => {
        const task1 = new Task({term, budget: {priority: 0.5}});
        const task2 = new Task({term: newAtom('B'), budget: {priority: 0.8}});
        bag.add(task1);
        bag.add(task2);
        const items = bag.getItemsInPriorityOrder();
        expect(items).toEqual([task2, task1]);
    });

    test('should apply decay to priorities', () => {
        const task1 = new Task({term, budget: {priority: 0.5}});
        const task2 = new Task({term: newAtom('B'), budget: {priority: 0.8}});
        bag.add(task1);
        bag.add(task2);

        bag.applyDecay(0.5);

        const items = bag.getItemsInPriorityOrder();
        expect(bag.getPriority(items[0])).toBe(0.4);
        expect(bag.getPriority(items[1])).toBe(0.25);
    });
});