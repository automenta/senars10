#!/usr/bin/env node

/**
 * @file: examples/basic-rules.js
 * @description: Basic usage example demonstrating enhanced Rules engine functionality
 */

import createCore from '../core/createCore.js';

async function demonstrateRulesEngine() {
  console.log('🚀 SeNARS v2 - Enhanced Rules Engine Demo\n');

  const core = await createCore();

  try {
    // 1. Create rules with different types, complexities, and priorities
    console.log('📋 Creating rules with enhanced indexing...');

    const rules = [
      {
        name: 'urgent-task-handler',
        type: 'task',
        complexity: 'simple',
        preFilterTags: ['urgent', 'immediate'],
        condition: (ctx) => ctx.priority >= 9,
        action: (ctx) => ({
          result: 'immediate-action',
          task: ctx.term?.name || 'unknown',
          processedAt: new Date().toISOString()
        }),
        priority: 10
      },
      {
        name: 'normal-task-processor',
        type: 'task',
        complexity: 'simple',
        preFilterTags: ['normal', 'scheduled'],
        condition: (ctx) => ctx.priority >= 5 && ctx.priority < 9,
        action: (ctx) => ({
          result: 'scheduled-processing',
          task: ctx.task,
          eta: '1-2 hours'
        }),
        priority: 5
      },
      {
        name: 'complex-pattern-analyzer',
        type: 'analysis',
        complexity: 'complex',
        preFilterTags: ['pattern', 'trend'],
        condition: (ctx) => ctx.dataType === 'pattern' && ctx.size > 100,
        action: (ctx) => ({
          result: 'deep-analysis',
          patterns: ctx.patterns,
          insights: 'generated'
        }),
        priority: 8
      },
      {
        name: 'fallback-general-handler',
        type: 'general',
        complexity: 'simple',
        preFilterTags: ['fallback'],
        condition: () => true, // Always matches
        action: (ctx) => ({
          result: 'default-processing',
          message: 'Item processed by fallback rule'
        }),
        priority: 1
      }
    ];

    // Add all rules
    rules.forEach(rule => core.rules.add(rule));

    // 2. Demonstrate rule indexing and fast lookups
    console.log('\n🔍 Testing rule indexing and fast lookups...');

    const taskRules = core.rules.getRulesByType('task');
    console.log(`Found ${taskRules.length} task processing rules`);

    const simpleRules = core.rules.getRulesByComplexity('simple');
    console.log(`Found ${simpleRules.length} simple complexity rules`);

    const highPriorityRules = core.rules.getRulesByPriority(10);
    console.log(`Found ${highPriorityRules.length} high priority rules`);

    // 3. Demonstrate pre-filtering for performance
    console.log('\n⚡ Testing rule pre-filtering performance...');

    const urgentContext = {
      task: 'Critical system failure',
      priority: 10,
      tags: ['urgent', 'immediate', 'system']
    };

    const candidates = core.rules.getOptimizedRuleCandidates(urgentContext, {
      ruleType: 'task',
      maxComplexity: 'simple'
    });

    console.log(`Pre-filtering found ${candidates.length} candidate rules for urgent task`);

    // 4. Demonstrate rule evaluation
    console.log('\n🎯 Testing rule evaluation...');

    // Fix context structure to match rule conditions and pre-filter tags
    const urgentContextFixed = {
      priority: 10,
      term: { name: 'urgent-task' },
      truth: { confidence: 0.9 },
      urgent: true,  // Add context keys that match preFilterTags
      immediate: true
    };

    const result = await core.rules.evaluate(urgentContextFixed);
    if (result) {
      console.log('✅ Rule executed successfully:');
      console.log(`   Result: ${result.result}`);
    } else {
      console.log('❌ No rules matched the context');
    }

    // 5. Test with different context
    const normalContext = {
      priority: 6,
      term: { name: 'normal-task' },
      truth: { confidence: 0.8 }
    };

    const normalResult = await core.rules.evaluate(normalContext);
    if (normalResult) {
      console.log('\n✅ Normal task processed:');
      console.log(`   Result: ${normalResult.result}`);
    }

    // 6. Demonstrate rule statistics
    console.log('\n📊 Rule engine statistics:');
    const stats = core.rules.getStats();
    console.log(`   Total rules: ${stats.totalRules}`);
    console.log(`   Rule types: ${stats.types.join(', ')}`);
    console.log(`   Pre-filter tags: ${stats.preFilterTags}`);

  } finally {
    await core.stop();
    await core.destroy();
  }
}

// Run the demonstration
demonstrateRulesEngine().catch(console.error);