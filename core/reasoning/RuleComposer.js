/**
 * RuleComposer: A utility for composing rules together to create more complex reasoning patterns
 */
export class RuleComposer {
    /**
     * Chain rules together so that the output of one rule becomes the input to the next
     * @param {...Rule} rules - Rules to chain together
     * @param {Object} config - Configuration options
     * @returns {Rule} - A composite rule that chains all the input rules
     */
    static chain(...rules) {
        if (rules.length === 0) {
            throw new Error('At least one rule must be provided for chaining');
        }

        if (rules.length === 1) {
            return rules[0]; // Return the single rule
        }

        return new ChainedRule(rules);
    }

    /**
     * Combine rules so that they all apply to the same input and their results are combined
     * @param {...Rule} rules - Rules to combine
     * @returns {Rule} - A composite rule that applies all input rules
     */
    static combine(...rules) {
        if (rules.length === 0) {
            throw new Error('At least one rule must be provided for combination');
        }

        if (rules.length === 1) {
            return rules[0]; // Return the single rule
        }

        return new CombinedRule(rules);
    }

    /**
     * Create a conditional rule that applies one rule if a condition is met, another otherwise
     * @param {Function} condition - A function that takes (task, context) and returns boolean
     * @param {Rule} ifRule - Rule to apply if condition is true
     * @param {Rule} elseRule - Rule to apply if condition is false
     * @returns {Rule} - A conditional rule
     */
    static conditional(condition, ifRule, elseRule) {
        return new ConditionalRule(condition, ifRule, elseRule);
    }

    /**
     * Create a rule that applies different rules based on task characteristics
     * @param {Array} ruleConditions - Array of {condition: Function, rule: Rule} objects
     * @returns {Rule} - A dispatcher rule
     */
    static dispatcher(ruleConditions) {
        return new DispatcherRule(ruleConditions);
    }

    /**
     * Create a rule that applies a sequence of rules until one succeeds
     * @param {...Rule} rules - Rules to try in sequence
     * @returns {Rule} - A fallback rule
     */
    static fallback(...rules) {
        return new FallbackRule(rules);
    }
}

/**
 * A rule that chains other rules together
 */
class ChainedRule {
    constructor(rules) {
        this.rules = rules;
        this.id = `chain-${rules.map(r => r.id).join('_')}`;
        this.type = 'chained';
        this.priority = Math.max(...rules.map(r => r.priority));
        this.enabled = true;
    }

    canApply(task) {
        return this.enabled && this.rules.length > 0 && this.rules[0].canApply(task);
    }

    async apply(task, context) {
        if (!this.canApply(task)) {
            return {results: [], rule: this};
        }

        let currentTasks = [task];
        let currentRule = this;

        for (const rule of this.rules) {
            const newTasks = [];

            for (const currentTask of currentTasks) {
                if (rule.canApply(currentTask)) {
                    try {
                        const result = await rule.apply(currentTask, context);
                        newTasks.push(...result.results);
                        currentRule = result.rule;
                    } catch (error) {
                        this.logger?.warn(`Chained rule ${rule.id} failed:`, error);
                    }
                }
            }

            if (newTasks.length === 0) {
                // If no results from this rule, stop the chain
                break;
            }

            currentTasks = newTasks;
        }

        return {results: currentTasks, rule: currentRule};
    }

    enable() {
        this.enabled = true;
        return this;
    }

    disable() {
        this.enabled = false;
        return this;
    }
}

/**
 * A rule that combines the results of multiple rules
 */
class CombinedRule {
    constructor(rules) {
        this.rules = rules;
        this.id = `combined-${rules.map(r => r.id).join('_')}`;
        this.type = 'combined';
        this.priority = rules.reduce((sum, r) => sum + r.priority, 0) / rules.length;
        this.enabled = true;
    }

    canApply(task) {
        return this.enabled && this.rules.length > 0;
    }

    async apply(task, context) {
        if (!this.canApply(task)) {
            return {results: [], rule: this};
        }

        let allResults = [];
        let currentRule = this;

        for (const rule of this.rules) {
            if (rule.canApply(task)) {
                try {
                    const result = await rule.apply(task, context);
                    allResults.push(...result.results);
                    currentRule = result.rule;
                } catch (error) {
                    this.logger?.warn(`Combined rule ${rule.id} failed:`, error);
                }
            }
        }

        return {results: allResults, rule: currentRule};
    }

    enable() {
        this.enabled = true;
        return this;
    }

    disable() {
        this.enabled = false;
        return this;
    }
}

/**
 * A rule that applies different rules based on a condition
 */
class ConditionalRule {
    constructor(condition, ifRule, elseRule) {
        this.condition = condition;
        this.ifRule = ifRule;
        this.elseRule = elseRule;
        this.id = `conditional-${ifRule.id}-or-${elseRule.id}`;
        this.type = 'conditional';
        this.priority = Math.max(ifRule.priority, elseRule.priority);
        this.enabled = true;
    }

    canApply(task, context) {
        if (!this.enabled) return false;

        const conditionResult = this.condition(task, context);
        const ruleToCheck = conditionResult ? this.ifRule : this.elseRule;
        return ruleToCheck.canApply(task, context);
    }

    async apply(task, context) {
        if (!this.enabled) {
            return {results: [], rule: this};
        }

        const conditionResult = this.condition(task, context);
        const ruleToApply = conditionResult ? this.ifRule : this.elseRule;

        try {
            const result = await ruleToApply.apply(task, context);
            return {results: result.results, rule: result.rule};
        } catch (error) {
            this.logger?.warn(`Conditional rule ${this.id} failed:`, error);
            return {results: [], rule: this};
        }
    }

    enable() {
        this.enabled = true;
        return this;
    }

    disable() {
        this.enabled = false;
        return this;
    }
}

/**
 * A rule that dispatches to different rules based on multiple conditions
 */
class DispatcherRule {
    constructor(ruleConditions) {
        this.ruleConditions = ruleConditions;
        this.id = `dispatcher-${ruleConditions.length}-rules`;
        this.type = 'dispatcher';
        this.priority = Math.max(...ruleConditions.map(rc => rc.rule.priority));
        this.enabled = true;
    }

    canApply(task, context) {
        if (!this.enabled) return false;

        for (const {condition, rule} of this.ruleConditions) {
            if (condition(task, context) && rule.canApply(task, context)) {
                return true;
            }
        }
        return false;
    }

    async apply(task, context) {
        if (!this.enabled) {
            return {results: [], rule: this};
        }

        for (const {condition, rule} of this.ruleConditions) {
            if (condition(task, context) && rule.canApply(task, context)) {
                try {
                    const result = await rule.apply(task, context);
                    return {results: result.results, rule: result.rule};
                } catch (error) {
                    this.logger?.warn(`Dispatcher rule ${rule.id} failed:`, error);
                }
            }
        }

        return {results: [], rule: this};
    }

    enable() {
        this.enabled = true;
        return this;
    }

    disable() {
        this.enabled = false;
        return this;
    }
}

/**
 * A rule that tries multiple rules in sequence until one succeeds
 */
class FallbackRule {
    constructor(rules) {
        this.rules = rules;
        this.id = `fallback-${rules.map(r => r.id).join('_')}`;
        this.type = 'fallback';
        this.priority = Math.max(...rules.map(r => r.priority));
        this.enabled = true;
    }

    canApply(task, context) {
        if (!this.enabled) return false;

        return this.rules.some(rule => rule.canApply(task, context));
    }

    async apply(task, context) {
        if (!this.enabled) {
            return {results: [], rule: this};
        }

        for (const rule of this.rules) {
            if (rule.canApply(task, context)) {
                try {
                    const result = await rule.apply(task, context);
                    if (result.results.length > 0) {
                        return {results: result.results, rule: result.rule};
                    }
                } catch (error) {
                    this.logger?.warn(`Fallback rule ${rule.id} failed, trying next:`, error);
                }
            }
        }

        return {results: [], rule: this};
    }

    enable() {
        this.enabled = true;
        return this;
    }

    disable() {
        this.enabled = false;
        return this;
    }
}