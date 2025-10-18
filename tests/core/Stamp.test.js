import {ArrayStamp, BloomStamp, Stamp} from '../../src/Stamp.js';

describe('Stamp', () => {
    test('should not allow instantiation of the abstract Stamp class', () => {
        expect(() => new Stamp()).toThrow("Abstract classes can't be instantiated.");
    });

    describe('ArrayStamp', () => {
        let stamp1;

        beforeEach(() => {
            stamp1 = new ArrayStamp('s1', 12345, 'INPUT');
        });

        test('should create an ArrayStamp instance', () => {
            expect(stamp1).toBeInstanceOf(ArrayStamp);
            expect(stamp1.id).toBe('s1');
            expect(stamp1.occurrenceTime).toBe(12345);
            expect(stamp1.source).toBe('INPUT');
            expect(stamp1.derivations).toEqual([]);
        });

        test('should be immutable', () => {
            expect(() => {
                stamp1.id = 's2';
            }).toThrow();
            expect(() => {
                stamp1.derivations.push('s3');
            }).toThrow();
        });

        test('should correctly derive a new stamp', () => {
            const stamp2 = new ArrayStamp('s2', 12346, 'INPUT');
            const derivedStamp = ArrayStamp.derive([stamp1, stamp2]);

            expect(derivedStamp).toBeInstanceOf(ArrayStamp);
            expect(derivedStamp.source).toBe('INFERENCE');
            expect(derivedStamp.derivations).toContain('s1');
            expect(derivedStamp.derivations).toContain('s2');
        });

        test('should correctly check for equality', () => {
            const stamp1_clone = new ArrayStamp('s1', 12345, 'INPUT');
            const stamp2 = new ArrayStamp('s2', 12345, 'INPUT');
            expect(stamp1.equals(stamp1_clone)).toBe(true);
            expect(stamp1.equals(stamp2)).toBe(false);
        });
    });

    describe('BloomStamp', () => {
        test('should be an incomplete placeholder', () => {
            expect(() => new BloomStamp()).toThrow('BloomStamp is not yet implemented.');
        });
    });
});