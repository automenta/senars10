import {Rule} from '../Rule.js';
import {Term} from '../../term/Term.js';
import {TruthFunctions} from './TruthFunctions.js';
import {PatternMatcher} from './PatternMatcher.js';

/**
 * Enhanced NALRule base class with sophisticated pattern matching and variable handling
 */
export class NALRule extends Rule {
    constructor(id, config = {}) {
        super(id, 'nal', config.priority || 1.0, config);
        this._patternMatcher = config.patternMatcher || new PatternMatcher();
        this._truthFunction = config.truthFunction || TruthFunctions.deduction;
        this._variableBindings = new Map();
        this.category = config.category || 'general'; // Add category property
    }

    /**
     * Check if the rule can be applied to the given task
     * @param {Object} task - The task to check against
     * @param {Object} context - Additional context for the rule application
     * @returns {boolean} - Whether the rule can be applied
     */
    canApply(task, context = {}) {
        if (!super.canApply(task)) return false;
        return this._matches(task, context);
    }

    /**
     * Apply the rule to the given task
     * @param {Object} task - The task to apply the rule to
     * @param {Object} context - Additional context for the rule application
     * @returns {Array} - Array of derived tasks
     */
    async apply(task, context = {}) {
        if (!this.canApply(task, context)) return {results: [], rule: this};

        const start = performance.now();
        try {
            const results = await this._apply(task, context);
            return {results, rule: this._updateMetrics(true, performance.now() - start)};
        } catch (error) {
            throw {error, rule: this._updateMetrics(false, performance.now() - start)};
        }
    }

    /**
     * Template method to match a task against the rule's pattern
     * @param {Object} task - The task to match
     * @param {Object} context - Additional context
     * @returns {boolean} - Whether the task matches
     */
    _matches(task, context) {
        return true; // Override in subclasses
    }

    /**
     * Template method to apply the rule to a task
     * @param {Object} task - The task to apply the rule to
     * @param {Object} context - Additional context
     * @returns {Array} - Array of derived tasks
     */
    async _apply(task, context) {
        return []; // Override in subclasses
    }

    /**
     * Unify two terms, creating variable bindings
     * @param {Term} pattern - The pattern term
     * @param {Term} term - The actual term
     * @returns {Map|null} - Map of variable bindings or null if unification fails
     */
    _unify(pattern, term) {
        return this._patternMatcher.unify(pattern, term);
    }
    
    /**
     * Unify two terms using higher-order pattern matching
     * @param {Term} pattern - The pattern term
     * @param {Term} term - The actual term
     * @returns {Map|null} - Map of variable bindings or null if unification fails
     */
    _unifyHigherOrder(pattern, term) {
        return this._patternMatcher.unifyHigherOrder(pattern, term);
    }

    /**
     * Apply variable substitutions to a term
     * @param {Term} term - The term to substitute
     * @param {Map} bindings - The variable bindings
     * @returns {Term} - The substituted term
     */
    _substitute(term, bindings) {
        return this._patternMatcher.substitute(term, bindings);
    }

    /**
     * Calculate the derived truth value using the truth function
     * @param {Object} truth1 - First truth value
     * @param {Object} truth2 - Second truth value
     * @returns {Object} - Derived truth value
     */
    _calculateTruth(truth1, truth2) {
        if (this._truthFunction) {
            return this._truthFunction(truth1, truth2);
        }
        return truth1; // Default: return the first truth value unchanged
    }

    /**
     * Create a derived task based on the original task and new properties
     * @param {Object} originalTask - The original task
     * @param {Object} properties - New properties for the derived task
     * @returns {Object} - The derived task
     */
    _createDerivedTask(originalTask, properties) {
        return {
            term: properties.term || originalTask.term,
            truth: properties.truth || originalTask.truth,
            type: properties.type || originalTask.type,
            stamp: properties.stamp || originalTask.stamp,
            priority: properties.priority || (originalTask.priority * this.priority)
        };
    }
}