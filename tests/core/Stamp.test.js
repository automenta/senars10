import {ArrayStamp, Stamp} from '../../src/Stamp.js';

describe('Stamp', () => {
    let stamp;

    beforeEach(() => {
        stamp = new ArrayStamp({
            id: 'test-id',
            creationTime: 12345,
            source: 'INPUT',
            derivations: ['d1', 'd2'],
        });
    });

    test('should create a Stamp instance with specified properties', () => {
        expect(stamp).toBeInstanceOf(ArrayStamp);
        expect(stamp.id).toBe('test-id');
        expect(stamp.creationTime).toBe(12345);
        expect(stamp.source).toBe('INPUT');
        expect(stamp.derivations).toEqual(['d1', 'd2']);
    });

    test('should be immutable', () => {
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
        expect(inputStamp.creationTime).toBeCloseTo(Date.now(), -2);
    });

    test('should derive a new stamp from parents', () => {
        const parent1 = new ArrayStamp({id: 'p1', derivations: ['d1']});
        const parent2 = new ArrayStamp({id: 'p2', derivations: ['d2']});
        const derivedStamp = Stamp.derive([parent1, parent2]);

        expect(derivedStamp).toBeInstanceOf(ArrayStamp);
        expect(derivedStamp.source).toBe('DERIVED');
        expect(derivedStamp.derivations).toEqual(expect.arrayContaining(['p1', 'p2', 'd1', 'd2']));
        expect(derivedStamp.derivations.length).toBe(4);
    });

    test('should handle derivation with overlapping parent derivations', () => {
        const parent1 = new ArrayStamp({id: 'p1', derivations: ['d1', 'd2']});
        const parent2 = new ArrayStamp({id: 'p2', derivations: ['d2', 'd3']});
        const derivedStamp = Stamp.derive([parent1, parent2]);

        expect(derivedStamp.derivations).toEqual(expect.arrayContaining(['p1', 'p2', 'd1', 'd2', 'd3']));
        expect(derivedStamp.derivations.length).toBe(5); // Set logic prevents duplicates
    });

    test('should correctly check for equality', () => {
        const stamp1 = new ArrayStamp({id: 's1'});
        const stamp1Clone = new ArrayStamp({id: 's1'});
        const stamp2 = new ArrayStamp({id: 's2'});

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