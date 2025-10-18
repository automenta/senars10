import {Truth} from '../../../src/Truth.js';

describe('Truth', () => {
    test('should create a new Truth instance with correct properties', () => {
        const truth = new Truth(0.9, 0.8);
        expect(truth.f).toBe(0.9);
        expect(truth.c).toBe(0.8);
    });

    test('should enforce immutability', () => {
        const truth = new Truth(0.9, 0.8);
        expect(() => {
            truth.f = 0.5;
        }).toThrow();
    });

    test('should correctly compare two Truth instances', () => {
        const truth1 = new Truth(0.9, 0.8);
        const truth2 = new Truth(0.9, 0.8);
        const truth3 = new Truth(0.5, 0.8);
        expect(truth1.equals(truth2)).toBe(true);
        expect(truth1.equals(truth3)).toBe(false);
    });
});