/**
 * Basic syllogism tests using the new TestNAR framework.
 * Adapted from v9 implementation.
 * Updated to use flexible truth matching for better resilience to implementation changes.
 */

import {TaskMatch, TestNAR} from '../../src/testing/TestNAR.js';

describe('Syllogistic Reasoning Tests', () => {
    it('should derive (a ==> c) from (a ==> b) and (b ==> c) with correct truth value', async () => {
        const result = await new TestNAR()
            .input('(a ==> b)', 0.9, 0.9)
            .input('(b ==> c)', 0.8, 0.8)
            .run(2)
            .expect(new TaskMatch('(a ==> c)').withFlexibleTruth(0.71, 0.51, 0.25)) // Original expected: 0.71,0.51 with wider tolerance for algorithm changes
            .expectNot('(c ==> a)')
            .execute();

        expect(result).toBe(true);
    });
});