import {ArrayStamp, Stamp} from '../../src/Stamp.js';
import {createStamp} from '../support/factories.js';
import {flexibleAssertions} from '../support/baseTestUtils.js';

describe('Stamp', () => {
    test('should create a Stamp instance with specified properties', () => {
        const stamp = createStamp({
            id: 'test-id',
            creationTime: 12345,
            source: 'INPUT',
            derivations: ['d1', 'd2'],
        });

        expect(stamp).toBeInstanceOf(ArrayStamp);
        expect(stamp.id).toBe('test-id');
        expect(stamp.creationTime).toBe(12345);
        expect(stamp.source).toBe('INPUT');
        expect(stamp.derivations).toEqual(['d1', 'd2']);
    });

    test('should be immutable', () => {
        const stamp = createStamp();
        expect(() => {
            stamp.id = 'new-id';
        }).toThrow();
        expect(() => {
            stamp.derivations.push('d3');
        }).toThrow();
    });

    test('should create an input stamp using static factory', () => {
        const inputStamp = Stamp.createInput();
        expect(inputStamp).toBeInstanceOf(ArrayStamp);
        expect(inputStamp.source).toBe('INPUT');
        expect(inputStamp.derivations.length).toBe(0);
        flexibleAssertions.expectInRange(inputStamp.creationTime, Date.now() - 1000, Date.now() + 1000, 'creation time within reasonable range');
    });

    test('should derive a new stamp from parents, handling overlapping derivations', () => {
        const parent1 = createStamp({id: 'p1', derivations: ['d1']});
        const parent2 = createStamp({id: 'p2', derivations: ['d2']});
        const derivedStamp1 = Stamp.derive([parent1, parent2]);

        expect(derivedStamp1).toBeInstanceOf(ArrayStamp);
        expect(derivedStamp1.source).toBe('DERIVED');
        expect(derivedStamp1.derivations).toEqual(expect.arrayContaining(['p1', 'p2', 'd1', 'd2']));
        flexibleAssertions.expectInRange(derivedStamp1.derivations.length, 4, 4); // Flexible assertion to handle potential variations

        const parent3 = createStamp({id: 'p3', derivations: ['d1', 'd2']});
        const parent4 = createStamp({id: 'p4', derivations: ['d2', 'd3']});
        const derivedStamp2 = Stamp.derive([parent3, parent4]);

        expect(derivedStamp2.derivations).toEqual(expect.arrayContaining(['p3', 'p4', 'd1', 'd2', 'd3']));
        flexibleAssertions.expectInRange(derivedStamp2.derivations.length, 5, 5); // Set logic prevents duplicates
    });

    test('should correctly check for equality', () => {
        const stamp1 = createStamp({id: 's1'});
        const stamp1Clone = new ArrayStamp({id: 's1'}); // Keep one direct instantiation for variety
        const stamp2 = createStamp({id: 's2'});

        expect(stamp1.equals(stamp1Clone)).toBe(true);
        expect(stamp1.equals(stamp2)).toBe(false);
        expect(stamp1.equals(null)).toBe(false);
    });

    test('should generate a unique ID if none is provided', () => {
        const stamp1 = new ArrayStamp();
        const stamp2 = new ArrayStamp();
        expect(stamp1.id).not.toBe(stamp2.id);
    });
});
