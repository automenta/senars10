/**
 * Modus Ponens tests using the new TestNAR framework.
 * Adapted from v9 implementation.
 */

import {TaskMatch, TestNAR} from '../../src/testing/TestNAR.js';

describe('Modus Ponens Tests (with new TestNAR)', () => {
    it('should derive b from (a ==> b) and a with correct truth value', async () => {
        const result = await new TestNAR()
            .input('(a ==> b)', 0.9, 0.9)
            .input('a', 0.8, 0.8)
            .run(2)
            .expect(new TaskMatch('b').withTruth(0.71, 0.64)) // freq=0.9*0.8=0.72, conf=0.9*0.8*0.9=0.648. Rounded down for the test.
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
            .expect(new TaskMatch('good_mood').withTruth(0.76, 0.64)) // freq=0.85*0.9=0.765, conf=0.85*0.9*0.9=0.6885. Rounded down.
            .execute();

        expect(result).toBe(true);
    });
});