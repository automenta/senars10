import {sortByProperty} from '../../util/collections.js';

export class RuleManager {
    constructor() {
        this._rules = new Map(); // Map of rule ID to rule instance
        this._categories = new Map(); // Map of category to rule IDs
        this._enabledRules = new Set(); // Set of enabled rule IDs
        this._performanceMetrics = new Map(); // Performance metrics by rule
        this._validationRules = new Map(); // Validation functions by rule ID
        this._ruleGroups = new Map(); // Grouping of related rules
    }

    register(rule, category = 'general', groups = []) {
        if (!rule || !rule.id) throw new Error('Rule must have an ID');

        // Store the rule
        this._rules.set(rule.id, rule);

        // Add to category
        const categorySet = this._categories.get(category) || new Set();
        categorySet.add(rule.id);
        this._categories.set(category, categorySet);

        // Add to groups
        for (const group of groups) {
            const groupSet = this._ruleGroups.get(group) || new Set();
            groupSet.add(rule.id);
            this._ruleGroups.set(group, groupSet);
        }

        // Initialize performance metrics
        this._performanceMetrics.set(rule.id, {
            applications: 0,
            successes: 0,
            failures: 0,
            avgTime: 0,
            lastApplied: null
        });

        // Enable the rule by default
        this._enabledRules.add(rule.id);

        return this;
    }

    unregister(ruleId) {
        if (!this._rules.has(ruleId)) return false;

        const rule = this._rules.get(ruleId);

        // Remove from all collections
        this._rules.delete(ruleId);
        this._enabledRules.delete(ruleId);
        this._performanceMetrics.delete(ruleId);
        this._validationRules.delete(ruleId);

        // Remove from categories
        for (const [category, ruleIds] of this._categories.entries()) {
            ruleIds.delete(ruleId);
            if (ruleIds.size === 0) this._categories.delete(category);
        }

        // Remove from groups
        for (const [group, ruleIds] of this._ruleGroups.entries()) {
            ruleIds.delete(ruleId);
            if (ruleIds.size === 0) this._ruleGroups.delete(group);
        }

        return true;
    }

    enable(ruleId) {
        if (this._rules.has(ruleId)) {
            this._enabledRules.add(ruleId);
            const rule = this._rules.get(ruleId);
            if (rule.enable) this._rules.set(ruleId, rule.enable());
        }
        return this;
    }

    disable(ruleId) {
        if (this._rules.has(ruleId)) {
            this._enabledRules.delete(ruleId);
            const rule = this._rules.get(ruleId);
            if (rule.disable) this._rules.set(ruleId, rule.disable());
        }
        return this;
    }

    enableCategory(category) {
        const ruleIds = this._categories.get(category);
        if (ruleIds) for (const ruleId of ruleIds) this.enable(ruleId);
        return this;
    }

    disableCategory(category) {
        const ruleIds = this._categories.get(category);
        if (ruleIds) for (const ruleId of ruleIds) this.disable(ruleId);
        return this;
    }

    enableGroup(group) {
        const ruleIds = this._ruleGroups.get(group);
        if (ruleIds) for (const ruleId of ruleIds) this.enable(ruleId);
        return this;
    }

    disableGroup(group) {
        const ruleIds = this._ruleGroups.get(group);
        if (ruleIds) for (const ruleId of ruleIds) this.disable(ruleId);
        return this;
    }

    get(ruleId) {
        return this._rules.get(ruleId) || null;
    }

    getAll() {
        return Array.from(this._rules.values());
    }

    getEnabled() {
        return Array.from(this._enabledRules)
            .map(id => this._rules.get(id))
            .filter(rule => rule !== undefined);
    }

    getByCategory(category) {
        const ruleIds = this._categories.get(category);
        if (!ruleIds) return [];

        return Array.from(ruleIds)
            .map(id => this._rules.get(id))
            .filter(rule => rule !== undefined);
    }

    getByGroup(group) {
        const ruleIds = this._ruleGroups.get(group);
        if (!ruleIds) return [];

        return Array.from(ruleIds)
            .map(id => this._rules.get(id))
            .filter(rule => rule !== undefined);
    }

    addValidator(ruleId, validator) {
        if (this._rules.has(ruleId)) this._validationRules.set(ruleId, validator);
        return this;
    }

    validate(ruleId, context) {
        const validator = this._validationRules.get(ruleId);
        return validator ? validator(context) : true; // Default: pass validation if no validator
    }

    updateMetrics(ruleId, success, executionTime) {
        const metrics = this._performanceMetrics.get(ruleId);
        if (metrics) {
            metrics.applications++;
            if (success) metrics.successes++;
            else metrics.failures++;

            // Update average time
            metrics.avgTime = (metrics.avgTime * (metrics.applications - 1) + executionTime) / metrics.applications;
            metrics.lastApplied = Date.now();
        }
    }

    getMetrics(ruleId) {
        return this._performanceMetrics.get(ruleId) || null;
    }

    getAggregatedMetrics() {
        const totalRules = this._rules.size;
        const enabledCount = this._enabledRules.size;
        const categories = Array.from(this._categories.keys());
        const groups = Array.from(this._ruleGroups.keys());

        // Calculate overall performance
        let totalApplications = 0;
        let totalSuccesses = 0;
        let totalFailures = 0;
        let avgTime = 0;
        let completedMetrics = 0;

        for (const [ruleId, metrics] of this._performanceMetrics.entries()) {
            totalApplications += metrics.applications;
            totalSuccesses += metrics.successes;
            totalFailures += metrics.failures;

            if (metrics.applications > 0) {
                avgTime += metrics.avgTime;
                completedMetrics++;
            }
        }

        if (completedMetrics > 0) avgTime = avgTime / completedMetrics;

        return {
            totalRules,
            enabledCount,
            disabledCount: totalRules - enabledCount,
            categories,
            groups,
            performance: {
                totalApplications,
                totalSuccesses,
                totalFailures,
                avgTime
            }
        };
    }

    async applyAllRules(task, context = {}) {
        const results = [];
        const enabledRules = this.getEnabled();

        // Sort rules by priority
        const sortedRules = sortByProperty(enabledRules, 'priority', true);

        for (const rule of sortedRules) {
            if (rule.canApply && rule.canApply(task, context)) {
                try {
                    const start = performance.now();
                    const {results: ruleResults, rule: updatedRule} = await rule.apply(task, context);

                    // Update metrics
                    this.updateMetrics(rule.id, true, performance.now() - start);

                    // Update the rule in the registry if it changed
                    if (updatedRule && updatedRule !== rule) this._rules.set(rule.id, updatedRule);

                    results.push(...ruleResults);
                } catch (error) {
                    // Update failure metrics
                    this.updateMetrics(rule.id, false, performance.now() - start);
                    console.error(`Rule ${rule.id} failed:`, error);
                }
            }
        }

        return results;
    }
}