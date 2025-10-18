import Planner from './Planner.js';
import { Storage } from '../base/collections.js';
import { Logger } from '../base/utilities.js';
import { DEFAULTS } from '../base/constants.js';

/**
 * HTNPlanner - Hierarchical Task Network Planning Component
 *
 * Implements HTN (Hierarchical Task Network) planning for goal decomposition
 * into executable subtasks using methods and decomposition rules.
 */
class HTNPlanner extends Planner {
  constructor() {
    super();

    // Planning domain definition
    this.methods = new Storage(); // Maps compound tasks to methods that can decompose them
    this.operators = new Storage(); // Maps primitive tasks to their execution functions
    this.tasks = new Storage(); // Current tasks in the planning system
    this.planCache = new Storage(); // Cached plans for efficiency

    // Planning state
    this.currentState = {}; // Current world state for planning
    this.currentPlan = []; // Current plan being constructed
    this.planStack = []; // Stack for HTN planning recursion

    // Configuration
    this.maxDepth = DEFAULTS.HTN_MAX_DEPTH || 10;
    this.maxPlanSteps = DEFAULTS.HTN_MAX_PLAN_STEPS || 100;
    this.timeout = DEFAULTS.HTN_TIMEOUT || 5000; // 5 seconds

    // Additional HTN-specific statistics
    this.stats.methodsApplied = 0;
    this.stats.backtracks = 0;
    this.stats.averagePlanLength = 0;
  }

  async initialize(config = {}) {
    await super.initialize(config);

    // Apply configuration
    this.maxDepth = config.maxDepth ?? this.maxDepth;
    this.maxPlanSteps = config.maxPlanSteps ?? this.maxPlanSteps;
    this.timeout = config.timeout ?? this.timeout;

    // Clear planning data
    this.methods.clear();
    this.operators.clear();
    this.tasks.clear();
    this.planCache.clear();

    this.currentPlan = [];
    this.planStack = [];
    this.currentState = {};

    // Reset statistics using inherited base stats
    await super.initialize(config);
    // Add HTN-specific statistics
    this.stats.methodsApplied = 0;
    this.stats.backtracks = 0;
    this.stats.averagePlanLength = 0;

    // Register default operators
    this._registerDefaultOperators();
  }

  /**
   * Register a method for decomposing a compound task
   * @param {string} taskName - Name of the compound task to decompose
   * @param {Function} method - Function that decomposes the task
   * @param {Object} conditions - Precondition checks
   * @param {number} priority - Method priority for selection
   */
  registerMethod(taskName, method, conditions = {}, priority = 0.5) {
    const methodId = `${taskName}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const methodDef = {
      id: methodId,
      taskName,
      method,
      conditions,
      priority,
      registeredAt: Date.now()
    };

    if (!this.methods.has(taskName)) {
      this.methods.set(taskName, []);
    }

    const taskMethods = this.methods.get(taskName);
    taskMethods.push(methodDef);

    // Sort by priority (higher priority first)
    taskMethods.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Register an operator for executing a primitive task
   * @param {string} taskName - Name of the primitive task
   * @param {Function} executor - Function that executes the task
   * @param {Object} preconditions - Conditions that must be true
   * @param {Object} effects - Effects that the task has on the world state
   */
  registerOperator(taskName, executor, preconditions = {}, effects = {}) {
    this.operators.set(taskName, {
      name: taskName,
      executor,
      preconditions,
      effects,
      registeredAt: Date.now()
    });
  }

  /**
   * Plan to achieve a goal
   * @param {string|Object} goal - Goal to be achieved
   * @param {Object} context - Current context/state
   * @returns {Array|null} Plan as array of primitive tasks, or null if no plan exists
   */
  async plan(goal, context = {}) {
    const startTime = Date.now();

    // Create initial task network
    const initialTask = typeof goal === 'string' ? { name: goal, type: 'goal' } : goal;
    const taskNetwork = [initialTask];

    // Prepare planning context
    const planningContext = {
      ...context,
      ...this.currentState,
      depth: 0,
      steps: 0,
      startTime
    };

    try {
      const plan = await this._hierarchicalPlan(taskNetwork, planningContext);

      if (plan) {
        this._updateStatsOnPlanGeneration(plan.length, Date.now() - startTime);
        this.stats.averagePlanLength = (this.stats.averagePlanLength * (this.stats.plansGenerated - 1) + plan.length) / this.stats.plansGenerated;
        return plan;
      }

      return null;
    } catch (error) {
      Logger.error('HTN Planning failed', error);
      return null;
    }
  }

  /**
   * Execute a plan
   * @param {Array} plan - Plan to execute (array of primitive tasks)
   * @param {Object} context - Execution context
   * @returns {Object} Execution result
   */
  async executePlan(plan, context = {}) {
    if (!plan || !Array.isArray(plan) || plan.length === 0) {
      return { success: false, reason: 'Empty plan' };
    }

    const result = {
      success: true,
      executedTasks: [],
      failedTasks: [],
      stateChanges: []
    };

    for (let i = 0; i < plan.length; i++) {
      const task = plan[i];

      if (Date.now() - context.startTime > this.timeout) {
        result.success = false;
        result.reason = 'Plan execution timeout';
        break;
      }

      try {
        const taskResult = await this.executeTask(task, context);

        if (taskResult.success) {
          result.executedTasks.push({
            task,
            result: taskResult,
            index: i
          });

          // Update context with task effects
          if (taskResult.effects) {
            result.stateChanges.push(taskResult.effects);
            context = { ...context, ...taskResult.effects };
            this.currentState = { ...this.currentState, ...taskResult.effects };
          }
        } else {
          result.success = false;
          result.failedTasks.push({
            task,
            error: taskResult.error,
            index: i
          });
          break; // Stop execution on failure
        }
      } catch (error) {
        result.success = false;
        result.failedTasks.push({
          task,
          error: error.message,
          index: i
        });
        break;
      }
    }

    this._updateStatsOnPlanExecution(result.success);

    return result;
  }

  /**
   * Execute a single task
   * @param {Object} task - Task to execute
   * @param {Object} context - Execution context
   * @returns {Object} Execution result
   */
  async executeTask(task, context = {}) {
    const taskName = typeof task === 'string' ? task : task.name;
    const operator = this.operators.get(taskName);

    if (!operator) {
      return {
        success: false,
        error: `No operator registered for task: ${taskName}`,
        task
      };
    }

    // Check preconditions
    if (!this._checkPreconditions(operator.preconditions, context)) {
      return {
        success: false,
        error: `Preconditions not met for task: ${taskName}`,
        task,
        preconditions: operator.preconditions
      };
    }

    try {
      // Execute the task
      const result = await Promise.resolve(operator.executor(task, context));

      // Apply effects to context
      const effects = { ...operator.effects };
      if (result && typeof result === 'object' && result.effects) {
        Object.assign(effects, result.effects);
      }

      return {
        success: true,
        task,
        result,
        effects
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        task
      };
    }
  }

  /**
   * Hierarchical planning algorithm
   * @private
   */
  async _hierarchicalPlan(taskNetwork, context) {
    if (Date.now() - context.startTime > this.timeout) {
      throw new Error('Planning timeout');
    }

    if (context.depth > this.maxDepth) {
      return null; // Exceeded max depth
    }

    if (context.steps > this.maxPlanSteps) {
      return null; // Exceeded max steps
    }

    if (taskNetwork.length === 0) {
      return []; // Successfully decomposed all tasks
    }

    const [currentTask, ...remainingTasks] = taskNetwork;

    // Check if current task is primitive (has operator) or compound (needs decomposition)
    if (this.operators.has(currentTask.name)) {
      // Primitive task - add to plan and continue with remaining tasks
      const plan = [currentTask];
      const remainingPlan = await this._hierarchicalPlan(remainingTasks, {
        ...context,
        depth: context.depth + 1,
        steps: context.steps + 1
      });

      return remainingPlan !== null ? [...plan, ...remainingPlan] : null;
    } else {
      // Compound task - find applicable methods to decompose it
      const applicableMethods = this._getApplicableMethods(currentTask, context);

      for (const method of applicableMethods) {
        try {
          // Apply method to decompose the task
          const decomposition = await Promise.resolve(method.method(currentTask, context));

          if (decomposition && Array.isArray(decomposition)) {
            // Combine decomposed tasks with remaining tasks
            const newTaskNetwork = [...decomposition, ...remainingTasks];

            // Recursively plan for the new task network
            const plan = await this._hierarchicalPlan(newTaskNetwork, {
              ...context,
              depth: context.depth + 1,
              steps: context.steps + decomposition.length
            });

            if (plan !== null) {
              this.stats.methodsApplied++;
              return plan;
            } else {
              this.stats.backtracks++;
            }
          }
        } catch (error) {
          Logger.warn('Method application failed, trying next method', error);
          this.stats.backtracks++;
        }
      }

      // No method successfully decomposed the task
      return null;
    }
  }

  /**
   * Get applicable methods for a task in the current context
   * @private
   */
  _getApplicableMethods(task, context) {
    const taskMethods = this.methods.get(task.name) || [];

    // Filter methods by preconditions and sort by priority
    return taskMethods.filter(method =>
      this._checkPreconditions(method.conditions, context)
    );
  }

  /**
   * Check if preconditions are met in the current context
   * @private
   */
  _checkPreconditions(preconditions, context) {
    for (const [key, value] of Object.entries(preconditions)) {
      if (typeof value === 'function') {
        // If it's a function, call it with context to determine if condition is met
        if (!value(context)) {
          return false;
        }
      } else if (context[key] !== value) {
        // Otherwise, do direct comparison
        return false;
      }
    }
    return true;
  }

  /**
   * Register default operators for basic tasks
   * @private
   */
  _registerDefaultOperators() {
    // Example: Move operator
    this.registerOperator('move', async (task, context) => {
      const from = task.from || context.location;
      const to = task.to;

      if (!to) {
        throw new Error('Move task requires "to" parameter');
      }

      return {
        success: true,
        message: `Moved from ${from} to ${to}`,
        effects: { location: to }
      };
    }, {}, { location: null });

    // Example: Pick up operator
    this.registerOperator('pickup', async (task, context) => {
      const object = task.object;
      const location = context.location;

      if (!object) {
        throw new Error('Pickup task requires "object" parameter');
      }

      const newInventory = [...(context.inventory || []), object];

      return {
        success: true,
        message: `Picked up ${object} at ${location}`,
        effects: { inventory: newInventory }
      };
    }, {}, { inventory: [] });

    // Example: Put down operator
    this.registerOperator('putdown', async (task, context) => {
      const object = task.object;

      if (!object) {
        throw new Error('Putdown task requires "object" parameter');
      }

      const inventory = context.inventory || [];
      const newInventory = inventory.filter(item => item !== object);

      return {
        success: true,
        message: `Put down ${object}`,
        effects: { inventory: newInventory }
      };
    }, {}, { inventory: [] });
  }

  /**
   * Add a compound task with decomposition methods
   * @param {string} taskName - Name of the compound task
   * @param {Array} methods - Array of method functions for decomposition
   */
  addCompoundTask(taskName, methods) {
    for (const method of methods) {
      this.registerMethod(taskName, method);
    }
  }

  /**
   * Get planning statistics
   */
  getStats() {
    return {
      ...this.stats,
      registeredMethods: this.methods.size(),
      registeredOperators: this.operators.size(),
      currentPlanLength: this.currentPlan.length,
      currentStackDepth: this.planStack.length
    };
  }

  /**
   * Create a plan to achieve a specific goal using hierarchical decomposition
   * @param {Object} goal - Goal object with name and parameters
   * @param {Object} startState - Initial state
   * @returns {Array} Plan as an array of primitive tasks
   */
  async createGoalPlan(goal, startState = {}) {
    this.currentState = { ...startState };

    const plan = await this.plan(goal, this.currentState);

    if (plan) {
      // Cache the plan if it's successful
      const cacheKey = this._generatePlanCacheKey(goal, startState);
      this.planCache.set(cacheKey, plan);
    }

    return plan;
  }

  /**
   * Generate a cache key for a specific goal and state
   * @private
   */
  _generatePlanCacheKey(goal, state) {
    // Create a deterministic key based on goal and state
    return JSON.stringify({
      goal: goal.name || goal,
      state: Object.keys(state).sort().map(key => [key, state[key]]).flat().join(',')
    });
  }
}

export default HTNPlanner;