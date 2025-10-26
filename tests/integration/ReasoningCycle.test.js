import { AgentBuilder } from '../../src/AgentBuilder.js';
import { TaskMatch, TestNAR } from '../../src/testing/TestNAR.js';

describe('NAL Reasoning Cycle Validation', () => {
    it('should perform a basic deduction', async () => {
        const agent = await new AgentBuilder().withCoreRules().build();
        const testNAR = new TestNAR(agent.nar);
        const result = await testNAR
            .input('(a ==> b)', 0.9, 0.9)
            .input('(b ==> c)', 0.9, 0.9)
            .run(20) // More cycles to ensure inference
            .expect(new TaskMatch('(a ==> c)'))
            .execute();

        const nar = testNAR.getNAR();

        expect(result).toBe(true);
    });
});
