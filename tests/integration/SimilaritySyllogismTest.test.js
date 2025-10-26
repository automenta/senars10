/**
 * Integration tests for the SimilaritySyllogism rule using the TestNAR framework.
 */

import {TaskMatch, TestNAR} from '../../src/testing/TestNAR.js';

describe('Similarity Syllogism Reasoning Tests', () => {
    it('should derive (a <-> c) from (a <-> b) and (b <-> c) with correct truth value', async () => {
        const result = await new TestNAR()
            .input('(a <-> b)', 0.9, 0.9)
            .input('(b <-> c)', 0.8, 0.8)
            .run(5)
            .expect(new TaskMatch('(a <-> c)').withFlexibleTruth(0.72, 0.58, 0.01))
            .execute();

        expect(result).toBe(true);
    });
});
