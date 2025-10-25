/**
 * Example demonstrating the AgentBuilder functionality
 */
import { AgentBuilder } from '../src/config/AgentBuilder.js';

// Example 1: Create an agent with default configuration
console.log('=== Creating agent with default configuration ===');
const defaultAgent = new AgentBuilder().build();
console.log('Default agent created successfully');

// Example 2: Create an agent with specific subsystems enabled
console.log('\n=== Creating agent with metrics and embeddings enabled ===');
const customAgent = new AgentBuilder()
    .withMetrics(true)
    .withEmbeddings({ model: 'text-embedding-ada-002', enabled: true })
    .withLM(true)
    .withTools(false)
    .withFunctors(['core-arithmetic'])
    .build();

console.log('Custom agent created with:');
console.log('- Metrics:', customAgent.getMetricsMonitor() !== null);
console.log('- Embeddings:', customAgent.getEmbeddingLayer() !== null);
console.log('- Language Model:', customAgent.getLM() !== null);
console.log('- Tools:', customAgent.getTools() !== null);

// Example 3: Create an agent with configuration object
console.log('\n=== Creating agent with configuration object ===');
const configAgent = new AgentBuilder()
    .withConfig({
        subsystems: {
            metrics: true,
            embeddingLayer: { enabled: true, model: 'test-model' },
            functors: ['core-arithmetic', 'set-operations'],
            rules: ['syllogistic-core'],
            tools: false,
            lm: true
        }
    })
    .build();

console.log('Config agent created with:');
console.log('- Embedding layer:', configAgent.getEmbeddingLayer() !== null);
console.log('- Language model:', configAgent.getLM() !== null);

// Example 4: Create a minimal agent with only core functionality
console.log('\n=== Creating minimal agent ===');
const minimalAgent = new AgentBuilder()
    .withConfig({
        subsystems: {
            metrics: false,
            embeddingLayer: { enabled: false },
            functors: [],
            rules: [],
            tools: false,
            lm: false
        }
    })
    .build();

console.log('Minimal agent created with disabled subsystems:');
console.log('- Embedding layer:', minimalAgent.getEmbeddingLayer() === null);
console.log('- Language model:', minimalAgent.getLM() === null);
console.log('- Tools:', minimalAgent.getTools() === null);

console.log('\n=== All examples completed successfully ===');