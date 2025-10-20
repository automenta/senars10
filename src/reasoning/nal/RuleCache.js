import {Logger} from '../../util/Logger.js';

/**
 * RuleCache - Implements caching strategies for rule applications to improve performance
 */
export class RuleCache {
    constructor(capacity = 1000) {
        this.capacity = capacity;
        this.cache = new Map(); // key: ruleId + input signature, value: result
        this.accessTimes = new Map(); // key: cache key, value: timestamp
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
        this.logger = Logger;
    }

    /**
     * Creates a unique key for caching based on rule and inputs
     */
    _createKey(ruleId, task, context = {}) {
        // Create a hash-like key from the ruleId, task term, and context
        const taskKey = `${task.term?.id || task.term?.toString?.() || 'unknown'}_${task.type}_${task.truth?.f || '0'}_${task.truth?.c || '0'}`;
        const contextKey = JSON.stringify(context).substring(0, 100); // Limit context length
        return `${ruleId}:${taskKey}:${contextKey}`;
    }

    /**
     * Retrieves cached result if available
     */
    get(ruleId, task, context = {}) {
        const key = this._createKey(ruleId, task, context);
        const result = this.cache.get(key);

        if (result !== undefined) {
            this.stats.hits++;
            this.accessTimes.set(key, Date.now()); // Update access time
            this.logger.debug(`RuleCache HIT for ${ruleId}`);
            return result;
        }

        this.stats.misses++;
        this.logger.debug(`RuleCache MISS for ${ruleId}`);
        return null;
    }

    /**
     * Stores result in cache
     */
    set(ruleId, task, result, context = {}) {
        const key = this._createKey(ruleId, task, context);

        // Evict if necessary
        if (this.cache.size >= this.capacity) {
            this._evictLRU();
        }

        this.cache.set(key, result);
        this.accessTimes.set(key, Date.now());
    }

    /**
     * Evicts the least recently used item
     */
    _evictLRU() {
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, time] of this.accessTimes.entries()) {
            if (time < oldestTime) {
                oldestTime = time;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.accessTimes.delete(oldestKey);
            this.stats.evictions++;
            this.logger.debug(`RuleCache EVICTED oldest entry`);
        }
    }

    /**
     * Clears the cache
     */
    clear() {
        this.cache.clear();
        this.accessTimes.clear();
        this.stats = {hits: 0, misses: 0, evictions: 0};
    }

    /**
     * Gets cache statistics
     */
    getStats() {
        const totalRequests = this.stats.hits + this.stats.misses;
        const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

        return {
            ...this.stats,
            hitRate,
            size: this.cache.size,
            capacity: this.capacity,
            utilization: this.cache.size / this.capacity
        };
    }
}