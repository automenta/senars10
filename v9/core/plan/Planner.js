import Component from '../base/Component.js';
import { Logger } from '../base/utilities.js';

/**
 * Abstract Planner superclass
 *
 * Provides common functionality and interface for different planning algorithms
 * such as HTN planning and A* pathfinding.
 */
class Planner extends Component {
  constructor() {
    super();
    this.stats = {
      plansGenerated: 0,
      plansExecuted: 0,
      totalSteps: 0,
      averageTime: 0,
      failures: 0
    };
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.stats = {
      plansGenerated: 0,
      plansExecuted: 0,
      totalSteps: 0,
      averageTime: 0,
      failures: 0
    };
  }

  /**
   * Abstract method for planning to achieve a goal
   * @param {string|Object} goal - Goal to be achieved
   * @param {Object} context - Current context/state
   * @returns {Array|null} Plan as array of primitive tasks, or null if no plan exists
   */
  async plan(goal, context = {}) {
    throw new Error('Plan method must be implemented by subclass');
  }

  /**
   * Abstract method for executing a plan
   * @param {Array} plan - Plan to execute (array of primitive tasks)
   * @param {Object} context - Execution context
   * @returns {Object} Execution result
   */
  async executePlan(plan, context = {}) {
    throw new Error('ExecutePlan method must be implemented by subclass');
  }

  /**
   * Get planning statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Update statistics after a successful plan generation
   * @protected
   */
  _updateStatsOnPlanGeneration(planLength, executionTime) {
    this.stats.plansGenerated++;
    this.stats.totalSteps += planLength || 0;
    this.stats.averageTime =
      ((this.stats.averageTime * (this.stats.plansGenerated - 1)) + executionTime) / this.stats.plansGenerated;
  }

  /**
   * Update statistics after a plan execution
   * @protected
   */
  _updateStatsOnPlanExecution(success) {
    this.stats.plansExecuted++;
    if (!success) {
      this.stats.failures++;
    }
  }
}

export default Planner;