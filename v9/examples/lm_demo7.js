/**
 * @file examples/lm_demo7.js
 * @description Ideal demonstration of the NAR API for hybrid neuro-symbolic reasoning.
 * This example exemplifies the ideal way of using the NAR API with LangChain LM provider.
 * Connects to host=`xyz:11434` model=`llamablit` as requested.
 * 
 * This is the architectural template showing the proper usage pattern.
 */

import { NAR } from '../core/NAR.js';
import { Logger } from '../core/base/utilities.js';
import LangChainProvider from '../core/lm/LangChainProvider.js';

// --- Configuration ---
const LOG_LEVEL = 'debug';

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
 * Creates and configures the LangChain provider as specified.
 * @returns {object} An instance of LangChainProvider configured for Ollama.
 */
function createLangChainProvider() {
  Logger.info('Initializing LangChainProvider for Ollama at xyz:11434 with llamablit model.');
  return new LangChainProvider({
    modelName: 'llamablit',           // Specific model as requested
    baseURL: 'http://xyz:11434',     // Specified host
    temperature: 0.7,                // Balanced creativity vs consistency
    maxTokens: 500,                  // Reasonable output length for reasoning
  });
}

/**
 * Demonstrates the proper integration pattern for neuro-symbolic reasoning
 */
async function demonstrateIntegrationPattern(nar) {
  Logger.info('\n--- Demonstrating Integration Pattern ---');
  
  // Input symbolic knowledge - this is the "neuro" part (structured symbolic reasoning)
  nar.input('<Bird --> Animal>. %1.00;0.90%');  // Birds are animals
  nar.input('<Robin --> Bird>. %1.00;0.90%');   // Robins are birds
  Logger.info('Input symbolic facts to NAR system');
  
  // Run the reasoning cycle - the system will apply rules including LM rules if conditions met
  await nar.runCycle();
  
  // Input a complex goal that would benefit from neural processing
  // Set priority > 0.7 to meet the rule condition for goal decomposition
  const complexGoal = nar.taskManager.input({
    term: 'Develop a comprehensive strategy for reducing urban traffic congestion using AI technologies',
    punctuation: '!', // Goal
    truth: { frequency: 0.9, confidence: 0.9 },
    priority: 0.8  // Higher than 0.7 threshold required by GoalDecompositionRule
  });
  Logger.info(`Input complex goal requiring neural processing: ${complexGoal.term.toString()} with priority ${complexGoal.getPriority().toFixed(2)}`);
  
  await nar.runCycle();
  
  Logger.info('Current state after reasoning:');
  printTopTasks(nar, 5);
}

/**
 * Main function demonstrating the ideal NAR API usage for hybrid reasoning.
 */
async function main() {
  // Set up logging
  if (LOG_LEVEL === 'debug') {
    process.env.DEBUG = 'true';
    process.env.NODE_ENV = 'development';
  }
  
  console.log('🚀 Starting Hybrid Neuro-Symbolic Reasoning Demo 7...');
  Logger.info('--- Hybrid Neuro-Symbolic Reasoning Demo 7: Ideal NAR API Usage ---');
  Logger.info('Configuration: host=`xyz:11434`, model=`llamablit` using LangChainProvider');

  // 1. Initialize the NAR with automatic rule loading
  const nar = await new NAR().initialize();
  Logger.info('NAR system initialized with automatic rule loading.');

  // 2. Create and register the LangChain provider as specified
  const provider = createLangChainProvider();
  nar.lm.registerProvider('default', provider);
  Logger.info(`Registered LangChain provider: ${provider.modelName} at ${provider.baseURL}`);

  // 3. Demonstrate the ideal integration pattern
  await demonstrateIntegrationPattern(nar);

  // 4. Final state
  Logger.info('\n--- Final State ---');
  printTopTasks(nar, 8);
  
  Logger.info('\n✅ Ideal hybrid reasoning pattern demonstrated!');
  Logger.info('This exemplifies the proper way to use NAR API for hybrid neuro-symbolic reasoning.');
  Logger.info('When connected to a real Ollama instance, LM rules will generate derived tasks.');
}

main().catch(error => {
  Logger.error('Demo failed:', error);
  console.error(error);
});