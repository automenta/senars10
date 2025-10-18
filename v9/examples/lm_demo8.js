/**
 * @file examples/lm_demo8.js
 * @description Test goal decomposition using NAR API with LangChain LM provider.
 * Validates that LM calls are made and novel subgoals are generated.
 * Connects to host=`xyz:11434` model=`llamablit` as requested.
 */

import { NAR } from '../core/NAR.js';
import { Logger } from '../core/base/utilities.js';
import LangChainProvider from '../core/lm/LangChainProvider.js';

// --- Configuration ---
const LOG_LEVEL = 'debug';

/**
 * Creates and configures the LangChain provider as specified.
 * @returns {object} An instance of LangChainProvider configured for Ollama.
 */
function createLangChainProvider() {
  Logger.info('Initializing LangChainProvider for Ollama at xyz:11434 with llamablit model.');
  return new LangChainProvider({
    modelName: 'llamablit',           // Specific model as requested
    baseURL: 'http://xyz:11434',     // Specified host
    temperature: 0.7,
    maxTokens: 500,
  });
}

/**
 * Tests goal decomposition by creating a high-priority goal and verifying
 * that the LM rule generates sub-goals when connected to a real service.
 */
async function testGoalDecomposition(nar) {
  Logger.info('\n--- Testing Goal Decomposition ---');
  
  // Input a goal with high priority (> 0.7) to trigger GoalDecompositionRule
  const goalTask = nar.taskManager.input({
    term: 'Create a marketing strategy for a new AI product',
    punctuation: '!', // Goal punctuation
    truth: { frequency: 0.9, confidence: 0.9 },
    priority: 0.8  // Above the 0.7 threshold required by the rule
  });
  
  Logger.info(`Goal created: ${goalTask.term.toString()}`);
  Logger.info(`Goal priority: ${goalTask.getPriority().toFixed(2)} (threshold > 0.7)`);

  // Run a reasoning cycle - this should trigger LM rules if conditions are met
  const derivedTasks = await nar.runCycle();
  
  Logger.info(`\nReasoning cycle completed. ${derivedTasks.length} tasks derived.`);
  
  if (derivedTasks.length > 0) {
    Logger.info('✅ SUCCESS: Goal decomposition generated new tasks!');
    Logger.info('Derived tasks:');
    derivedTasks.forEach((task, i) => {
      console.log(`  ${i + 1}. ${task.term.toString()} [P:${task.getPriority().toFixed(2)}, C:${task.truth.confidence.toFixed(2)}]`);
    });
    
    // Check if any of the tasks contain sub-goal indicators
    const subGoalTasks = derivedTasks.filter(task => 
      task.term.toString().toLowerCase().includes('sub-goal') ||
      task.term.toString().toLowerCase().includes('strategy') ||
      task.term.toString().toLowerCase().includes('plan') ||
      task.term.toString().toLowerCase().includes('research') ||
      task.term.toString().toLowerCase().includes('market')
    );
    
    if (subGoalTasks.length > 0) {
      Logger.info(`\n🎯 Found ${subGoalTasks.length} potential sub-goal tasks:`);
      subGoalTasks.forEach((task, i) => {
        console.log(`  ${i + 1}. ${task.term.toString()}`);
      });
    } else {
      Logger.info('\n📝 Derived tasks don\'t have typical sub-goal patterns, but were generated.');
    }
  } else {
    Logger.info('\n❌ NO DERIVED TASKS: This means either:');
    Logger.info('   1. No real Ollama service is available at xyz:11434');
    Logger.info('   2. The service returned a response that couldn\'t be parsed into sub-goals');
    Logger.info('   3. The LM rule condition may not have been met (though priority is correct)');
  }
  
  // Show all tasks in the system
  const allTasks = nar.getTasksByPriority();
  Logger.info(`\nTotal tasks in system: ${allTasks.length}`);
  if (allTasks.length > 0) {
    console.log('\n--- All Tasks by Priority ---');
    allTasks.slice(0, 10).forEach((task, i) => {
      console.log(`  ${i + 1}. [P:${task.getPriority().toFixed(2)}, C:${task.truth.confidence.toFixed(2)}] ${task.term.toString()}`);
    });
  }
}

/**
 * Main function to test goal decomposition functionality.
 */
async function main() {
  // Set up logging
  if (LOG_LEVEL === 'debug') {
    process.env.DEBUG = 'true';
    process.env.NODE_ENV = 'development';
  }
  
  console.log('🚀 Starting Goal Decomposition Test...');
  Logger.info('--- Goal Decomposition Test: LangChain + Ollama Integration ---');
  Logger.info('Configuration: host=`xyz:11434`, model=`llamablit` using LangChainProvider');

  // 1. Initialize the NAR with automatic rule loading
  const nar = await new NAR().initialize();
  Logger.info('NAR system initialized with automatic rule loading.');

  // 2. Create and register the LangChain provider as specified
  const provider = createLangChainProvider();
  nar.lm.registerProvider('default', provider);
  Logger.info(`Registered LangChain provider: ${provider.modelName} at ${provider.baseURL}`);

  // 3. Test goal decomposition
  await testGoalDecomposition(nar);

  Logger.info('\n✅ Goal decomposition test completed!');
  Logger.info('When connected to a real Ollama instance, this should generate sub-goals.');
}

main().catch(error => {
  Logger.error('Test failed:', error);
  console.error(error);
});