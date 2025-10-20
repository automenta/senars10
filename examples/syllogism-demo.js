/**
 * NAL-only Reasoning Demonstration: Syllogisms
 * Demonstrates classic syllogistic reasoning: All men are mortal. Socrates is a man. Therefore, Socrates is mortal.
 */

import {NAR} from '../src/nar/NAR.js';

async function syllogismDemo() {
    console.log('=== NAL-only Syllogistic Reasoning Demo ===\n');

    // Initialize NAR without language model for pure symbolic reasoning
    const nar = new NAR({lm: {enabled: false}});

    console.log('Input: All men are mortal');
    await nar.input('(man --> mortal). %1.0;0.9%');

    console.log('Input: Socrates is a man');
    await nar.input('(Socrates --> man). %1.0;0.8%');

    console.log('\nRunning reasoning cycles...\n');
    await nar.runCycles(10);

    // Check for derived belief that Socrates is mortal
    const socratesMortal = nar.getBeliefs();
    console.log('Beliefs after reasoning:');
    socratesMortal.forEach((task, index) => {
        console.log(`${index + 1}. ${task.term.name} ${task.truth ? task.truth.toString() : ''} [Priority: ${task.budget?.priority?.toFixed(2) || 'N/A'}]`);
    });

    console.log(`\nTotal reasoning cycles completed: ${nar.cycleCount}`);
    console.log(`Total concepts in memory: ${nar.memory.getAllConcepts().length}`);
}

// Run the demo
syllogismDemo().catch(console.error);