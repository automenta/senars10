import {TruthFunctions} from '../../../../src/reasoning/nal/TruthFunctions.js';
import {Truth} from '../../../../src/Truth.js';

describe('TruthFunctions', () => {
    describe('Basic Truth Operations', () => {
        it('should perform deduction correctly', () => {
            const t1 = new Truth(0.8, 0.9);
            const t2 = new Truth(0.7, 0.8);

            const result = TruthFunctions.deduction(t1, t2);
            expect(result).toBeDefined();
            expect(typeof result.frequency).toBe('number');
            expect(typeof result.confidence).toBe('number');
        });

        it('should perform induction correctly', () => {
            const t1 = new Truth(0.8, 0.9);
            const t2 = new Truth(0.7, 0.8);

            const result = TruthFunctions.induction(t1, t2);
            expect(result).toBeDefined();
            expect(typeof result.frequency).toBe('number');
            expect(typeof result.confidence).toBe('number');
        });

        it('should perform abduction correctly', () => {
            const t1 = new Truth(0.8, 0.9);
            const t2 = new Truth(0.7, 0.8);

            const result = TruthFunctions.abduction(t1, t2);
            expect(result).toBeDefined();
            expect(typeof result.frequency).toBe('number');
            expect(typeof result.confidence).toBe('number');
        });

        it('should perform revision correctly', () => {
            const t1 = new Truth(0.8, 0.9);
            const t2 = new Truth(0.7, 0.8);

            const result = TruthFunctions.revision(t1, t2);
            expect(result).toBeDefined();
            expect(typeof result.frequency).toBe('number');
            expect(typeof result.confidence).toBe('number');
        });

        it('should perform negation correctly', () => {
            const t = new Truth(0.8, 0.9);

            const result = TruthFunctions.negation(t);
            expect(result).toBeDefined();
            expect(typeof result.frequency).toBe('number');
            expect(typeof result.confidence).toBe('number');
            expect(result.frequency).toBeCloseTo(0.2); // 1 - 0.8
            expect(result.confidence).toBeCloseTo(0.9);
        });
    });

    describe('Edge Cases', () => {
        it('should handle null inputs gracefully', () => {
            const result1 = TruthFunctions.deduction(null, new Truth(0.5, 0.9));
            const result2 = TruthFunctions.deduction(new Truth(0.5, 0.9), null);
            const result3 = TruthFunctions.deduction(null, null);

            expect(result1).toBeNull();
            expect(result2).toBeNull();
            expect(result3).toBeNull();
        });

        it('should handle object inputs (frequency/confidence format)', () => {
            const v1 = {frequency: 0.8, confidence: 0.9};
            const v2 = {frequency: 0.7, confidence: 0.8};

            const result = TruthFunctions.deduction(v1, v2);
            expect(result).toBeDefined();
            expect(typeof result.frequency).toBe('number');
            expect(typeof result.confidence).toBe('number');
        });
    });
});