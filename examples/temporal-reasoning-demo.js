/**
 * NAL-only Reasoning Demonstration: Temporal Reasoning
 * Demonstrates temporal relationship reasoning in NAL
 */

import {NAR} from '../src/nar/NAR.js';

async function temporalDemo() {
    console.log('=== NAL-only Temporal Reasoning Demo ===\n');

    // Initialize NAR without language model for pure symbolic reasoning
    const nar = new NAR({lm: {enabled: false}});

    console.log('Input: A happens before B');
    await nar.input('(A =/> B). %0.9;0.8%');

    console.log('Input: B happens before C');
    await nar.input('(B =/> C). %0.9;0.7%');

    console.log('\nRunning reasoning cycles to explore temporal transitivity...\n');
    await nar.runCycles(15);

    // Check for derived beliefs
    const beliefs = nar.getBeliefs();
    console.log('Beliefs after reasoning:');
    beliefs.forEach((task, index) => {
        console.log(`${index + 1}. ${task.term.name} ${task.truth ? task.truth.toString() : ''} [Priority: ${task.budget?.priority?.toFixed(2) || 'N/A'}]`);
    });

    console.log(`\nTotal reasoning cycles completed: ${nar.cycleCount}`);
    console.log(`Total concepts in memory: ${nar.memory.getAllConcepts().length}`);
}

// Run the demo
temporalDemo().catch(console.error);