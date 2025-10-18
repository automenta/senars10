/**
 * @file core/reasoning/lm/Derivation.js
 * @description Handles the derivation process - applying rules to premises
 */

import { Winnowing, SimpleRuleEvaluator } from './Winnowing.js';
import { Task } from '../../Task.js';

/**
 * Derivation class - handles rule application to premises
 */
export class Derivation {
  constructor(options = {}) {
    this.winnowingEnabled = options.winnowingEnabled !== false;
    this.maxNewTasks = options.maxNewTasks || 10;
    this.maxNewPremises = options.maxNewPremises || 5;
    
    // Initialize rule evaluation system
    this.winnowing = new Winnowing();
    this.simpleEvaluator = new SimpleRuleEvaluator();
    
    // Buffers for new premises and tasks generated during derivation
    this.premiseBuffer = [];
    this.taskBuffer = [];
    
    // Track resources used in this derivation
    this.resourcesUsed = {
      rulesApplied: 0,
      tasksGenerated: 0,
      premisesGenerated: 0
    };
  }

  /**
   * Applies rules to a premise and returns the results
   * @param {Premise} premise - The premise to apply rules to
   * @param {Array<Rule>} rules - The active rules to apply
   * @param {object} context - The reasoning context
   * @returns {Promise<{premises: Array, tasks: Array}>} Results from rule application
   */
  async applyRules(premise, rules, context) {
    // Reset resource tracking for this derivation
    this.resourcesUsed = {
      rulesApplied: 0,
      tasksGenerated: 0,
      premisesGenerated: 0
    };
    
    // Filter applicable rules based on the premise
    const applicableRules = this.winnowingEnabled
      ? this.winnowing.filterRules(premise, rules)
      : this.simpleEvaluator.evaluate(premise, rules);
    
    // Apply each applicable rule to the premise
    for (const rule of applicableRules) {
      if (!rule.enabled) continue;
      
      // Check resource limits
      if (this.resourcesUsed.rulesApplied >= (context.maxRulesPerDerivation || 10)) {
        break; // Don't apply more rules to preserve fairness
      }
      
      try {
        const startTime = Date.now();
        const success = await this._applyRule(rule, premise, context);
        const executionTime = Date.now() - startTime;
        
        // Update rule performance metrics
        rule.updatePerformance(success, executionTime);
        this.resourcesUsed.rulesApplied++;
        
      } catch (error) {
        console.error(`Error applying rule ${rule.id}:`, error);
        rule.updatePerformance(false, Date.now() - startTime);
      }
    }
    
    // Return what was buffered during rule application
    return {
      premises: [...this.premiseBuffer],
      tasks: [...this.taskBuffer]
    };
  }

  /**
   * Applies a single rule to a premise
   * @private
   */
  async _applyRule(rule, premise, context) {
    try {
      const results = await rule.apply(premise, context);
      
      if (!results || !Array.isArray(results) || results.length === 0) {
        return true; // Rule applied successfully but produced no output
      }
      
      // Process the results (premises and tasks)
      for (const result of results) {
        if (this._isPremise(result)) {
          this._addPremiseToBuffer(result);
        } else if (this._isTask(result)) {
          this._addTaskToBuffer(result);
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error in rule ${rule.id} application:`, error);
      return false;
    }
  }

  /**
   * Checks if an object is a premise
   * @private
   */
  _isPremise(obj) {
    return obj && typeof obj === 'object' && obj.hasOwnProperty('type') && obj.constructor.name.includes('Premise');
  }

  /**
   * Checks if an object is a task
   * @private
   */
  _isTask(obj) {
    return obj instanceof Task || (obj && obj.hasOwnProperty('punctuation') && obj.hasOwnProperty('term'));
  }

  /**
   * Adds a premise to the buffer, respecting limits
   * @private
   */
  _addPremiseToBuffer(premise) {
    if (this.resourcesUsed.premisesGenerated < this.maxNewPremises) {
      this.premiseBuffer.push(premise);
      this.resourcesUsed.premisesGenerated++;
    }
  }

  /**
   * Adds a task to the buffer, respecting limits
   * @private
   */
  _addTaskToBuffer(task) {
    if (this.resourcesUsed.tasksGenerated < this.maxNewTasks) {
      this.taskBuffer.push(task);
      this.resourcesUsed.tasksGenerated++;
    }
  }

  /**
   * Clears the buffers
   */
  clearBuffers() {
    this.premiseBuffer = [];
    this.taskBuffer = [];
    this.resourcesUsed = {
      rulesApplied: 0,
      tasksGenerated: 0,
      premisesGenerated: 0
    };
  }

  /**
   * Gets statistics about the derivation
   */
  getStats() {
    return {
      ...this.resourcesUsed,
      premisesInBuffer: this.premiseBuffer.length,
      tasksInBuffer: this.taskBuffer.length
    };
  }
}