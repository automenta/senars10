/**
 * Modus Ponens tests using the new TestNAR framework.
 * Adapted from v9 implementation.
 * Updated to use flexible truth matching for better resilience to implementation changes.
 */

import {TaskMatch, TestNAR} from '../../src/testing/TestNAR.js';

describe('Modus Ponens Tests (with new TestNAR)', () => {
    it('should derive b from (a ==> b) and a with correct truth value', async () => {
        const result = await new TestNAR()
            .input('(a ==> b)', 0.9, 0.9)
            .input('a', 0.8, 0.8)
            .run(2)
            .expect(new TaskMatch('b').withFlexibleTruth(0.72, 0.65, 0.05)) // ~0.9*0.8 with 5% tolerance
            .execute();

        // The execute method will throw if the expectation fails.
        // If it completes without error, the test is considered passed.
        // We can add an explicit assertion for clarity.
        expect(result).toBe(true);
    });

    it('should not derive without the antecedent', async () => {
        const result = await new TestNAR()
            .input('(a ==> b)', 0.9, 0.9)
            // Missing the antecedent 'a'
            .run(1)
            .expectNot('b')
            .execute();

        expect(result).toBe(true);
    });

    it('should work with complex terms', async () => {
        const result = await new TestNAR()
            .input('(sunny_day ==> good_mood)', 0.85, 0.9)
            .input('sunny_day', 0.9, 0.85)
            .run(2)
            .expect(new TaskMatch('good_mood').withFlexibleTruth(0.77, 0.69, 0.05)) // ~0.85*0.9 with 5% tolerance
            .execute();

        expect(result).toBe(true);
    });
});