/**
 * NAL-only Reasoning Demonstration: Causal Reasoning
 * Demonstrates basic causal reasoning patterns in NAL
 */

import {NAR} from '../src/nar/NAR.js';

async function causalDemo() {
    console.log('=== NAL-only Causal Reasoning Demo ===\n');

    // Initialize NAR without language model for pure symbolic reasoning
    const nar = new NAR({lm: {enabled: false}});

    console.log('Input: If it rains, the ground gets wet');
    await nar.input('((&/, (rains =/> #1), (?1 --> [raining])) =/> (ground --> [wet])). %0.9;0.8%');

    console.log('Input: It is raining now');
    await nar.input('(rains =/> [raining]). %1.0;0.9%');

    console.log('\nRunning reasoning cycles...\n');
    await nar.runCycles(10);

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
causalDemo().catch(console.error);