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
            maxBatchSize: config.maxBatchSize || 50,
            enableProfiling: config.enableProfiling !== false,
            ...config
        };

        this.ruleCache = this.config.enableCaching ? new RuleCache(config.cache || {}) : null;
        this.profiles = new Map(); // Performance profiles by rule ID
    }

    /**
     * Optimize rule application with caching
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
            hasProfiling: this.config.enableProfiling,
            hasCaching: this.config.enableCaching,
            hasBatching: this.config.enableBatching
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