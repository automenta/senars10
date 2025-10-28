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

        // Add to category and groups
        this._addToCategory(rule.id, category);
        this._addToGroups(rule.id, groups);

        // Initialize performance metrics
        this._initializeMetrics(rule.id);

        // Enable the rule by default
        this._enabledRules.add(rule.id);

        return this;
    }

    _addToCategory(ruleId, category) {
        const categorySet = this._categories.get(category) || new Set();
        categorySet.add(ruleId);
        this._categories.set(category, categorySet);
    }

    _addToGroups(ruleId, groups) {
        for (const group of groups) {
            const groupSet = this._ruleGroups.get(group) || new Set();
            groupSet.add(ruleId);
            this._ruleGroups.set(group, groupSet);
        }
    }

    _initializeMetrics(ruleId) {
        this._performanceMetrics.set(ruleId, {
            applications: 0,
            successes: 0,
            failures: 0,
            avgTime: 0,
            lastApplied: null
        });
    }

    unregister(ruleId) {
        if (!this._rules.has(ruleId)) return false;

        // Remove from all collections
        this._removeFromCollections(ruleId);
        return true;
    }

    _removeFromCollections(ruleId) {
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
    }

    enable(ruleId) {
        if (this._rules.has(ruleId)) {
            this._enabledRules.add(ruleId);
            this._updateRuleInstance(ruleId, 'enable');
        }
        return this;
    }

    disable(ruleId) {
        if (this._rules.has(ruleId)) {
            this._enabledRules.delete(ruleId);
            this._updateRuleInstance(ruleId, 'disable');
        }
        return this;
    }

    _updateRuleInstance(ruleId, operation) {
        const rule = this._rules.get(ruleId);
        if (rule[operation]) {
            this._rules.set(ruleId, rule[operation]());
        }
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
            .filter(Boolean);
    }

    getByCategory(category) {
        const ruleIds = this._categories.get(category);
        if (!ruleIds) return [];

        return Array.from(ruleIds)
            .map(id => this._rules.get(id))
            .filter(Boolean);
    }

    getByGroup(group) {
        const ruleIds = this._ruleGroups.get(group);
        if (!ruleIds) return [];

        return Array.from(ruleIds)
            .map(id => this._rules.get(id))
            .filter(Boolean);
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
            metrics[success ? 'successes' : 'failures']++;

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

        // Calculate overall performance
        let totalApplications = 0;
        let totalSuccesses = 0;
        let totalFailures = 0;
        let totalAvgTime = 0;
        let completedMetrics = 0;

        for (const metrics of this._performanceMetrics.values()) {
            totalApplications += metrics.applications;
            totalSuccesses += metrics.successes;
            totalFailures += metrics.failures;

            if (metrics.applications > 0) {
                totalAvgTime += metrics.avgTime;
                completedMetrics++;
            }
        }

        const avgTime = completedMetrics > 0 ? totalAvgTime / completedMetrics : 0;

        return {
            totalRules,
            enabledCount,
            disabledCount: totalRules - enabledCount,
            categories: Array.from(this._categories.keys()),
            groups: Array.from(this._ruleGroups.keys()),
            performance: {
                totalApplications,
                totalSuccesses,
                totalFailures,
                avgTime
            }
        };
    }

    async applyAllRules(task, context = {}) {
        const enabledRules = this.getEnabled();
        const sortedRules = sortByProperty(enabledRules, 'priority', true);

        const results = [];
        for (const rule of sortedRules) {
            if (rule.canApply && rule.canApply(task, context)) {
                const ruleResult = await this._applySingleRule(rule, task, context);
                results.push(...ruleResult);
            }
        }

        return results;
    }

    async _applySingleRule(rule, task, context) {
        const start = performance.now();
        try {
            const {results: ruleResults, rule: updatedRule} = await rule.apply(task, context);

            // Update metrics and rule instance if changed
            this.updateMetrics(rule.id, true, performance.now() - start);
            if (updatedRule && updatedRule !== rule) {
                this._rules.set(rule.id, updatedRule);
            }

            return ruleResults;
        } catch (error) {
            this.updateMetrics(rule.id, false, performance.now() - start);
            this.logger?.error(`Rule ${rule.id} failed:`, error);
            return [];
        }
    }
}