/**
 * RuleIndex: Indexes rules by their matching patterns for faster lookup
 */
export class RuleIndex {
    constructor() {
        this._operatorIndex = new Map(); // Index by term operators
        this._categoryIndex = new Map(); // Index by rule category
        this._complexityIndex = new Map(); // Index by term complexity
        this._lastAccess = new Map(); // Track when rules were last accessed
    }

    /**
     * Index a rule based on its characteristics
     */
    indexRule(rule) {
        // Add to category index
        const category = rule.category || 'general';
        if (!this._categoryIndex.has(category)) {
            this._categoryIndex.set(category, []);
        }
        this._categoryIndex.get(category).push(rule);

        // Index by expected operators if available
        if (rule._matches && typeof rule._matches === 'function') {
            // Try to infer patterns - for now, we'll use a simple approach
            this._tryInferPatterns(rule);
        }
    }

    /**
     * Infer patterns based on rule matching logic
     */
    _tryInferPatterns(rule) {
        // For common NAL rule types, we can infer their patterns
        const ruleName = rule.constructor.name.toLowerCase();
        
        if (ruleName.includes('deduction')) {
            // Deduction rules typically match --> and specific patterns
            this._addOperatorRule('-->', rule);
            this._addOperatorRule('==>', rule);
        } else if (ruleName.includes('induction')) {
            this._addOperatorRule('-->', rule);
        } else if (ruleName.includes('abduction')) {
            this._addOperatorRule('-->', rule);
        } else if (ruleName.includes('equivalence')) {
            this._addOperatorRule('<=>', rule);
        } else if (ruleName.includes('implication')) {
            this._addOperatorRule('==>', rule);
        } else if (ruleName.includes('conjunction')) {
            this._addOperatorRule('&', rule);
        } else if (ruleName.includes('disjunction')) {
            this._addOperatorRule('|', rule);
        } else if (ruleName.includes('conversion')) {
            this._addOperatorRule('-->', rule);
        }
    }

    /**
     * Helper to add a rule to operator index
     */
    _addOperatorRule(operator, rule) {
        if (!this._operatorIndex.has(operator)) {
            this._operatorIndex.set(operator, []);
        }
        this._operatorIndex.get(operator).push(rule);
    }

    /**
     * Get candidate rules for a task based on indexing
     */
    getCandidates(task) {
        const candidates = new Set();
        const now = Date.now();

        // Get candidates by term operator
        if (task.term?.operator) {
            const opRules = this._operatorIndex.get(task.term.operator);
            if (opRules) {
                opRules.forEach(rule => {
                    candidates.add(rule);
                    this._lastAccess.set(rule.id, now); // Update access time
                });
            }
        }

        // Get candidates by general term structure
        const termType = task.term?.isCompound ? 'compound' : 'atomic';
        const categoryRules = this._categoryIndex.get(termType) || [];
        categoryRules.forEach(rule => {
            candidates.add(rule);
            this._lastAccess.set(rule.id, now);
        });

        // If term is compound, check for specific compound categories
        if (task.term?.isCompound) {
            const compoundRules = this._categoryIndex.get('compound') || [];
            compoundRules.forEach(rule => {
                candidates.add(rule);
                this._lastAccess.set(rule.id, now);
            });
        }

        return Array.from(candidates);
    }

    /**
     * Clear the index
     */
    clear() {
        this._operatorIndex.clear();
        this._categoryIndex.clear();
        this._complexityIndex.clear();
        this._lastAccess.clear();
    }
}

/**
 * RuleCache: Caches rule application results for improved performance
 */
export class RuleCache {
    constructor(config = {}) {
        this.config = {
            maxSize: config.maxSize || 1000,
            ttl: config.ttl || 300000, // 5 minutes default
            enabled: config.enabled !== false,
            ...config
        };

        this._cache = new Map(); // Map of cacheKey -> { result, timestamp, ttl }
        this._stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
    }

    /**
     * Generate a cache key for a rule application
     */
    _generateKey(ruleId, task, memoryState) {
        // Create a stable key based on rule ID and task properties
        const taskKey = task.term ? task.term.toString() : JSON.stringify(task);
        const memoryKey = memoryState ? JSON.stringify(memoryState) : '';
        return `${ruleId}:${taskKey}:${memoryKey}`;
    }

    /**
     * Get cached result if available
     */
    get(ruleId, task, memoryState) {
        if (!this.config.enabled) return null;

        const key = this._generateKey(ruleId, task, memoryState);
        const cached = this._cache.get(key);

        if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
            this._stats.hits++;
            return cached.result;
        }

        if (cached) {
            // TTL expired
            this._cache.delete(key);
            this._stats.evictions++;
        }

        this._stats.misses++;
        return null;
    }

    /**
     * Set a result in the cache
     */
    set(ruleId, task, memoryState, result) {
        if (!this.config.enabled) return;

        const key = this._generateKey(ruleId, task, memoryState);

        // Evict oldest entries if cache is full
        if (this._cache.size >= this.config.maxSize) {
            const firstKey = this._cache.keys().next().value;
            if (firstKey) {
                this._cache.delete(firstKey);
                this._stats.evictions++;
            }
        }

        this._cache.set(key, {
            result,
            timestamp: Date.now(),
            ttl: this.config.ttl
        });
    }

    /**
     * Clear the cache
     */
    clear() {
        this._cache.clear();
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const hitRate = (this._stats.hits / (this._stats.hits + this._stats.misses)) || 0;
        return {
            ...this._stats,
            hitRate,
            size: this._cache.size,
            maxSize: this.config.maxSize,
            enabled: this.config.enabled
        };
    }

    /**
     * Clean expired entries
     */
    cleanExpired() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this._cache.entries()) {
            if ((now - entry.timestamp) >= entry.ttl) {
                this._cache.delete(key);
                cleaned++;
                this._stats.evictions++;
            }
        }

        return cleaned;
    }
}

/**
 * PerformanceOptimizer: Manages performance optimization for rule processing
 */
export class PerformanceOptimizer {
    constructor(config = {}) {
        this.config = {
            enableCaching: config.enableCaching !== false,
            enableBatching: config.enableBatching !== false,
            enableIndexing: config.enableIndexing !== false,
            enablePrioritization: config.enablePrioritization !== false,
            maxBatchSize: config.maxBatchSize || 50,
            enableProfiling: config.enableProfiling !== false,
            ...config
        };

        this.ruleCache = this.config.enableCaching ? new RuleCache(config.cache || {}) : null;
        this.ruleIndex = this.config.enableIndexing ? new RuleIndex() : null;
        this.profiles = new Map(); // Performance profiles by rule ID
        this._rulePriorities = new Map(); // Dynamic rule priorities based on effectiveness
    }

    /**
     * Index a rule if indexing is enabled
     */
    indexRule(rule) {
        if (this.ruleIndex) {
            this.ruleIndex.indexRule(rule);
        }
    }

    /**
     * Get candidate rules for a task using indexing (if enabled)
     */
    getCandidateRules(task, allRules) {
        if (this.ruleIndex) {
            return this.ruleIndex.getCandidates(task);
        }
        return allRules; // Fall back to all rules if indexing disabled
    }

    /**
     * Optimize rule application with caching and indexing
     */
    async applyRuleWithOptimization(rule, task, context) {
        if (!this.config.enableCaching || !this.ruleCache) {
            // Apply rule directly without caching
            return await rule.apply(task, context);
        }

        // Try to get result from cache first
        const memoryState = context && context.memory ? this._getMemoryState(context.memory) : null;
        const cachedResult = this.ruleCache.get(rule.id, task, memoryState);

        if (cachedResult !== null) {
            return cachedResult;
        }

        // Apply rule and cache the result
        const startTime = performance.now();
        const result = await rule.apply(task, context);
        const duration = performance.now() - startTime;

        // Store profiling information
        if (this.config.enableProfiling) {
            this._recordProfile(rule.id, duration, result.results.length);
        }

        this.ruleCache.set(rule.id, task, memoryState, result);
        return result;
    }

    /**
     * Apply multiple rules with optimization, including prioritization
     */
    async applyRulesWithOptimization(rules, task, context) {
        let applicableRules = rules.filter(rule => rule.canApply && rule.canApply(task));
        
        // Apply prioritization if enabled
        if (this.config.enablePrioritization) {
            applicableRules = this._prioritizeRules(applicableRules);
        }

        const results = [];
        for (const rule of applicableRules) {
            try {
                const ruleResult = await this.applyRuleWithOptimization(rule, task, context);
                results.push(...ruleResult.results);
            } catch (error) {
                this.logger?.warn(`Optimized rule ${rule.id} failed:`, error);
            }
        }

        return results;
    }

    /**
     * Prioritize rules based on their effectiveness and other factors
     */
    _prioritizeRules(rules) {
        return rules.sort((a, b) => {
            // Get stored priority for each rule (default to base priority)
            const priorityA = this._rulePriorities.get(a.id) ?? a.priority;
            const priorityB = this._rulePriorities.get(b.id) ?? b.priority;
            
            // Sort by priority (higher first)
            return priorityB - priorityA;
        });
    }

    /**
     * Update a rule's priority based on its effectiveness
     */
    updateRuleEffectiveness(ruleId, success, resultCount) {
        if (!this.config.enablePrioritization) return;

        let currentStats = this._rulePriorities.get(ruleId) || { 
            totalApplications: 0, 
            successfulApplications: 0,
            avgResultCount: 0
        };

        currentStats.totalApplications++;
        if (success) currentStats.successfulApplications++;
        currentStats.avgResultCount = (currentStats.avgResultCount * (currentStats.totalApplications - 1) + resultCount) / currentStats.totalApplications;

        // Calculate a composite effectiveness score
        const successRate = currentStats.successfulApplications / currentStats.totalApplications;
        const effectiveness = successRate * Math.max(1, currentStats.avgResultCount);

        this._rulePriorities.set(ruleId, effectiveness);
    }

    /**
     * Get a snapshot of memory state for caching purposes
     */
    _getMemoryState(memory) {
        if (!memory || typeof memory.getSnapshot !== 'function') {
            return null;
        }
        return memory.getSnapshot ? memory.getSnapshot() : JSON.stringify(memory);
    }

    /**
     * Record performance profile for a rule
     */
    _recordProfile(ruleId, duration, resultCount) {
        if (!this.profiles.has(ruleId)) {
            this.profiles.set(ruleId, {
                callCount: 0,
                totalDuration: 0,
                avgDuration: 0,
                totalResults: 0,
                avgResults: 0,
                lastCall: Date.now()
            });
        }

        const profile = this.profiles.get(ruleId);
        profile.callCount++;
        profile.totalDuration += duration;
        profile.avgDuration = profile.totalDuration / profile.callCount;
        profile.totalResults += resultCount;
        profile.avgResults = profile.totalResults / profile.callCount;
        profile.lastCall = Date.now();
    }

    /**
     * Batch process rules for better performance
     */
    async batchProcess(rules, tasks, context, processFunction) {
        if (!this.config.enableBatching || tasks.length <= this.config.maxBatchSize) {
            // Process directly if batching is disabled or batch is small
            return await processFunction(rules, tasks, context);
        }

        // Split into batches and process each batch
        const allResults = [];
        const taskBatches = this._createBatches(tasks, this.config.maxBatchSize);

        for (const taskBatch of taskBatches) {
            const batchResults = await processFunction(rules, taskBatch, context);
            allResults.push(...batchResults);
        }

        return allResults;
    }

    /**
     * Create batches of items
     */
    _createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Get performance statistics
     */
    getStats() {
        return {
            cacheStats: this.ruleCache ? this.ruleCache.getStats() : null,
            profileCount: this.profiles.size,
            indexedRules: this.ruleIndex ? 
                Array.from(this.ruleIndex._categoryIndex.values()).flat().length : 0,
            hasProfiling: this.config.enableProfiling,
            hasCaching: this.config.enableCaching,
            hasIndexing: this.config.enableIndexing,
            hasBatching: this.config.enableBatching,
            hasPrioritization: this.config.enablePrioritization
        };
    }

    /**
     * Get detailed profile for specific rule
     */
    getRuleProfile(ruleId) {
        return this.profiles.get(ruleId) || null;
    }

    /**
     * Get all rule profiles
     */
    getAllProfiles() {
        return Object.fromEntries(this.profiles);
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        if (this.ruleCache) {
            this.ruleCache.clear();
        }
        if (this.ruleIndex) {
            this.ruleIndex.clear();
        }
        this.profiles.clear();
    }

    /**
     * Clean expired cache entries
     */
    cleanExpired() {
        if (this.ruleCache) {
            this.ruleCache.cleanExpired();
        }
    }
}