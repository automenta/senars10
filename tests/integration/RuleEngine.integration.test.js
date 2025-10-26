import { AgentBuilder } from '../../src/AgentBuilder.js';
import { TaskMatch, TestNAR } from '../../src/testing/TestNAR.js';

describe('RuleEngine Integration Tests', () => {
    it('should register default rules during NAR initialization', async () => {
        const agent = await new AgentBuilder().withCoreRules().build();
        const nar = agent.nar;

        // Verify rules were registered successfully
        expect(nar._ruleEngine.rules.length).toBeGreaterThan(0);

        // Should have at least syllogistic and modus ponens rules
        const ruleIds = nar._ruleEngine.rules.map(rule => rule.id);
        expect(ruleIds).toContain('syllogism/deduction');
        expect(ruleIds).toContain('modusponens/deduction');

        nar.stop();
    });

    it('should perform basic modus ponens inference', async () => {
        const agent = await new AgentBuilder().withCoreRules().build();
        const testNAR = new TestNAR(agent.nar);
        const result = await testNAR
            .input('(a ==> b)', 0.9, 0.9)
            .input('a', 0.8, 0.8)
            .run(5)  // Run multiple cycles to ensure inference
            .expect(new TaskMatch('b').withTruth(0.71, 0.64))  // Expected from truth calculation
            .execute();

        expect(result).toBe(true);
    });

    it('should perform basic syllogistic inference', async () => {
        const agent = await new AgentBuilder().withCoreRules().build();
        const testNAR = new TestNAR(agent.nar);
        const result = await testNAR
            .input('(a ==> b)', 0.9, 0.9)
            .input('(b ==> c)', 0.8, 0.8)
            .run(5)  // Run multiple cycles to ensure inference
            .expect(new TaskMatch('(a ==> c)').withTruth(0.71, 0.51))  // Expected from deduction
            .execute();

        expect(result).toBe(true);
    });

    it('should handle repeated reasoning cycles without errors', async () => {
        const agent = await new AgentBuilder().withCoreRules().build();
        const nar = agent.nar;

        // Add premises
        await nar.input('(x ==> y). %0.8;0.7%');
        await nar.input('x. %0.9;0.8%');

        // Run multiple cycles
        for (let i = 0; i < 3; i++) {
            await nar.step();
        }

        // Verify that derived facts exist
        const yConcept = nar.memory.getConcept(nar._termFactory.create('y'));
        expect(yConcept).toBeDefined();
        if (yConcept) {
            const yTasks = yConcept.getTasksByType('BELIEF');
            expect(yTasks.length).toBeGreaterThan(0);
        }

        nar.stop();
    });
});