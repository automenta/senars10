import { AgentBuilder } from '../src/config/AgentBuilder.js';
import { Agent } from '../src/Agent.js';

describe('AgentBuilder', () => {
    test('should create an agent with default configuration', () => {
        const agent = new AgentBuilder().build();
        
        expect(agent).toBeInstanceOf(Agent);
        expect(agent.getNAR()).toBeDefined();
        expect(agent.getEvaluator()).toBeDefined();
        expect(agent.getInputTasks()).toBeDefined();
    });

    test('should create an agent with metrics enabled', () => {
        const agent = new AgentBuilder()
            .withMetrics(true)
            .build();
        
        expect(agent.getMetricsMonitor()).toBeDefined();
    });

    test('should create an agent with embeddings enabled', () => {
        const agent = new AgentBuilder()
            .withEmbeddings({ enabled: true, model: 'test-model' })
            .build();
        
        expect(agent.getEmbeddingLayer()).toBeDefined();
    });

    test('should create an agent with LM enabled', () => {
        const agent = new AgentBuilder()
            .withLM(true)
            .build();
        
        expect(agent.getLM()).toBeDefined();
    });

    test('should create an agent with tools enabled', () => {
        const agent = new AgentBuilder()
            .withTools(true)
            .build();
        
        expect(agent.getTools()).toBeDefined();
    });

    test('should create an agent with functors configured', () => {
        const agent = new AgentBuilder()
            .withFunctors(['core-arithmetic'])
            .build();
        
        const functorRegistry = agent.getEvaluator().getFunctorRegistry();
        expect(functorRegistry.has('add')).toBe(true);
        expect(functorRegistry.has('multiply')).toBe(true);
    });

    test('should create an agent with configuration object', () => {
        const agent = new AgentBuilder()
            .withConfig({
                subsystems: {
                    metrics: true,
                    embeddingLayer: { enabled: true },
                    functors: ['core-arithmetic'],
                    rules: ['syllogistic-core'],
                    tools: false,
                    lm: true
                }
            })
            .build();
        
        expect(agent.getMetricsMonitor()).toBeDefined();
        expect(agent.getEmbeddingLayer()).toBeDefined();
        expect(agent.getLM()).toBeDefined();
        expect(agent.getTools()).toBeDefined();
        
        const functorRegistry = agent.getEvaluator().getFunctorRegistry();
        expect(functorRegistry.has('add')).toBe(true);
    });
    
    test('should allow selective subsystem disabling', () => {
        const agent = new AgentBuilder()
            .withConfig({
                subsystems: {
                    metrics: false, // Note: metrics monitor is created by default in NAR, but may be disabled
                    embeddingLayer: { enabled: false },
                    tools: false,
                    lm: false
                }
            })
            .build();
        
        // Note: embedding layer, LM, and tools can be truly disabled
        expect(agent.getEmbeddingLayer()).toBeNull();
        expect(agent.getLM() === null || agent.getLM() === undefined).toBe(true);
        expect(agent.getTools()).toBeNull();
    });
});