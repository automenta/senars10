/**
 * Integration tests for the SimilaritySyllogism rule using the TestNAR framework.
 */

import { AgentBuilder } from '../../src/AgentBuilder.js';
import { TaskMatch, TestNAR } from '../../src/testing/TestNAR.js';

describe('Similarity Syllogism Reasoning Tests', () => {
    it('should derive (a <-> c) from (a <-> b) and (b <-> c) with correct truth value', async () => {
        const agent = await new AgentBuilder().withCoreRules().build();
        const testNAR = new TestNAR(agent.nar);
        const result = await testNAR
            .input('(a <-> b)', 0.9, 0.9)
            .input('(b <-> c)', 0.8, 0.8)
            .run(5)
            .expect(new TaskMatch('(a <-> c)').withFlexibleTruth(0.72, 0.58, 0.01))
            .execute();

        expect(result).toBe(true);
    });
});
