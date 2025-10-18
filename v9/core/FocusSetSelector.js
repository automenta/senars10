import { DEFAULTS } from './base/constants.js';

/**
 * Selects a set of tasks to focus on for the current cycle.
 *
 * This component implements an advanced selection algorithm that considers not only
 * a task's intrinsic priority but also its urgency and the system's need for
 * cognitive diversity.
 */
export class FocusSetSelector {
  /**
   * Creates a new FocusSetSelector with the given parameters.
   * @param {number} maxSize - The maximum number of tasks to include in the focus set
   * @param {number} priorityThreshold - A threshold below which tasks are not considered
   * @param {number} urgencyWeight - Weighting factor for urgency (how long a task has been waiting)
   * @param {number} diversityFactor - Weighting factor for cognitive diversity
   */
  constructor(
    maxSize = DEFAULTS.FOCUS_SIZE || 5,
    priorityThreshold = 0.1,
    urgencyWeight = 0.2,
    diversityFactor = 0.1
  ) {
    this.maxSize = maxSize;
    this.priorityThreshold = priorityThreshold;
    this.urgencyWeight = urgencyWeight;
    this.diversityFactor = diversityFactor;
  }

  /**
   * Selects the focus set from a list of candidate tasks.
   * @param {Task[]} tasks - An array of all tasks currently in memory
   * @param {number} currentTime - The current system timestamp for urgency calculations
   * @returns {Task[]} An array containing the selected tasks, sorted by their composite score
   */
  select(tasks, currentTime) {
    if (!tasks || tasks.length === 0) {
      return [];
    }

    // 1. Filter tasks that don't meet the minimum priority threshold
    const candidates = tasks.filter(task => task.getPriority() >= this.priorityThreshold);

    if (candidates.length === 0) {
      return [];
    }

    // 2. Calculate normalization factors for urgency and diversity
    const maxUrgency = Math.max(...candidates.map(task => currentTime - task.getAccessedAt()));
    const maxDiversity = Math.max(...candidates.map(task => task.term.complexity));

    // 3. Calculate composite scores for all candidate tasks
    const scoredTasks = candidates.map(task => {
      const urgency = maxUrgency > 0 ? (currentTime - task.getAccessedAt()) / maxUrgency : 0;
      const diversity = maxDiversity > 0 ? task.term.complexity / maxDiversity : 0;
      const score = task.getPriority() + this.urgencyWeight * urgency + this.diversityFactor * diversity;
      return { score, task };
    });

    // 4. Sort tasks by their composite score in descending order
    scoredTasks.sort((a, b) => b.score - a.score);

    // 5. Take the top maxSize tasks and return them
    return scoredTasks
      .slice(0, this.maxSize)
      .map(item => item.task);
  }

  /**
   * Updates the configuration parameters
   * @param {number} maxSize - New max size
   * @param {number} priorityThreshold - New priority threshold
   * @param {number} urgencyWeight - New urgency weight
   * @param {number} diversityFactor - New diversity factor
   */
  configure(maxSize, priorityThreshold, urgencyWeight, diversityFactor) {
    this.maxSize = maxSize;
    this.priorityThreshold = priorityThreshold;
    this.urgencyWeight = urgencyWeight;
    this.diversityFactor = diversityFactor;
  }
}