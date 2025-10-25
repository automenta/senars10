import { AgentBuilder } from '../../src/AgentBuilder.js';
import { Agent } from '../../src/Agent.js';
import { NAR } from '../../src/nar/NAR.js';
import { ReasoningModule } from '../../src/module/ReasoningModule.js';
import { MetricsModule } from '../../src/module/MetricsModule.js';
import { ToolModule } from '../../src/module/ToolModule.js';
import { LMModule } from '../../src/module/LMModule.js';

describe('AgentBuilder', () => {
    let agent;

    afterEach(() => {
        if (agent && agent.modules) {
            agent.modules.forEach(module => {
                if (typeof module.shutdown === 'function') {
                    module.shutdown();
                }
            });
        }
    });

    it('should construct a minimal agent with a NAR instance', async () => {
        const builder = new AgentBuilder();
        agent = await builder.build();

        expect(agent).toBeInstanceOf(Agent);
        expect(agent.nar).toBeInstanceOf(NAR);
        expect(agent.modules).toHaveLength(0);
    });

    it('should configure the NAR with the provided config', async () => {
        const narConfig = { cycle: { delay: 100 } };
        const builder = new AgentBuilder().withNARConfig(narConfig);
        agent = await builder.build();

        expect(agent.nar.config.get('cycle.delay')).toBe(100);
    });

    it('should add and initialize a reasoning module', async () => {
        const builder = new AgentBuilder().withModule(new ReasoningModule(), { rules: ['syllogistic-core'] });
        agent = await builder.build();

        expect(agent.modules).toHaveLength(1);
        expect(agent.modules[0]).toBeInstanceOf(ReasoningModule);
        // Verify that the rules have been registered
        expect(agent.nar._ruleEngine.rules.length).toBeGreaterThan(0);
    });

    it('should add and initialize a metrics module', async () => {
        const builder = new AgentBuilder().withModule(new MetricsModule(), { enabled: true });
        agent = await builder.build();

        expect(agent.modules).toHaveLength(1);
        expect(agent.modules[0]).toBeInstanceOf(MetricsModule);
        expect(agent.modules[0].enabled).toBe(true);
    });

    it('should add and initialize a tool module', async () => {
        const builder = new AgentBuilder().withModule(new ToolModule());
        agent = await builder.build();

        expect(agent.modules).toHaveLength(1);
        expect(agent.modules[0]).toBeInstanceOf(ToolModule);
        expect(agent.tools).toBeDefined();
    });

    it('should add and initialize an LM module', async () => {
        const builder = new AgentBuilder().withModule(new LMModule());
        agent = await builder.build();

        expect(agent.modules).toHaveLength(1);
        expect(agent.modules[0]).toBeInstanceOf(LMModule);
        expect(agent.lm).toBeDefined();
    });

    it('should build an agent with multiple modules', async () => {
        const builder = new AgentBuilder()
            .withModule(new ReasoningModule())
            .withModule(new MetricsModule())
            .withModule(new ToolModule())
            .withModule(new LMModule());

        agent = await builder.build();

        expect(agent.modules).toHaveLength(4);
        expect(agent.nar._ruleEngine.rules.length).toBeGreaterThan(0);
        expect(agent.tools).toBeDefined();
        expect(agent.lm).toBeDefined();
    });

    it('should throw an error if a non-module is added', () => {
        const builder = new AgentBuilder();
        expect(() => builder.withModule({})).toThrow('Module must be an instance of BaseModule.');
    });
});
