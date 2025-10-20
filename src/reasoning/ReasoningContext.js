/**
 * Abstract base class for all reasoning contexts
 * Provides a unified interface for context management across different reasoning strategies
 */
export class ReasoningContext {
    constructor(config = {}) {
        this._config = {
            memory: null,
            focus: null,
            ruleEngine: null,
            termFactory: null,
            taskManager: null,
            timestamp: Date.now(),
            reasoningDepth: 0,
            maxDepth: config.maxDepth || 10,
            ...config
        };

        // Additional context properties
        this._properties = new Map();
        this._history = [];
        this._metrics = {
            tasksProcessed: 0,
            rulesApplied: 0,
            inferencesMade: 0,
            startTime: Date.now()
        };
    }

    get config() {
        return this._config;
    }

    get memory() {
        return this._config.memory;
    }

    get focus() {
        return this._config.focus;
    }

    get ruleEngine() {
        return this._config.ruleEngine;
    }

    get termFactory() {
        return this._config.termFactory;
    }

    get taskManager() {
        return this._config.taskManager;
    }

    get reasoningDepth() {
        return this._config.reasoningDepth;
    }

    set reasoningDepth(depth) {
        this._config.reasoningDepth = Math.min(depth, this._config.maxDepth);
    }

    /**
     * Add a property to the context
     */
    setProperty(key, value) {
        this._properties.set(key, value);
        return this;
    }

    /**
     * Get a property from the context
     */
    getProperty(key, defaultValue = undefined) {
        return this._properties.has(key) ? this._properties.get(key) : defaultValue;
    }

    /**
     * Remove a property from the context
     */
    removeProperty(key) {
        return this._properties.delete(key);
    }

    /**
     * Add an entry to the reasoning history
     */
    addToHistory(entry) {
        this._history.push({
            ...entry,
            timestamp: Date.now()
        });
        
        // Limit history size to prevent memory issues
        if (this._history.length > 100) {
            this._history = this._history.slice(-50); // Keep the most recent 50 entries
        }
        
        return this;
    }

    /**
     * Get the reasoning history
     */
    getHistory() {
        return [...this._history];
    }

    /**
     * Get recent history entries
     */
    getRecentHistory(count = 10) {
        return this._history.slice(-count);
    }

    /**
     * Increment a metric
     */
    incrementMetric(metricName, amount = 1) {
        if (this._metrics.hasOwnProperty(metricName)) {
            this._metrics[metricName] += amount;
        }
        return this;
    }

    /**
     * Get current metrics
     */
    getMetrics() {
        return {
            ...this._metrics,
            reasoningDepth: this._config.reasoningDepth,
            uptime: Date.now() - this._metrics.startTime,
            historySize: this._history.length
        };
    }

    /**
     * Check if we've reached the maximum reasoning depth
     */
    isAtMaxDepth() {
        return this._config.reasoningDepth >= this._config.maxDepth;
    }

    /**
     * Advance to next reasoning level
     */
    advanceDepth() {
        if (!this.isAtMaxDepth()) {
            this._config.reasoningDepth++;
            return true;
        }
        return false;
    }

    /**
     * Create a child context with additional properties
     */
    createChildContext(additionalConfig = {}) {
        const childConfig = {
            ...this._config,
            ...additionalConfig,
            reasoningDepth: this._config.reasoningDepth + 1
        };

        const childContext = new ReasoningContext(childConfig);
        
        // Copy properties and history to child
        for (const [key, value] of this._properties.entries()) {
            childContext.setProperty(key, value);
        }
        
        childContext._history = [...this._history]; // Share history by reference
        
        return childContext;
    }

    /**
     * Create a context from an existing task and memory state
     */
    static fromTaskAndMemory(task, memory, config = {}) {
        return new ReasoningContext({
            memory,
            task,
            timestamp: Date.now(),
            ...config
        });
    }

    /**
     * Serialize context for debugging or logging
     */
    toJSON() {
        return {
            config: {
                ...this._config,
                memory: this._config.memory ? '[Memory Object]' : null,
                focus: this._config.focus ? '[Focus Object]' : null,
                ruleEngine: this._config.ruleEngine ? '[RuleEngine Object]' : null,
                termFactory: this._config.termFactory ? '[TermFactory Object]' : null
            },
            properties: Object.fromEntries(this._properties),
            historyCount: this._history.length,
            metrics: this.getMetrics()
        };
    }
}