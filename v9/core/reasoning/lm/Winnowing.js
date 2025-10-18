/**
 * @file core/reasoning/lm/Winnowing.js
 * @description Efficient rule evaluation system for filtering applicable rules
 */

/**
 * Winnowing system for efficient rule evaluation
 */
export class Winnowing {
  constructor() {
    this.indexes = new Map(); // Indexes for efficient rule filtering
    this.ruleFilters = new Map(); // Cached filtering rules
  }

  /**
   * Creates an index for a property of premises to enable efficient rule filtering
   * @param {string} property - The property to index (e.g., 'punctuation', 'termType')
   * @param {Function} extractor - Function to extract the property value from a premise
   */
  createIndex(property, extractor) {
    this.indexes.set(property, {
      extractor,
      index: new Map() // Maps property values to rule IDs
    });
  }

  /**
   * Adds a rule to appropriate indexes for efficient filtering
   * @param {Rule} rule - The rule to index
   * @param {Function} condition - Function that tests if the rule applies to a premise
   */
  addRuleToIndex(rule, condition) {
    // For now, just store the condition function
    this.ruleFilters.set(rule.id, condition);
  }

  /**
   * Filters rules based on premise properties using the indexes
   * @param {Premise} premise - The premise to filter rules for
   * @param {Array<Rule>} rules - Array of all rules
   * @returns {Array<Rule>} Array of potentially applicable rules
   */
  filterRules(premise, rules) {
    // Apply indexed filtering first
    const indexedFiltered = this._applyIndexFiltering(premise, rules);
    
    // Then apply rule-specific conditions
    return indexedFiltered.filter(rule => {
      const condition = this.ruleFilters.get(rule.id);
      return condition ? condition(premise) : true;
    });
  }

  /**
   * Applies indexes to filter rules
   * @private
   */
  _applyIndexFiltering(premise, rules) {
    // For now, return all rules - in a more complex system we would use property-based indexing
    return rules;
  }

  /**
   * Clears all indexes
   */
  clear() {
    this.indexes.clear();
    this.ruleFilters.clear();
  }
}

/**
 * Simple fallback implementation without indexing (for debugging)
 */
export class SimpleRuleEvaluator {
  /**
   * Evaluates all rules against the premise
   * @param {Premise} premise - The premise to evaluate
   * @param {Array<Rule>} rules - Array of rules to evaluate
   * @returns {Array<Rule>} Array of applicable rules
   */
  evaluate(premise, rules) {
    return rules.filter(rule => rule.canApply(premise));
  }
}