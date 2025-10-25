#!/usr/bin/env node

import { ReplInterface } from './io/ReplInterface.js';
import { MonitoringAPI } from './io/MonitoringAPI.js';
import { AgentBuilder } from './AgentBuilder.js';
import { ReasoningModule } from './module/ReasoningModule.js';
import { MetricsModule } from './module/MetricsModule.js';
import { ToolModule } from './module/ToolModule.js';
import { LMModule } from './module/LMModule.js';

const MODES = { REPL: 'repl', SERVER: 'server', DEMO: 'demo' };
const DEFAULT_PORT = 8080;

const args = process.argv.slice(2);
const mode = args[0]?.toLowerCase() || MODES.REPL;

const createAgent = async (config = {}) => {
    const builder = new AgentBuilder();
    builder.withNARConfig({ cycle: { delay: 50 }, ...config.narConfig });

    // Add core modules
    builder.withModule(new ReasoningModule(), { rules: ['syllogistic-core'], ...config.reasoning });
    builder.withModule(new MetricsModule(), { enabled: true, ...config.metrics });

    // Add optional modules based on config
    if (config.tools?.enabled) {
        builder.withModule(new ToolModule(), config.tools);
    }
    if (config.lm?.enabled) {
        builder.withModule(new LMModule(), config.lm);
    }

    return await builder.build();
};

const showUsage = () => {
    console.log('Usage: node src/index.js [repl|server|demo]');
    console.log('  repl   - Start the REPL interface (default)');
    console.log('  server - Start with monitoring API');
    console.log('  demo   - Run a demonstration');
    process.exit(1);
};

const runRepl = async () => {
    const agent = await createAgent();
    new ReplInterface(agent.nar).start();
};

const runServer = async () => {
    const agent = await createAgent({ metrics: { enabled: true } });
    agent.nar.start();

    const monitor = new MonitoringAPI(agent.nar, { port: DEFAULT_PORT });
    await monitor.start();

    console.log(`NAR running with monitoring API on ws://localhost:${DEFAULT_PORT}`);
};

const runDemo = async () => {
    console.log('Running demonstration...\n');

    const agent = await createAgent();
    const { nar } = agent;

    const demonstrations = [
        { input: '<bird --> animal>.', desc: 'All birds are animals' },
        { input: '<Tweety --> bird>.', desc: 'Tweety is a bird' }
    ];

    for (const demo of demonstrations) {
        console.log(`Input: ${demo.desc}`);
        await nar.input(demo.input);
    }

    console.log('\nRunning reasoning cycles...');
    await nar.runCycles(5);

    const beliefs = nar.getBeliefs();
    console.log('\nBeliefs after reasoning:');
    beliefs.forEach((task, index) =>
        console.log(`${index + 1}. ${task.term.toString()} ${task.truth?.toString() || ''}`));
};

const modeHandlers = {
    [MODES.REPL]: runRepl,
    [MODES.SERVER]: runServer,
    [MODES.DEMO]: runDemo
};

const main = async () => {
    const handler = modeHandlers[mode];
    handler ? await handler() : showUsage();
};

main().catch(error => {
    console.error('Application error:', error);
    process.exit(1);
});