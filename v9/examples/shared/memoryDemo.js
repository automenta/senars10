/**
 * @file: examples/shared/memoryDemo.js
 * @description: Shared functionality for memory demonstration used by both tests and examples
 */

import createCore from '../../core/orchestration/createCore.js';
import { Task, Term, Punctuation, TruthValue } from '../../core/index.js';

// Export the main functionality for both tests and examples to use
export async function demonstrateMemorySystem() {
  const core = await createCore();

  try {
    // 1. Create focus sets for different attention areas
    core.focus.createFocusSet('working-memory', 5);
    core.focus.createFocusSet('long-term-storage', 10);
    core.focus.createFocusSet('attention-focus', 3);
    core.focus.createFocusSet('pattern-buffer', 8);

    // 2. Set current focus to working memory
    core.focus.setFocus('working-memory');

    // 3. Add items with different priorities and metadata
    const tasks = [
      new Task(
        new Term('Critical system temperature exceeded threshold'),
        Punctuation.GOAL,
        new TruthValue(0.9, 0.9),
        Date.now(),
        Date.now(),
        1.0
      ),
      new Task(
        new Term('Daily standup meeting at 9:00 AM'),
        Punctuation.GOAL,
        new TruthValue(0.7, 0.7),
        Date.now(),
        Date.now(),
        0.7
      ),
      new Task(
        new Term('Unusual traffic pattern detected on port 443'),
        Punctuation.BELIEF,
        new TruthValue(0.8, 0.8),
        Date.now(),
        Date.now(),
        0.8
      ),
      new Task(
        new Term('System architecture documentation'),
        Punctuation.BELIEF,
        new TruthValue(0.5, 0.5),
        Date.now(),
        Date.now(),
        0.3
      )
    ];

    // Add items to memory
    core.memory.addTask(tasks[0]);
    core.memory.addTask(tasks[1]);

    // 4. Demonstrate focus set management
    core.focus.setFocus('attention-focus');
    core.memory.addTask(tasks[2]);

    core.focus.setFocus('long-term-storage');
    core.memory.addTask(tasks[3]);

    // Switch back to working-memory to test retrieval
    core.focus.setFocus('working-memory');

    // Get items from current focus
    const focusItems = core.focus.getFocusItems(3);

    // 5. Demonstrate attention mechanism
    core.memory.focus.updateFocusAttention('working-memory', 0.8);
    core.memory.focus.updateFocusAttention('attention-focus', 0.6);
    core.memory.focus.updateFocusAttention('long-term-storage', 0.2);

    const focusStats = core.memory.focus.getFocusSetStats();

    // 6. Demonstrate query optimization
    const highPriorityItems = core.memory.query({
      minPriority: 8,
      limit: 5
    });

    const alertItems = core.memory.query({
      type: 'alert',
      limit: 5
    });

    const urgentItems = core.memory.query({
      tags: ['urgent'],
      limit: 5
    });

    // 7. Get memory statistics
    const memStats = core.memory.getStats();

    // 8. Demonstrate attention-based sorting
    core.memory.focus.setFocus('attention-focus');
    const attentionItems = core.memory.focus.getFocusItems(5);

    // Return results for verification
    return {
      focusItems,
      focusStats,
      highPriorityItems,
      alertItems,
      urgentItems,
      memStats,
      attentionItems,
      totalItems: tasks.length
    };

  } finally {
    await core.stop();
    await core.destroy();
  }
}