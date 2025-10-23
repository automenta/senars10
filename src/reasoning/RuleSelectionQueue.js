/**
 * Performance-based Priority Queue for Rule Selection (Winnowing)
 * Implements a priority queue that selects rules based on performance metrics
 */
export class RuleSelectionQueue {
    constructor(options = {}) {
        this.options = {
            capacity: options.capacity || 1000,
            performanceWeight: options.performanceWeight || 0.7,
            priorityWeight: options.priorityWeight || 0.3,
            enableAdaptiveWeights: options.enableAdaptiveWeights !== false
        };

        // Store rules with their performance metrics
        this.ruleIndex = new Map(); // ruleId -> index in rules array
        this.rules = []; // Array of rule objects
        this.ruleMetrics = new Map(); // ruleId -> metrics object

        // Statistics
        this.stats = {
            totalApplications: 0,
            successfulApplications: 0,
            avgExecutionTime: 0
        };
    }

    /**
     * Add a rule to the queue
     */
    addRule(rule, priority = 1.0) {
        const ruleId = rule.id || rule.constructor.name;

        // Initialize metrics if not exists
        if (!this.ruleMetrics.has(ruleId)) {
            this.ruleMetrics.set(ruleId, {
                id: ruleId,
                successCount: 0,
                failureCount: 0,
                totalExecutionTime: 0,
                callCount: 0,
                avgExecutionTime: 0,
                successRate: 0,
                basePriority: priority,
                dynamicPriority: priority,
                lastUsed: Date.now()
            });
        }

        // Add rule if not already in the queue
        if (!this.ruleIndex.has(ruleId)) {
            const index = this.rules.length;
            this.rules.push({
                rule,
                id: ruleId,
                basePriority: priority,
                dynamicPriority: priority
            });
            this.ruleIndex.set(ruleId, index); // Track index for O(1) lookup
        }

        return this;
    }

    /**
     * Update rule metrics after application
     */
    updateRuleMetrics(ruleId, success, executionTime) {
        const metrics = this.ruleMetrics.get(ruleId);
        if (!metrics) return;

        metrics.callCount++;
        metrics.totalExecutionTime += executionTime;
        metrics.avgExecutionTime = metrics.totalExecutionTime / metrics.callCount;

        if (success) {
            metrics.successCount++;
        } else {
            metrics.failureCount++;
        }

        metrics.successRate = metrics.successCount / metrics.callCount;

        // Update dynamic priority based on performance
        this._updateDynamicPriority(metrics);

        // Update statistics
        this.stats.totalApplications++;
        if (success) {
            this.stats.successfulApplications++;
        }
        this.stats.avgExecutionTime =
            (this.stats.avgExecutionTime * (this.stats.totalApplications - 1) + executionTime) /
            this.stats.totalApplications;

        // Update the rule's dynamic priority in the queue
        const index = this.ruleIndex.get(ruleId);
        if (index !== undefined && index < this.rules.length) {
            this.rules[index].dynamicPriority = metrics.dynamicPriority;
        }
    }

    /**
     * Update the dynamic priority of a rule based on its metrics
     */
    _updateDynamicPriority(metrics) {
        // Performance score: combination of success rate and efficiency
        const successRate = metrics.successRate;
        const efficiency = 1 / (metrics.avgExecutionTime + 1); // Inverse of execution time, +1 to avoid division by zero
        const performanceScore = (successRate * 0.7) + (efficiency * 0.3);

        // Calculate dynamic priority using configured weights
        const dynamicPriority =
            (performanceScore * this.options.performanceWeight) +
            (metrics.basePriority * this.options.priorityWeight);

        metrics.dynamicPriority = dynamicPriority;
    }

    /**
     * Select the next rule to apply based on priority
     */
    selectNextRule(context = null) {
        if (this.rules.length === 0) {
            return null;
        }

        // Update all dynamic priorities before selection
        for (const rule of this.rules) {
            const metrics = this.ruleMetrics.get(rule.id);
            if (metrics) {
                this._updateDynamicPriority(metrics);
                rule.dynamicPriority = metrics.dynamicPriority;
            }
        }

        // Find rule with highest priority without sorting the entire array
        let highestPriorityRule = null;
        let highestPriority = -Infinity;

        for (const rule of this.rules) {
            if (rule.dynamicPriority > highestPriority) {
                highestPriority = rule.dynamicPriority;
                highestPriorityRule = rule;
            }
        }

        return highestPriorityRule;
    }

    /**
     * Get top N rules for consideration
     */
    getTopNRules(n = 1, context = null) {
        if (this.rules.length === 0) {
            return [];
        }

        // Update all dynamic priorities
        for (const rule of this.rules) {
            const metrics = this.ruleMetrics.get(rule.id);
            if (metrics) {
                this._updateDynamicPriority(metrics);
                rule.dynamicPriority = metrics.dynamicPriority;
            }
        }

        // Sort and return top N
        const sortedRules = [...this.rules].sort((a, b) => b.dynamicPriority - a.dynamicPriority);
        return sortedRules.slice(0, Math.min(n, sortedRules.length));
    }

    /**
     * Get rule metrics for a specific rule
     */
    getRuleMetrics(ruleId) {
        return this.ruleMetrics.get(ruleId) || null;
    }

    /**
     * Get all rule metrics
     */
    getAllMetrics() {
        return Array.from(this.ruleMetrics.values());
    }

    /**
     * Get overall statistics
     */
    getStats() {
        const successRate = this.stats.totalApplications > 0 ?
            this.stats.successfulApplications / this.stats.totalApplications : 0;

        return {
            ...this.stats,
            successRate,
            totalRules: this.rules.length
        };
    }

    /**
     * Remove a rule from the queue
     */
    removeRule(ruleId) {
        const index = this.ruleIndex.get(ruleId);
        if (index === undefined) return this;

        // Remove from rules array by swapping with last element (if not the last)
        const lastRule = this.rules[this.rules.length - 1];
        this.rules[index] = lastRule;
        this.ruleIndex.set(lastRule.id, index); // Update index of moved rule

        this.rules.pop(); // Remove last element
        this.ruleIndex.delete(ruleId); // Remove from index map
        this.ruleMetrics.delete(ruleId); // Remove metrics

        return this;
    }

    /**
     * Clear the queue
     */
    clear() {
        this.rules = [];
        this.ruleIndex.clear();
        this.ruleMetrics.clear();
        this.stats = {
            totalApplications: 0,
            successfulApplications: 0,
            avgExecutionTime: 0
        };
        return this;
    }

    /**
     * Get the number of rules in the queue
     */
    size() {
        return this.rules.length;
    }
}

/**
 * Enhanced version with adaptive weight adjustment
 */
export class AdaptiveRuleSelectionQueue extends RuleSelectionQueue {
    constructor(options = {}) {
        super({
            ...options,
            enableAdaptiveWeights: true
        });

        this.performanceHistory = [];
        this.weightAdjustmentThreshold = options.weightAdjustmentThreshold || 100; // Adjust every 100 applications
    }

    /**
     * Update rule metrics and potentially adjust weights
     */
    updateRuleMetrics(ruleId, success, executionTime) {
        super.updateRuleMetrics(ruleId, success, executionTime);

        // Record performance for adaptive adjustment
        this.performanceHistory.push({
            success,
            executionTime,
            timestamp: Date.now()
        });

        // If we have enough data, adjust weights
        if (this.performanceHistory.length >= this.weightAdjustmentThreshold) {
            this._adjustWeights();
            // Keep only recent history
            this.performanceHistory = this.performanceHistory.slice(-this.weightAdjustmentThreshold);
        }
    }

    /**
     * Adjust weights based on recent performance
     */
    _adjustWeights() {
        if (this.performanceHistory.length === 0) return;

        const recentSuccessRate = this.performanceHistory.filter(h => h.success).length /
            this.performanceHistory.length;

        // If recent success rate is low, increase performance weight
        if (recentSuccessRate < 0.5) {
            this.options.performanceWeight = Math.min(0.9, this.options.performanceWeight + 0.05);
            this.options.priorityWeight = 1 - this.options.performanceWeight;
        }
        // If recent success rate is high, balance weights or reduce performance weight
        else if (recentSuccessRate > 0.8) {
            this.options.performanceWeight = Math.max(0.5, this.options.performanceWeight - 0.02);
            this.options.priorityWeight = 1 - this.options.performanceWeight;
        }
    }
}