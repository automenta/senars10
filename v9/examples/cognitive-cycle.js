#!/usr/bin/env node

/**
 * @file: examples/cognitive-cycle.js
 * @description: Comprehensive example showing Rules and Memory working together in a cognitive cycle
 * This example runs the same code that is tested in CognitiveCycleIntegration.test.js
 */

import { demonstrateCognitiveCycle } from './shared/cognitiveCycleDemo.js';

async function runExample() {
  console.log('🌀 SeNARS v2 - Cognitive Cycle Demo\n');

  try {
    const results = await demonstrateCognitiveCycle();

    // Display results similar to the original example
    console.log('🏗️  Cognitive environment set up with focus sets');

    // Phase 1: Perception
    console.log('\n👁️  Phase 1: Perception');
    results.perceptionResults.forEach(result => {
      console.log(`   ✅ Perceived: ${result.result}`);
    });

    // Phase 2: Pattern Recognition
    console.log('\n🔍 Phase 2: Pattern Recognition');
    if (results.patternResult) {
      console.log(`   ✅ Pattern analyzed: ${results.patternResult.insights.pattern.type}`);
    }

    // Phase 3: Decision Making
    console.log('\n⚖️  Phase 3: Decision Making');
    if (results.decisionResult) {
      console.log(`   ✅ Decision made: ${results.decisionResult.decision.action}`);
    }

    // Phase 4: Learning
    console.log('\n📚 Phase 4: Learning');
    if (results.learningResult) {
      console.log(`   ✅ Learning stored: ${results.learningResult.result}`);
    }

    // 4. Demonstrate memory integration
    console.log('\n💭 Memory integration across cognitive cycle...');

    // Show items stored in different focus areas
    console.log(`\nWorking memory contains ${results.workingMemoryItems.length} items`);

    // Query for insights generated
    console.log(`\nGenerated ${results.insights.length} insights during cycle`);

    // Query for decisions made
    console.log(`Made ${results.decisions.length} decisions during cycle`);

    // 5. Show attention dynamics
    console.log('\n🧘 Attention dynamics during cognitive cycle...');

    console.log('Final attention distribution:');
    Object.entries(results.attentionStats).forEach(([name, stats]) => {
      const attentionPercent = (stats.attentionScore * 100).toFixed(1);
      console.log(`   ${name}: ${attentionPercent}%`);
    });

    // 6. Performance summary
    console.log('\n📊 Cognitive cycle performance summary...');

    console.log(`   Rules processed: ${results.ruleStats.totalRules}`);
    console.log(`   Memory items stored: ${results.memoryStats.storageSize}`);
    console.log(`   Focus sets active: ${Object.keys(results.attentionStats).length}`);
    console.log(`   Cognitive operations: ${results.workingMemoryItems.length + results.insights.length + results.decisions.length}`);

  } catch (error) {
    console.error('Error running cognitive cycle demo:', error);
  }
}

// Run the demonstration
runExample().catch(console.error);