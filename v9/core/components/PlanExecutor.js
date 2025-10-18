import { Component, ComponentHealth, ComponentMetrics } from './Component.js';
import { Logger } from '../base/utilities.js';

/**
 * Plan execution service supporting HTN and A* planning approaches.
 */
export class PlanExecutor extends Component {
  constructor() {
    super();
    this.planners = new Map(); // plannerId -> planner object
    this.executors = new Map(); // executorId -> executor object
    this.runningTasks = new Map(); // taskId -> task object
    this.completedTasks = []; // history of completed tasks
    this.failedTasks = []; // history of failed tasks
    this.goals = new Set(); // active goals
    this.planLibrary = new Map(); // planId -> plan definition

    // Default configuration
    this.config = {
      maxConcurrentTasks: 5,
      taskTimeout: 60000, // 60 seconds
      maxRetries: 3,
      retryDelay: 1000
    };
  }

  /**
   * Initializes the plan executor.
   * @param {ComponentConfig} config - The component configuration
   */
  async initialize(config) {
    await super.initialize(config);
    this.planners = new Map(); // plannerId -> planner object
    this.executors = new Map(); // executorId -> executor object
    this.runningTasks = new Map(); // taskId -> task object
    this.completedTasks = []; // history of completed tasks
    this.failedTasks = []; // history of failed tasks
    this.goals = new Set(); // active goals
    this.planLibrary = new Map(); // planId -> plan definition

    // Update configuration from provided config
    if (config.config && typeof config.config === 'object') {
      this.config = { ...this.config, ...config.config };
    }

    // Register default planners and executors
    this._registerDefaultPlanners();
    this._registerDefaultExecutors();
  }

  /**
   * Registers a planner.
   * @param {string} id - The planner ID
   * @param {Object} planner - The planner object with plan() method
   */
  registerPlanner(id, planner) {
    if (typeof planner.plan !== 'function') {
      throw new Error(`Planner ${id} must have a plan() method`);
    }
    this.planners.set(id, planner);
  }

  /**
   * Registers an executor.
   * @param {string} id - The executor ID
   * @param {Object} executor - The executor object with execute() method
   */
  registerExecutor(id, executor) {
    if (typeof executor.execute !== 'function') {
      throw new Error(`Executor ${id} must have an execute() method`);
    }
    this.executors.set(id, executor);
  }

  /**
   * Registers a plan in the library.
   * @param {string} id - The plan ID
   * @param {Object} plan - The plan definition
   */
  registerPlan(id, plan) {
    this.planLibrary.set(id, plan);
  }

  /**
   * Executes a goal using the appropriate planning method.
   * @param {Object} goal - The goal to achieve
   * @param {string} [plannerId='htn'] - The planner to use
   * @param {string} [executorId='default'] - The executor to use
   * @returns {Promise<any>} The result of task execution
   */
  async executeGoal(goal, plannerId = 'htn', executorId = 'default') {
    const taskId = this._generateTaskId(goal);

    // Check if we have a registered planner
    if (!this.planners.has(plannerId)) {
      throw new Error(`Unknown planner: ${plannerId}`);
    }

    // Check if we have a registered executor
    if (!this.executors.has(executorId)) {
      throw new Error(`Unknown executor: ${executorId}`);
    }

    const planner = this.planners.get(plannerId);
    const executor = this.executors.get(executorId);

    try {
      // Generate a plan for the goal
      const plan = await planner.plan(goal);

      // Execute the plan
      const startTime = Date.now();
      this.runningTasks.set(taskId, {
        id: taskId,
        goal,
        plan,
        startTime,
        status: 'running'
      });

      const result = await this._executePlan(plan, executor);

      // Complete the task successfully
      const task = this.runningTasks.get(taskId);
      task.status = 'completed';
      task.result = result;
      task.endTime = Date.now();
      task.duration = task.endTime - task.startTime;

      this.completedTasks.push(task);
      this.runningTasks.delete(taskId);

      return result;
    } catch (error) {
      // Mark task as failed
      const task = this.runningTasks.get(taskId);
      if (task) {
        task.status = 'failed';
        task.error = error.message;
        task.endTime = Date.now();
        task.duration = task.endTime - task.startTime;

        this.failedTasks.push(task);
        this.runningTasks.delete(taskId);
      }

      Logger.error(`Task ${taskId} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Executes a predefined plan from the library.
   * @param {string} planId - The ID of the plan in the library
   * @param {any} context - The context to execute the plan with
   * @param {string} [executorId='default'] - The executor to use
   * @returns {Promise<any>} The result of plan execution
   */
  async executePlan(planId, context, executorId = 'default') {
    const plan = this.planLibrary.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found in library`);
    }

    if (!this.executors.has(executorId)) {
      throw new Error(`Unknown executor: ${executorId}`);
    }

    const executor = this.executors.get(executorId);
    return this._executePlan(plan, executor, context);
  }

  /**
   * Executes a plan with the given executor.
   * @private
   */
  async _executePlan(plan, executor, context = {}) {
    if (Array.isArray(plan)) {
      // Sequential execution of plan steps
      const results = [];
      for (const step of plan) {
        const stepResult = await this._executeStep(step, executor, context);
        results.push(stepResult);
      }
      return results;
    } else if (typeof plan === 'object' && plan.steps) {
      // Hierarchical Task Network (HTN) execution
      return this._executeHTNPlan(plan, executor, context);
    } else {
      // Single step execution
      return this._executeStep(plan, executor, context);
    }
  }

  /**
   * Executes a single plan step.
   * @private
   */
  async _executeStep(step, executor, context) {
    // Handle potentially retryable steps
    let retries = 0;
    let lastError;

    while (retries <= this.config.maxRetries) {
      try {
        return await executor.execute(step, context);
      } catch (error) {
        lastError = error;
        retries++;

        if (retries <= this.config.maxRetries) {
          await this._delay(this.config.retryDelay * retries);
        }
      }
    }

    throw lastError;
  }

  /**
   * Executes an HTN (Hierarchical Task Network) plan.
   * @private
   */
  async _executeHTNPlan(plan, executor, context) {
    const results = {};

    for (const step of plan.steps) {
      if (step.method && Array.isArray(step.method)) {
        // Decompose compound task using submethods
        for (const substep of step.method) {
          const subresult = await this._executeStep(substep, executor, context);
          results[step.task] = results[step.task] || [];
          results[step.task].push(subresult);
        }
      } else {
        // Execute primitive task
        const result = await this._executeStep(step, executor, context);
        results[step.task || 'result'] = result;
      }
    }

    return results;
  }

  /**
   * Cancels a running task.
   * @param {string} taskId - The ID of the task to cancel
   * @returns {boolean} True if task was found and canceled
   */
  cancelTask(taskId) {
    const task = this.runningTasks.get(taskId);
    if (task) {
      task.status = 'canceled';
      task.endTime = Date.now();
      task.duration = task.endTime - task.startTime;

      this.completedTasks.push(task);
      this.runningTasks.delete(taskId);
      return true;
    }
    return false;
  }

  /**
   * Gets the status of a task.
   * @param {string} taskId - The task ID
   * @returns {Object|null} Task status or null if not found
   */
  getTaskStatus(taskId) {
    if (this.runningTasks.has(taskId)) {
      return this.runningTasks.get(taskId);
    }

    const completed = this.completedTasks.find(t => t.id === taskId);
    if (completed) return completed;

    const failed = this.failedTasks.find(t => t.id === taskId);
    if (failed) return failed;

    return null;
  }

  /**
   * Gets all active goals.
   * @returns {Array} Array of active goals
   */
  getActiveGoals() {
    return Array.from(this.goals);
  }

  /**
   * Gets execution statistics.
   * @returns {Object} Execution statistics
   */
  getStats() {
    return {
      totalCompleted: this.completedTasks.length,
      totalFailed: this.failedTasks.length,
      currentlyRunning: this.runningTasks.size,
      totalTasks: this.completedTasks.length + this.failedTasks.length + this.runningTasks.size,
      successRate: this.completedTasks.length /
        Math.max(1, this.completedTasks.length + this.failedTasks.length)
    };
  }

  /**
   * Registers default planners.
   * @private
   */
  _registerDefaultPlanners() {
    // HTN Planner - Hierarchical Task Network
    this.registerPlanner('htn', {
      async plan(goal) {
        // A simple HTN planner that decomposes high-level goals
        // In a real implementation, this would be much more sophisticated
        if (typeof goal === 'object' && goal.decompose) {
          return goal.decompose();
        }

        // Default: treat the goal as a single primitive task
        return [{ task: 'achieve', parameters: goal }];
      }
    });

    // Simple A* Planner - Pathfinding
    this.registerPlanner('astar', {
      async plan(goal) {
        // A simple A* pathfinding planner
        // In a real implementation, this would implement proper A* algorithm
        if (goal.start && goal.goal) {
          // Simulate pathfinding
          return [
            { action: 'navigate', from: goal.start, to: goal.goal },
            { action: 'arrive', destination: goal.goal }
          ];
        }

        return [{ action: 'simple_action', goal }];
      }
    });
  }

  /**
   * Registers default executors.
   * @private
   */
  _registerDefaultExecutors() {
    // Default executor - performs basic actions
    this.registerExecutor('default', {
      async execute(step, context) {
        // Handle different types of steps
        if (typeof step === 'function') {
          return await step(context);
        } else if (typeof step.execute === 'function') {
          return await step.execute(context);
        } else {
          // Simulate execution of step
          return {
            status: 'completed',
            step,
            timestamp: Date.now(),
            context
          };
        }
      }
    });

    // Simulation executor - simulates execution without side effects
    this.registerExecutor('simulation', {
      async execute(step, context) {
        return {
          status: 'simulated',
          step,
          simulatedResult: 'This would have been executed in real world',
          timestamp: Date.now(),
          context
        };
      }
    });
  }

  /**
   * Generates a unique task ID.
   * @private
   */
  _generateTaskId(goal) {
    const goalString = JSON.stringify(goal);
    const timestamp = Date.now();
    return `task_${this._simpleHash(goalString + timestamp)}`;
  }

  /**
   * Simple hash function.
   * @private
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Simple delay function.
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gets the current health of the component.
   * @returns {ComponentHealth}
   */
  getHealth() {
    const stats = this.getStats();
    const status = stats.currentlyRunning > 0 ? 'active' :
                  stats.totalCompleted > 0 ? 'healthy' : 'initialized';
    return new ComponentHealth(status);
  }

  /**
   * Gets performance metrics from the component.
   * @returns {ComponentMetrics}
   */
  getMetrics() {
    const stats = this.getStats();
    return new ComponentMetrics({
      runningTasks: stats.currentlyRunning,
      completedTasks: stats.totalCompleted,
      failedTasks: stats.totalFailed,
      registeredPlanners: this.planners.size,
      registeredExecutors: this.executors.size,
      planLibrarySize: this.planLibrary.size
    });
  }
}