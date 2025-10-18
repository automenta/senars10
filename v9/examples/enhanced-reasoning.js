/**
 * @file: examples/enhanced-reasoning.js
 * @description: Example demonstrating the enhanced Reasoning component with Rules integration
 */

import System from '../core/System.js';

async function runEnhancedReasoningExample() {
  console.log('🧪 Enhanced Reasoning Component Example');
  console.log('=====================================');

  // Create and start the system
  const system = new System({});

  try {
    await system.start();
    console.log('✅ System started successfully');

    // Input some tasks for reasoning
    const task1 = system.input({
      term: '((A) --> (B))',  // If A then B
      punctuation: '.',
      truth: { frequency: 0.9, confidence: 0.8 }
    });

    const task2 = system.input({
      term: '(A)',  // A is true
      punctuation: '.',
      truth: { frequency: 0.8, confidence: 0.9 }
    });

    console.log('📥 Input tasks:');
    console.log('   Task 1:', task1.term + task1.punctuation);
    console.log('   Task 2:', task2.term + task2.punctuation);

    // Access the reasoning component directly
    const reasoning = system.core.reasoning;
    const rules = system.core.rules;

    console.log('\n📋 Reasoning Component Stats:');
    const stats = reasoning.getStats();
    console.log('   Strategies:', stats.strategies);
    console.log('   Inference Rules:', stats.inferenceRules);
    console.log('   History Size:', stats.historySize);

    // Apply reasoning to the tasks
    const tasks = [task1, task2];
    const derivedTasks = await reasoning.reason(tasks);

    console.log('\n🧠 Reasoning Results:');
    console.log('   Input Tasks:', tasks.length);
    console.log('   Derived Tasks:', derivedTasks.length);

    if (derivedTasks.length > 0) {
      console.log('   Derived Task 1:', derivedTasks[0].term + derivedTasks[0].punctuation);
    }

    // Test applying specific rules to tasks
    console.log('\n⚙️  Testing Rule Application:');
    const ruleResults = await reasoning.applyRulesToTasks(tasks);
    console.log('   Rules Applied:', ruleResults.length);

    if (ruleResults.length > 0) {
      console.log('   First Rule Result:', ruleResults[0].ruleName);
    }

    // Add a custom reasoning strategy
    console.log('\n🎯 Adding Custom Reasoning Strategy:');
    const customStrategy = {
      id: 'custom-inference',
      execute: (tasks, context) => {
        console.log(`   Executing custom strategy on ${tasks.length} tasks`);
        return []; // Return empty array for this example
      }
    };
    reasoning.addStrategy(customStrategy);
    console.log('   Strategy added:', customStrategy.id);

    // Show updated stats
    const updatedStats = reasoning.getStats();
    console.log('\n📈 Updated Stats:');
    console.log('   Strategies:', updatedStats.strategies);
    console.log('   Inference Rules:', updatedStats.inferenceRules);

  } catch (error) {
    console.error('❌ Error during example execution:', error);
  } finally {
    await system.stop();
    console.log('\n✅ System stopped');
  }
}

// Run the example
runEnhancedReasoningExample().catch(console.error);