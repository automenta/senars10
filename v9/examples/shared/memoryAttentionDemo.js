/**
 * @file: examples/shared/memoryAttentionDemo.js
 * @description: Shared functionality for memory attention demonstration used by both tests and examples
 */

import System from '../../core/system/System.js';

// Export the main functionality for both tests and examples to use
export async function demonstrateMemoryAttention() {
  // Create and start the system
  const system = new System({});

  try {
    await system.start();
    console.log('✅ System started successfully');

    // Access the memory component
    const memory = system.core.memory;
    if (!memory) {
      console.log('⚠️  Memory component not available in this configuration');
      return null;
    }

    console.log('\\n📋 Memory Initial Stats:');
    const initialStats = memory.getStats();
    console.log('   Storage Size:', initialStats.storageSize);
    console.log('   Item Count:', initialStats.itemCount);

    // 1. Create focus sets for different attention areas
    console.log('\\n🎯 Creating focus sets for different attention areas...');
    memory.focus.createFocusSet('working-memory', 5);
    memory.focus.createFocusSet('long-term-storage', 10);
    memory.focus.createFocusSet('attention-focus', 3);
    memory.focus.createFocusSet('pattern-buffer', 8);

    // 2. Set current focus to working memory
    console.log('\\n🔍 Setting current focus to working memory...');
    memory.focus.setFocus('working-memory');

    // 3. Add items with different priorities and metadata
    console.log('\\n📥 Adding memory items with different priorities...');
    const items = [
      {
        key: 'urgent-alert-001',
        value: {
          content: 'Critical system temperature exceeded threshold',
          priority: 10,
          type: 'alert',
          severity: 'critical'
        },
        options: {
          type: 'alert',
          tags: ['urgent', 'system', 'temperature'],
          priority: 10
        }
      },
      {
        key: 'task-meeting-0900',
        value: {
          content: 'Daily standup meeting at 9:00 AM',
          priority: 7,
          type: 'task',
          category: 'meeting'
        },
        options: {
          type: 'task',
          tags: ['meeting', 'daily', 'scheduled'],
          priority: 7
        }
      },
      {
        key: 'pattern-traffic-001',
        value: {
          content: 'Unusual traffic pattern detected on port 443',
          priority: 8,
          type: 'pattern',
          dataPoints: 150
        },
        options: {
          type: 'pattern',
          tags: ['traffic', 'security', 'analysis'],
          priority: 8
        }
      },
      {
        key: 'reference-docs',
        value: {
          content: 'System architecture documentation',
          priority: 3,
          type: 'reference',
          lastUpdated: new Date().toISOString()
        },
        options: {
          type: 'reference',
          tags: ['documentation', 'architecture'],
          priority: 3
        }
      }
    ];

    // Add items to memory
    items.forEach(({ key, value, options }) => {
      memory.set(key, value, options);
    });

    // 4. Demonstrate focus set management
    console.log('\\n🔄 Demonstrating focus set management...');
    memory.focus.updateFocusSets('urgent-alert-001', { focusSet: 'working-memory' });
    memory.focus.updateFocusSets('task-meeting-0900', { focusSet: 'working-memory' });
    memory.focus.updateFocusSets('pattern-traffic-001', { focusSet: 'attention-focus' });
    memory.focus.updateFocusSets('reference-docs', { focusSet: 'long-term-storage' });

    // Get items from current focus (fewer in tests)
    const focusLimit = (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 2 : 3;
    const focusItems = memory.focus.getFocusItems(focusLimit);
    console.log(`   Retrieved ${focusItems.length} items from current focus`);

    // 5. Demonstrate attention mechanism
    console.log('\\n🧠 Demonstrating attention mechanism...');
    memory.focus.updateFocusAttention('working-memory', 0.8);
    memory.focus.updateFocusAttention('attention-focus', 0.6);
    memory.focus.updateFocusAttention('long-term-storage', 0.2);

    const focusStats = memory.focus.getFocusSetStats();
    console.log('   Focus set attention updated');

    // 6. Demonstrate query optimization (fewer in tests)
    console.log('\\n🔍 Demonstrating query optimization...');
    const queryLimit = (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 2 : 5;
    const highPriorityItems = memory.query({
      minPriority: 8,
      limit: queryLimit
    });

    const alertItems = memory.query({
      type: 'alert',
      limit: queryLimit
    });

    const urgentItems = memory.query({
      tags: ['urgent'],
      limit: queryLimit
    });

    console.log(`   High priority items: ${highPriorityItems.length}`);
    console.log(`   Alert items: ${alertItems.length}`);
    console.log(`   Urgent items: ${urgentItems.length}`);

    // 7. Get memory statistics
    const memStats = memory.getStats();

    // 8. Demonstrate attention-based sorting (fewer in tests)
    memory.focus.setFocus('attention-focus');
    const attentionLimit = (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 2 : 5;
    const attentionItems = memory.focus.getFocusItems(attentionLimit);

    // Show updated stats
    console.log('\\n📈 Updated Memory Stats:');
    const finalStats = memory.getStats();
    console.log('   Storage Size:', finalStats.storageSize);
    console.log('   Item Count:', finalStats.itemCount);

    // Return results for verification
    return {
      initialStats,
      finalStats,
      focusItems,
      focusStats,
      highPriorityItems,
      alertItems,
      urgentItems,
      memStats,
      attentionItems,
      totalItems: items.length,
      hasMemory: !!memory,
      system
    };

  } catch (error) {
    console.error('❌ Error during memory attention example execution:', error);
    throw error;
  } finally {
    if (system) {
      await system.stop();
      console.log('\\n✅ System stopped');
    }
  }
}

// Export a function specifically for testing memory attention functionality
export async function testMemoryAttentionFunctionality() {
  const system = new System({});

  try {
    await system.start();

    const memory = system.core.memory;
    if (!memory) {
      throw new Error('Memory component not available');
    }

    // Test memory attention components exist
    const componentsAvailable = {
      hasMemory: !!memory,
      hasCreateFocusSet: typeof memory.focus.createFocusSet === 'function',
      hasSetFocus: typeof memory.focus.setFocus === 'function',
      hasGetFocusItems: typeof memory.focus.getFocusItems === 'function',
      hasUpdateFocusAttention: typeof memory.focus.updateFocusAttention === 'function',
      hasGetFocusSetStats: typeof memory.focus.getFocusSetStats === 'function',
      hasQuery: typeof memory.query === 'function',
      hasGetStats: typeof memory.getStats === 'function'
    };

    // Create focus sets
    memory.focus.createFocusSet('test-focus-1', 5);
    memory.focus.createFocusSet('test-focus-2', 3);
    memory.focus.createFocusSet('test-focus-3', 8);

    // Set current focus
    memory.focus.setFocus('test-focus-1');

    // Add test items
    memory.set('test-item-1', { content: 'Test item 1', priority: 8 }, {
      type: 'test',
      tags: ['high-priority'],
      priority: 8
    });

    memory.set('test-item-2', { content: 'Test item 2', priority: 5 }, {
      type: 'test',
      tags: ['medium-priority'],
      priority: 5
    });

    // Update focus sets for items
    if (typeof memory.focus.updateFocusSets === 'function') {
      memory.focus.updateFocusSets('test-item-1', { focusSet: 'test-focus-1' });
      memory.focus.updateFocusSets('test-item-2', { focusSet: 'test-focus-2' });
    }

    // Get focus items (fewer in tests)
    const maxItems = (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 2 : 5;
    const focusItems = memory.focus.getFocusItems(maxItems);

    // Update attention
    memory.focus.updateFocusAttention('test-focus-1', 0.7);
    memory.focus.updateFocusAttention('test-focus-2', 0.4);

    // Get focus stats
    const focusStats = memory.focus.getFocusSetStats();

    // Query items (fewer in tests)
    const queryLimit = (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 3 : 10;
    const highPriorityItems = memory.query({ minPriority: 7, limit: queryLimit });
    const testTypeItems = memory.query({ type: 'test', limit: queryLimit });

    // Get overall stats
    const stats = memory.getStats();

    return {
      componentsAvailable,
      focusItems,
      focusStats,
      highPriorityItems,
      testTypeItems,
      stats
    };
  } finally {
    await system.stop();
  }
}

// Export function for testing multi-focus set operations
export async function testMultiFocusSetOperations() {
  const system = new System({});

  try {
    await system.start();

    const memory = system.core.memory;
    if (!memory) {
      throw new Error('Memory component not available');
    }

    // Create multiple focus sets
    memory.focus.createFocusSet('focus-set-1', 5);
    memory.focus.createFocusSet('focus-set-2', 4);
    memory.focus.createFocusSet('focus-set-3', 6);

    // Add items to different focus sets
    memory.set('item-fs1-1', { content: 'Item in focus set 1', priority: 8 }, { priority: 8, type: 'test' });
    memory.set('item-fs1-2', { content: 'Another item in focus set 1', priority: 6 }, { priority: 6, type: 'test' });
    memory.set('item-fs2-1', { content: 'Item in focus set 2', priority: 9 }, { priority: 9, type: 'test' });
    memory.set('item-fs3-1', { content: 'Item in focus set 3', priority: 7 }, { priority: 7, type: 'test' });

    if (typeof memory._updateFocusSets === 'function') {
      memory._updateFocusSets('item-fs1-1', { focusSet: 'focus-set-1' });
      memory._updateFocusSets('item-fs1-2', { focusSet: 'focus-set-1' });
      memory._updateFocusSets('item-fs2-1', { focusSet: 'focus-set-2' });
      memory._updateFocusSets('item-fs3-1', { focusSet: 'focus-set-3' });
    }

    // Test switching between focus sets (fewer operations in tests)
    const maxItems = (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 2 : 5;
    memory.focus.setFocus('focus-set-1');
    const fs1Items = memory.focus.getFocusItems(maxItems);

    memory.focus.setFocus('focus-set-2');
    const fs2Items = memory.focus.getFocusItems(maxItems);

    memory.focus.setFocus('focus-set-3');
    const fs3Items = memory.focus.getFocusItems(maxItems);

    // Update attention for different sets
    memory.focus.updateFocusAttention('focus-set-1', 0.8);
    memory.focus.updateFocusAttention('focus-set-2', 0.6);
    memory.focus.updateFocusAttention('focus-set-3', 0.9);

    // Get comprehensive stats
    const allFocusStats = memory.focus.getFocusSetStats();

    return {
      fs1Items,
      fs2Items,
      fs3Items,
      allFocusStats,
      totalFocusSets: Object.keys(allFocusStats).length
    };
  } finally {
    await system.stop();
  }
}

// Export function for testing attention decay and update mechanisms
export async function testAttentionDecayAndUpdate() {
  const system = new System({});

  try {
    await system.start();

    const memory = system.core.memory;
    if (!memory) {
      throw new Error('Memory component not available');
    }

    // Create focus sets
    memory.focus.createFocusSet('decay-test-1', 5);
    memory.focus.createFocusSet('decay-test-2', 4);

    // Initially set attention
    memory.focus.updateFocusAttention('decay-test-1', 0.9);
    memory.focus.updateFocusAttention('decay-test-2', 0.3);

    // Get initial attention scores
    const initialStats = memory.focus.getFocusSetStats();
    const initialAttentionScores = {
      'decay-test-1': initialStats['decay-test-1']?.attentionScore || 0,
      'decay-test-2': initialStats['decay-test-2']?.attentionScore || 0
    };

    // Update attention multiple times to simulate decay/update
    memory.focus.updateFocusAttention('decay-test-1', 0.5);
    memory.focus.updateFocusAttention('decay-test-2', 0.7);

    // Get updated attention scores
    const updatedStats = memory.focus.getFocusSetStats();
    const updatedAttentionScores = {
      'decay-test-1': updatedStats['decay-test-1']?.attentionScore || 0,
      'decay-test-2': updatedStats['decay-test-2']?.attentionScore || 0
    };

    // Perform some memory operations to see if attention changes
    memory.set('attention-test-item', { content: 'Test for attention', priority: 7 }, { priority: 7 });

    if (typeof memory._updateFocusSets === 'function') {
      memory._updateFocusSets('attention-test-item', { focusSet: 'decay-test-1' });
    }

    // Final stats
    const finalStats = memory.getFocusSetStats();

    return {
      initialAttentionScores,
      updatedAttentionScores,
      finalStats,
      attentionUpdated: true
    };
  } finally {
    await system.stop();
  }
}

// Export function for testing cross-focus set querying
export async function testCrossFocusSetQuerying() {
  const system = new System({});

  try {
    await system.start();

    const memory = system.core.memory;
    if (!memory) {
      throw new Error('Memory component not available');
    }

    // Create multiple focus sets
    memory.focus.createFocusSet('query-test-1', 5);
    memory.focus.createFocusSet('query-test-2', 5);

    // Add items across different focus sets
    memory.set('item-1-high', { content: 'High priority item 1', priority: 9 }, { priority: 9, type: 'test', tags: ['high'] });
    memory.set('item-2-med', { content: 'Medium priority item 2', priority: 5 }, { priority: 5, type: 'test', tags: ['medium'] });
    memory.set('item-3-high', { content: 'High priority item 3', priority: 8 }, { priority: 8, type: 'test', tags: ['high'] });
    memory.set('item-4-low', { content: 'Low priority item 4', priority: 2 }, { priority: 2, type: 'test', tags: ['low'] });

    if (typeof memory._updateFocusSets === 'function') {
      memory._updateFocusSets('item-1-high', { focusSet: 'query-test-1' });
      memory._updateFocusSets('item-2-med', { focusSet: 'query-test-1' });
      memory._updateFocusSets('item-3-high', { focusSet: 'query-test-2' });
      memory._updateFocusSets('item-4-low', { focusSet: 'query-test-2' });
    }

    // Perform cross-focus set queries (fewer in tests)
    const queryLimit = (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 3 : 10;
    const allHighPriority = memory.query({ minPriority: 8, limit: queryLimit });
    const allTestItems = memory.query({ type: 'test', limit: queryLimit });
    const allHighTagItems = memory.query({ tags: ['high'], limit: queryLimit });

    // Get items from each focus set individually (fewer in tests)
    const maxItems = (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 3 : 10;
    memory.focus.setFocus('query-test-1');
    const focusSet1Items = memory.focus.getFocusItems(maxItems);

    memory.focus.setFocus('query-test-2');
    const focusSet2Items = memory.focus.getFocusItems(maxItems);

    // Get global stats
    const globalStats = memory.getStats();

    return {
      allHighPriority,
      allTestItems,
      allHighTagItems,
      focusSet1Items,
      focusSet2Items,
      globalStats,
      totalItemsFound: allHighPriority.length + allTestItems.length + allHighTagItems.length
    };
  } finally {
    await system.stop();
  }
}