/**
 * @file examples/lm_demo6.js
 * @description A streamlined demonstration of the NAR system's LM-based reasoning capabilities.
 * This example showcases automatic rule loading, goal decomposition, and clear output presentation.
 */

import { NAR } from '../core/NAR.js';
import { Logger } from '../core/base/utilities.js';
import DummyProvider from '../core/lm/DummyProvider.js';
import XenovaProvider from '../core/lm/XenovaProvider.js';

// --- Configuration ---
const USE_DUMMY_PROVIDER = true; // Switch to false to use a real LM
const LOG_LEVEL = 'info';

/**
 * A helper function to print the top tasks in a clear format.
 * @param {NAR} nar - The NAR instance.
 * @param {number} count - The number of top tasks to print.
 */
function printTopTasks(nar, count = 5) {
  const tasks = nar.getTasksByPriority().slice(0, count);
  console.log(`\n--- Top ${count} Tasks ---`);
  if (tasks.length === 0) {
    console.log('No tasks in memory.');
    return;
  }
  tasks.forEach((task, i) => {
    console.log(`  ${i + 1}. [P:${task.getPriority().toFixed(2)} C:${task.truth.confidence.toFixed(2)}] ${task.term.toString()}`);
  });
}

/**
 * Main function to run the demonstration.
 */
async function main() {
  Logger.level = LOG_LEVEL;
  Logger.info('--- LM Reasoning Demo 6: Streamlined ---');

  // 1. Initialize the NAR. Rules are now loaded automatically.
  const nar = await new NAR().initialize();

  // 2. Configure and register the desired LM provider.
  const provider = USE_DUMMY_PROVIDER
    ? new DummyProvider()
    : new XenovaProvider({ modelName: 'Xenova/distilgpt2', device: 'webgpu' });

  nar.lm.registerProvider('default', provider);
  Logger.info(`Using LM provider: ${provider.constructor.name}`);

  // 3. Input a high-level goal using the simplified string format.
  const goal = nar.input('Create a comprehensive marketing plan for a new product!');
  Logger.info(`Input goal: ${goal.term.toString()}`);

  // 4. Run the reasoning cycle to process the goal.
  // The GoalDecompositionRule will trigger automatically.
  Logger.info('\n--- Running Reasoning Cycle ---');
  await nar.runCycle();

  // 5. Observe the results.
  // The system should have decomposed the goal into several sub-goals.
  Logger.info('\n--- Observing Results ---');
  printTopTasks(nar, 10);

  const subGoals = nar.getTasks().filter(task => task.term.toString().includes('Sub-goal'));

  if (subGoals.length > 0) {
    Logger.info(`\n✅ Successfully decomposed the main goal into ${subGoals.length} sub-goals.`);
  } else {
    Logger.error('\n❌ Failed to decompose the goal. The LM may not have produced valid sub-goals.');
  }
}

main().catch(error => {
  Logger.error('Demo failed:', error);
});