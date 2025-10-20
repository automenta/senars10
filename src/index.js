#!/usr/bin/env node

import { ReplInterface } from './io/ReplInterface.js';
import { MonitoringAPI } from './io/MonitoringAPI.js';
import { NAR } from './nar/NAR.js';

const args = process.argv.slice(2);
const mode = args[0]?.toLowerCase() || 'repl';

async function main() {
    switch (mode) {
        case 'repl':
            await runRepl();
            break;
        case 'server':
        case 'monitor':
            await runServer();
            break;
        case 'demo':
            await runDemo();
            break;
        default:
            console.log(`Usage: node src/index.js [repl|server|demo]`);
            console.log(`  repl   - Start the REPL interface (default)`);
            console.log(`  server - Start with monitoring API`);
            console.log(`  demo   - Run a demonstration`);
            process.exit(1);
    }
}

async function runRepl() {
    const repl = new ReplInterface();
    await repl.start();
}

async function runServer() {
    // Create NAR instance
    const nar = new NAR({
        lm: { enabled: false },
        cycle: { delay: 50 }
    });
    
    // Start the reasoning cycle
    nar.start();
    
    // Create and start monitoring API
    const monitor = new MonitoringAPI(nar, { port: 8080 });
    await monitor.start();
    
    console.log(`NAR running with monitoring API on ws://localhost:8080`);
    console.log(`Press Ctrl+C to stop`);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nShutting down...');
        monitor.stop();
        nar.stop();
        process.exit(0);
    });
}

async function runDemo() {
    console.log('Running Phase 10 demonstration...');
    
    // Create NAR instance
    const nar = new NAR({ lm: { enabled: false } });
    
    // Example demonstration of syllogistic reasoning
    console.log('\nInput: All birds are animals');
    await nar.input('(bird --> animal). %1.0;0.9%');
    
    console.log('Input: Tweety is a bird');
    await nar.input('(Tweety --> bird). %1.0;0.8%');
    
    console.log('\nRunning reasoning cycles...');
    await nar.runCycles(5);
    
    // Check results
    const beliefs = nar.getBeliefs();
    console.log('\nBeliefs after reasoning:');
    beliefs.forEach((task, index) => {
        console.log(`${index + 1}. ${task.term.name} ${task.truth ? task.truth.toString() : ''}`);
    });
    
    console.log(`\nTotal concepts: ${nar.memory.getAllConcepts().length}`);
    console.log(`Reasoning cycles: ${nar.cycleCount}`);
    
    // Test REPL functionality
    console.log('\nREPL interface available:');
    const repl = new ReplInterface({ nar: { lm: { enabled: false } } });
    console.log('REPL can be started with: await repl.start()');
}

// Run the application
main().catch(error => {
    console.error('Application error:', error);
    process.exit(1);
});