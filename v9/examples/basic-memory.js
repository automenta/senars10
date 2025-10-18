#!/usr/bin/env node

/**
 * @file: examples/basic-memory.js
 * @description: Basic usage example demonstrating enhanced Memory component with focus sets and attention
 * This example runs the same code that is tested in MemoryIntegration.test.js
 */

import { demonstrateMemorySystem } from './shared/memoryDemo.js';

async function runExample() {
  console.log('🧠 SeNARS v2 - Enhanced Memory System Demo\n');

  try {
    const results = await demonstrateMemorySystem();

    // Display results similar to the original example
    console.log('📁 Focus sets created successfully');
    console.log('🎯 Set focus to: working-memory');

    // 4. Demonstrate focus set management
    console.log('\n🎪 Working with focus sets...');

    console.log(`📋 Retrieved ${results.focusItems.length} items from working-memory focus`);
    results.focusItems.forEach(([key, value]) => {
      console.log(`   - ${key}: ${value.content} (priority: ${value.priority})`);
    });

    // 5. Demonstrate attention mechanism
    console.log('\n🧘 Testing attention mechanism...');
    console.log('📊 Focus set attention scores:');
    Object.entries(results.focusStats).forEach(([name, stats]) => {
      console.log(`   ${name}: ${(stats.attentionScore * 100).toFixed(1)}% attention`);
    });

    // 6. Demonstrate query optimization
    console.log('\n🔍 Testing query optimization...');
    console.log(`Found ${results.highPriorityItems.length} high priority items`);
    console.log(`Found ${results.alertItems.length} alert items`);
    console.log(`Found ${results.urgentItems.length} urgent items`);

    // 7. Demonstrate memory statistics
    console.log('\n📈 Memory system statistics:');
    console.log(`   Storage size: ${results.memStats.storageSize} items`);
    console.log(`   Cache size: ${results.memStats.cacheSize} items`);
    console.log(`   Focus sets: ${results.memStats.focusSets ? Object.keys(results.memStats.focusSets).length : 0}`);
    console.log(`   Indexes: ${results.memStats.indexes} active`);

    // 8. Demonstrate attention-based sorting
    console.log('\n🎯 Testing attention-based item retrieval...');
    console.log(`Retrieved ${results.attentionItems.length} items from attention-focus`);

    results.attentionItems.forEach(([key, value], index) => {
      console.log(`   ${index + 1}. ${key} (priority: ${value.priority})`);
    });

  } catch (error) {
    console.error('Error running memory system demo:', error);
  }
}

// Run the demonstration
runExample().catch(console.error);