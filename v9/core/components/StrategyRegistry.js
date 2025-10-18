import { Component, ComponentHealth, ComponentMetrics } from './Component.js';
import { Logger } from '../base/utilities.js';

/**
 * Registry for managing different reasoning and execution strategies.
 */
export class StrategyRegistry extends Component {
  constructor() {
    super();
    this.strategies = new Map(); // strategyId -> { strategy, metadata }
    this.strategyGroups = new Map(); // groupName -> [strategyId, ...]
    this.activeStrategies = new Set(); // active strategy IDs
    this.strategyScores = new Map(); // strategyId -> performance score
    this.executionHistory = []; // recent execution results
  }

  /**
   * Initializes the strategy registry.
   * @param {ComponentConfig} config - The component configuration
   */
  async initialize(config) {
    await super.initialize(config);
    this.strategies = new Map(); // strategyId -> { strategy, metadata }
    this.strategyGroups = new Map(); // groupName -> [strategyId, ...]
    this.activeStrategies = new Set(); // active strategy IDs
    this.strategyScores = new Map(); // strategyId -> performance score
    this.executionHistory = []; // recent execution results
  }

  /**
   * Registers a new strategy.
   * @param {string} id - The strategy ID
   * @param {Object} strategy - The strategy object with execute() method
   * @param {Object} metadata - Strategy metadata (description, type, etc.)
   * @returns {boolean} True if registration was successful
   */
  registerStrategy(id, strategy, metadata = {}) {
    if (this.strategies.has(id)) {
      Logger.warn(`Strategy ${id} already exists, overwriting`);
    }

    // Validate that strategy has required methods
    if (typeof strategy.execute !== 'function') {
      throw new Error(`Strategy ${id} must have an execute() method`);
    }

    this.strategies.set(id, {
      strategy,
      metadata: {
        ...metadata,
        registeredAt: Date.now()
      }
    });

    // Add to active strategies by default
    this.activeStrategies.add(id);

    // Add to default group if not specified
    if (!metadata.group) {
      this.addToGroup(id, 'default');
    } else {
      this.addToGroup(id, metadata.group);
    }

    return true;
  }

  /**
   * Unregisters a strategy.
   * @param {string} id - The strategy ID
   * @returns {boolean} True if unregistration was successful
   */
  unregisterStrategy(id) {
    if (!this.strategies.has(id)) {
      return false;
    }

    // Remove from active strategies
    this.activeStrategies.delete(id);

    // Remove from all groups
    for (const [groupName, groupStrategies] of this.strategyGroups.entries()) {
      groupStrategies.delete(id);
      if (groupStrategies.size === 0) {
        this.strategyGroups.delete(groupName);
      }
    }

    // Remove from scores
    this.strategyScores.delete(id);

    // Remove from registry
    this.strategies.delete(id);

    return true;
  }

  /**
   * Gets a registered strategy.
   * @param {string} id - The strategy ID
   * @returns {Object|null} The strategy object or null if not found
   */
  getStrategy(id) {
    const entry = this.strategies.get(id);
    return entry ? entry.strategy : null;
  }

  /**
   * Gets strategy metadata.
   * @param {string} id - The strategy ID
   * @returns {Object|null} The strategy metadata or null if not found
   */
  getStrategyMetadata(id) {
    const entry = this.strategies.get(id);
    return entry ? entry.metadata : null;
  }

  /**
   * Executes a strategy with given context.
   * @param {string} id - The strategy ID
   * @param {...any} args - Arguments to pass to the strategy
   * @returns {any} The result of strategy execution
   */
  async executeStrategy(id, ...args) {
    if (!this.activeStrategies.has(id)) {
      throw new Error(`Strategy ${id} is not active`);
    }

    const strategy = this.getStrategy(id);
    if (!strategy) {
      throw new Error(`Strategy ${id} not found`);
    }

    const startTime = Date.now();
    let success = true;
    let result;

    try {
      result = await strategy.execute(...args);
    } catch (error) {
      success = false;
      Logger.error(`Strategy ${id} execution failed: ${error.message}`);
      throw error;
    } finally {
      const executionTime = Date.now() - startTime;

      // Update execution history
      this.executionHistory.push({
        id,
        success,
        executionTime,
        timestamp: Date.now(),
        args: args.length > 0 ? args.slice(0, 2) : [] // Limit args in history
      });

      // Keep history to a reasonable size
      if (this.executionHistory.length > 100) {
        this.executionHistory = this.executionHistory.slice(-50);
      }

      // Update strategy score based on performance
      if (success) {
        const currentScore = this.strategyScores.get(id) || 0;
        const scoreAdjustment = Math.max(0.1, 1.0 - (executionTime / 1000)); // Faster is better
        this.strategyScores.set(id, currentScore + scoreAdjustment);
      } else {
        const currentScore = this.strategyScores.get(id) || 0;
        this.strategyScores.set(id, Math.max(0, currentScore - 1));
      }
    }

    return result;
  }

  /**
   * Executes multiple strategies and returns results.
   * @param {string[]} strategyIds - Array of strategy IDs
   * @param {...any} args - Arguments to pass to each strategy
   * @returns {Array} Array of results from each strategy execution
   */
  async executeStrategies(strategyIds, ...args) {
    const results = [];
    for (const id of strategyIds) {
      try {
        const result = await this.executeStrategy(id, ...args);
        results.push({ id, result, success: true });
      } catch (error) {
        results.push({ id, error: error.message, success: false });
      }
    }
    return results;
  }

  /**
   * Adds a strategy to a group.
   * @param {string} id - The strategy ID
   * @param {string} groupName - The group name
   * @returns {boolean} True if successful
   */
  addToGroup(id, groupName) {
    if (!this.strategies.has(id)) {
      return false;
    }

    if (!this.strategyGroups.has(groupName)) {
      this.strategyGroups.set(groupName, new Set());
    }

    this.strategyGroups.get(groupName).add(id);
    return true;
  }

  /**
   * Gets strategies in a group.
   * @param {string} groupName - The group name
   * @returns {Array} Array of strategy IDs in the group
   */
  getGroup(groupName) {
    const group = this.strategyGroups.get(groupName);
    return group ? Array.from(group) : [];
  }

  /**
   * Gets all registered strategy IDs.
   * @returns {Array} Array of all strategy IDs
   */
  getAllStrategyIds() {
    return Array.from(this.strategies.keys());
  }

  /**
   * Gets all active strategy IDs.
   * @returns {Array} Array of active strategy IDs
   */
  getActiveStrategyIds() {
    return Array.from(this.activeStrategies);
  }

  /**
   * Activates a strategy.
   * @param {string} id - The strategy ID
   * @returns {boolean} True if successful
   */
  activateStrategy(id) {
    if (this.strategies.has(id)) {
      this.activeStrategies.add(id);
      return true;
    }
    return false;
  }

  /**
   * Deactivates a strategy.
   * @param {string} id - The strategy ID
   * @returns {boolean} True if successful
   */
  deactivateStrategy(id) {
    if (this.activeStrategies.has(id)) {
      this.activeStrategies.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Gets the execution history.
   * @returns {Array} Array of recent execution records
   */
  getExecutionHistory() {
    return [...this.executionHistory];
  }

  /**
   * Gets strategy performance scores.
   * @returns {Object} Object mapping strategy IDs to performance scores
   */
  getPerformanceScores() {
    return Object.fromEntries(this.strategyScores);
  }

  /**
   * Gets the current health of the component.
   * @returns {ComponentHealth}
   */
  getHealth() {
    const strategyCount = this.strategies.size;
    const status = strategyCount > 0 ? 'healthy' : 'initialized';
    return new ComponentHealth(status);
  }

  /**
   * Gets performance metrics from the component.
   * @returns {ComponentMetrics}
   */
  getMetrics() {
    return new ComponentMetrics({
      registeredStrategies: this.strategies.size,
      activeStrategies: this.activeStrategies.size,
      strategyGroups: this.strategyGroups.size,
      executionHistorySize: this.executionHistory.length
    });
  }
}