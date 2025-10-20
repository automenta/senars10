#!/usr/bin/env node

import {ReplInterface} from './io/ReplInterface.js';
import {MonitoringAPI} from './io/MonitoringAPI.js';
import {NAR} from './nar/NAR.js';

const MODES = {REPL: 'repl', SERVER: 'server', DEMO: 'demo'};
const DEFAULT_CONFIG = {lm: {enabled: false}, cycle: {delay: 50}};
const DEFAULT_PORT = 8080;

const args = process.argv.slice(2);
const mode = args[0]?.toLowerCase() || MODES.REPL;

const createNAR = (config = {}) => new NAR({...DEFAULT_CONFIG, ...config});
const showUsage = () => {
    console.log('Usage: node src/index.js [repl|server|demo]');
    console.log('  repl   - Start the REPL interface (default)');
    console.log('  server - Start with monitoring API');
    console.log('  demo   - Run a demonstration');
    process.exit(1);
};

const runRepl = async () => new ReplInterface().start();

const runServer = async () => {
    const nar = createNAR();
    nar.start();

    const monitor = new MonitoringAPI(nar, {port: DEFAULT_PORT});
    await monitor.start();

    console.log(`NAR running with monitoring API on ws://localhost:${DEFAULT_PORT}`);
    console.log('Press Ctrl+C to stop');

    process.on('SIGINT', () => {
        console.log('\nShutting down...');
        monitor.stop();
        nar.stop();
        process.exit(0);
    });
};

const runDemo = async () => {
    console.log('Running Phase 10 demonstration...\n');

    const nar = createNAR();

    const demonstrations = [
        {input: '(bird --> animal). %1.0;0.9%', desc: 'All birds are animals'},
        {input: '(Tweety --> bird). %1.0;0.8%', desc: 'Tweety is a bird'}
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
        console.log(`${index + 1}. ${task.term.name} ${task.truth?.toString() || ''}`));

    const concepts = nar.memory.getAllConcepts();
    console.log(`\nTotal concepts: ${concepts.length}`);
    console.log(`Reasoning cycles: ${nar.cycleCount}`);

    const repl = new ReplInterface(createNAR());
    console.log('\nREPL interface available: await repl.start()');
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