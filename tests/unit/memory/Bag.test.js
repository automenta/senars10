import {Bag} from '../../../src/memory/Bag.js';
import {Task} from '../../../src/task/Task.js';
import {TermFactory} from '../../../src/term/TermFactory.js';

describe('Bag', () => {
    let bag;
    let termFactory;
    let createAtom;

    beforeEach(() => {
        bag = new Bag(10);
        termFactory = new TermFactory();
        createAtom = (name) => termFactory.create({name});
    });

    describe('Basic operations', () => {
        test('initializes with the correct default state', () => {
            expect(bag.size).toBe(0);
            expect(bag.maxSize).toBe(10);
        });

        test('adds an item', () => {
            const task = new Task({term: createAtom('A')});
            expect(bag.add(task)).toBe(true);
            expect(bag.size).toBe(1);
        });

        test('does not add a duplicate item', () => {
            const task = new Task({term: createAtom('A')});
            bag.add(task);
            expect(bag.add(task)).toBe(false);
            expect(bag.size).toBe(1);
        });

        test('removes an item', () => {
            const task = new Task({term: createAtom('A')});
            bag.add(task);
            expect(bag.remove(task)).toBe(true);
            expect(bag.size).toBe(0);
        });
    });

    describe('Priority-based operations', () => {
        let task1, task2;

        beforeEach(() => {
            task1 = new Task({term: createAtom('A'), budget: {priority: 0.5}});
            task2 = new Task({term: createAtom('B'), budget: {priority: 0.8}});
            bag.add(task1);
            bag.add(task2);
        });

        test('peeks at the highest priority item', () => {
            expect(bag.peek()).toBe(task2);
        });

        test('gets items in priority order', () => {
            const items = bag.getItemsInPriorityOrder();
            expect(items).toEqual([task2, task1]);
        });

        test('applies decay to priorities', () => {
            bag.applyDecay(0.5);
            const items = bag.getItemsInPriorityOrder();
            expect(bag.getPriority(items[0])).toBe(0.4);
            expect(bag.getPriority(items[1])).toBe(0.25);
        });
    });
});
