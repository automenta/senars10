import { Logger } from './base/utilities.js';

/**
 * Represents the context for a cognitive cycle.
 */
export class CycleContext {
  /**
   * Creates a new cycle context
   * @param {number} currentTime - The timestamp of the current cognitive cycle
   */
  constructor(currentTime) {
    this.currentTime = currentTime;
  }
}

/**
 * Runs a single, complete cognitive cycle.
 *
 * This is a stateless function that orchestrates the main reasoning loop.
 *
 * The process involves:
 * 1. Collecting all tasks from memory to form a candidate pool.
 * 2. Using the FocusSetSelector to choose a "focus set" of tasks.
 * 3. Updating the accessed_at timestamp for all tasks in the focus set.
 * 4. Passing the focus set to the Reasoner to derive new tasks (conclusions).
 * 5. Adding the newly derived tasks back into memory.
 * 6. Performing memory consolidation to manage knowledge.
 *
 * @param {Memory} memory - The system's memory component
 * @param {Reasoner} reasoner - The system's reasoner
 * @param {FocusSetSelector} selector - The focus set selector component
 * @param {CycleContext} context - The context object for the current cycle
 */
export function runSingleCycle(memory, reasoner, selector, context) {
  // 1. Collect all tasks from memory.
  const allTasks = memory.getAllTasks();
  if (allTasks.length === 0) return; // Nothing to do if memory is empty.

  // 2. Use the selector to choose the focus set.
  const focusSet = selector.select(allTasks, context.currentTime);
  if (focusSet.length === 0) return; // No tasks met the criteria for the focus set.

  // 3. Update accessed_at for all tasks in the focus set.
  focusSet.forEach(task => task.setAccessedAt(context.currentTime));

  // 4. Reason on the focus set to derive new knowledge.
  const derivedTasks = reasoner.reason(focusSet, memory, context);

  // 5. Add derived tasks back to memory.
  derivedTasks.forEach(task => memory.addTask(task, context.currentTime));

  // 6. Consolidate memory.
  memory.consolidate(context.currentTime);
}