/**
 * NAL-only Reasoning Demonstration: Inductive Reasoning
 * Demonstrates inductive reasoning patterns in NAL
 */

import {NAR} from '../src/nar/NAR.js';

async function inductiveDemo() {
    console.log('=== NAL-only Inductive Reasoning Demo ===\n');

    // Initialize NAR without language model for pure symbolic reasoning
    const nar = new NAR({lm: {enabled: false}});

    console.log('Input: Swans I have seen are white');
    await nar.input('<swan1 --> [white]>. %1.0;0.8%');
    await nar.input('<swan2 --> [white]>. %1.0;0.8%');
    await nar.input('<swan3 --> [white]>. %1.0;0.8%');

    console.log('Input: This is a swan');
    await nar.input('(this_swan --> swan). %1.0;0.9%');

    console.log('\nRunning reasoning cycles to explore inductive inference...\n');
    await nar.runCycles(15);

    // Check for derived beliefs about the new swan being white
    const beliefs = nar.getBeliefs();
    console.log('Beliefs after reasoning:');
    beliefs.forEach((task, index) => {
        console.log(`${index + 1}. ${task.term.name} ${task.truth ? task.truth.toString() : ''} [Priority: ${task.budget?.priority?.toFixed(2) || 'N/A'}]`);
    });

    console.log(`\nTotal reasoning cycles completed: ${nar.cycleCount}`);
    console.log(`Total concepts in memory: ${nar.memory.getAllConcepts().length}`);
}

// Run the demo
inductiveDemo().catch(console.error);