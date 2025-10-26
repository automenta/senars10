/**
 * Enhanced ReasoningContext with sophisticated reasoning capabilities
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
            reasoningPath: [], // Track the path of reasoning for debugging
            goalStack: [], // Track active goals for goal-oriented reasoning
            beliefStack: [], // Track active beliefs for consistency checking
            attentionFocus: null, // Current focus of attention
            attentionSpan: config.attentionSpan || 5, // How many steps to maintain focus
            ...config
        };

        // Enhanced context properties
        this._properties = new Map();
        this._history = [];
        this._beliefBase = new Map(); // Track consistent beliefs
        this._conflictTracker = new Map(); // Track conflicting beliefs
        this._relevanceScores = new Map(); // Track relevance of concepts/terms
        this._inferenceChains = []; // Track chains of inference
        this._metrics = {
            tasksProcessed: 0,
            rulesApplied: 0,
            inferencesMade: 0,
            beliefsAdded: 0,
            conflictsDetected: 0,
            goalsAchieved: 0,
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

    get reasoningPath() {
        return [...this._config.reasoningPath];
    }

    get goalStack() {
        return [...this._config.goalStack];
    }

    get currentGoal() {
        return this._config.goalStack[this._config.goalStack.length - 1] || null;
    }

    /**
     * Create a context from an existing task and memory state
     */
    static fromTaskAndMemory(task, memory, config = {}) {
        return new ReasoningContext({
            memory,
            task,
            timestamp: Date.now(),
            reasoningPath: [task?.term?.toString() || 'initial'],
            ...config
        });
    }

    /**
     * Factory method to create a context with common configurations
     */
    static create(config = {}) {
        return new ReasoningContext(config);
    }

    /**
     * Create a context specifically for rule application
     */
    static forRuleApplication(memory, termFactory, ruleEngine, config = {}) {
        return new ReasoningContext({
            memory,
            termFactory,
            ruleEngine,
            reasoningPath: [],
            ...config
        });
    }

    /**
     * Create a context specifically for strategy execution
     */
    static forStrategyExecution(memory, termFactory, strategy, config = {}) {
        return new ReasoningContext({
            memory,
            termFactory,
            strategy,
            reasoningPath: [],
            ...config
        });
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
            timestamp: Date.now(),
            depth: this._config.reasoningDepth
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
            historySize: this._history.length,
            beliefCount: this._beliefBase.size,
            conflictCount: this._conflictTracker.size
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
     * Push a goal onto the goal stack
     */
    pushGoal(goal) {
        this._config.goalStack.push(goal);
        return this;
    }

    /**
     * Pop a goal from the goal stack
     */
    popGoal() {
        return this._config.goalStack.pop();
    }

    /**
     * Check if a goal exists on the stack
     */
    hasGoal(goal) {
        return this._config.goalStack.includes(goal);
    }

    /**
     * Add a belief to the belief base
     */
    addBelief(term, truth) {
        const key = term.toString();
        this._beliefBase.set(key, { term, truth, timestamp: Date.now() });
        this.incrementMetric('beliefsAdded');
        return this;
    }

    /**
     * Check if a belief exists in the belief base
     */
    hasBelief(term) {
        return this._beliefBase.has(term.toString());
    }

    /**
     * Get a belief from the belief base
     */
    getBelief(term) {
        return this._beliefBase.get(term.toString());
    }

    /**
     * Track a conflict between beliefs
     */
    trackConflict(term1, term2, details = {}) {
        const conflictKey = `${term1.toString()}:${term2.toString()}`;
        this._conflictTracker.set(conflictKey, {
            term1, term2, details, timestamp: Date.now()
        });
        this.incrementMetric('conflictsDetected');
        return this;
    }

    /**
     * Check for conflicts with a given term
     */
    getConflictsFor(term) {
        const termStr = term.toString();
        return [...this._conflictTracker.entries()]
            .filter(([key, conflict]) => 
                conflict.term1.toString() === termStr || conflict.term2.toString() === termStr
            )
            .map(([key, conflict]) => conflict);
    }

    /**
     * Set relevance score for a concept/term
     */
    setRelevance(term, score) {
        this._relevanceScores.set(term.toString(), {
            score,
            timestamp: Date.now()
        });
        return this;
    }

    /**
     * Get relevance score for a concept/term
     */
    getRelevance(term) {
        return this._relevanceScores.get(term.toString())?.score || 0;
    }

    /**
     * Track an inference chain
     */
    addInferenceChain(premises, conclusion, ruleName) {
        this._inferenceChains.push({
            premises: premises.map(p => p.toString()),
            conclusion: conclusion.toString(),
            rule: ruleName,
            timestamp: Date.now(),
            depth: this._config.reasoningDepth
        });
        return this;
    }

    /**
     * Get recent inference chains
     */
    getInferenceChains(limit = 10) {
        return this._inferenceChains.slice(-limit);
    }

    /**
     * Add current reasoning step to the path
     */
    addToReasoningPath(step) {
        this._config.reasoningPath.push(step);
        if (this._config.reasoningPath.length > 20) { // Limit path length
            this._config.reasoningPath = this._config.reasoningPath.slice(-10);
        }
        return this;
    }

    /**
     * Check if current reasoning path contains a specific step
     */
    hasInPath(step) {
        return this._config.reasoningPath.includes(step);
    }

    /**
     * Get the current attention focus
     */
    getAttentionFocus() {
        return this._config.attentionFocus;
    }

    /**
     * Set the attention focus
     */
    setAttentionFocus(term) {
        this._config.attentionFocus = term;
        this._config.attentionFocusStart = Date.now();
        return this;
    }

    /**
     * Check if attention is still focused
     */
    hasAttentionFocus() {
        if (!this._config.attentionFocus) return false;
        const elapsed = Date.now() - (this._config.attentionFocusStart || 0);
        return elapsed < (this._config.attentionSpan * 1000); // Convert to milliseconds
    }

    /**
     * Create a child context with additional properties
     */
    createChildContext(additionalConfig = {}) {
        const childConfig = {
            ...this._config,
            ...additionalConfig,
            reasoningDepth: this._config.reasoningDepth + 1,
            reasoningPath: [...this._config.reasoningPath],
            goalStack: [...this._config.goalStack]
        };

        const childContext = new ReasoningContext(childConfig);

        // Copy properties and state to child
        for (const [key, value] of this._properties.entries()) {
            childContext.setProperty(key, value);
        }

        childContext._history = [...this._history];
        childContext._beliefBase = new Map(this._beliefBase);
        childContext._conflictTracker = new Map(this._conflictTracker);
        childContext._relevanceScores = new Map(this._relevanceScores);
        childContext._inferenceChains = [...this._inferenceChains];
        childContext._metrics = {...this._metrics};

        return childContext;
    }

    /**
     * Create a copy of this context with new configuration values
     */
    copy(config = {}) {
        // Create a new context with merged configuration
        const mergedConfig = this._deepMerge(this._config, config);

        const newContext = new ReasoningContext(mergedConfig);

        // Copy all state to the new context
        for (const [key, value] of this._properties.entries()) {
            newContext.setProperty(key, value);
        }

        newContext._history = [...this._history];
        newContext._beliefBase = new Map(this._beliefBase);
        newContext._conflictTracker = new Map(this._conflictTracker);
        newContext._relevanceScores = new Map(this._relevanceScores);
        newContext._inferenceChains = [...this._inferenceChains];
        newContext._metrics = {...this._metrics};

        return newContext;
    }

    /**
     * Helper method to perform deep merge of configuration objects
     */
    _deepMerge(target, source) {
        const result = {...target};

        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                    if (typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
                        result[key] = {...result[key], ...source[key]};
                    } else {
                        result[key] = {...source[key]};
                    }
                } else {
                    result[key] = source[key];
                }
            }
        }

        return result;
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
            beliefCount: this._beliefBase.size,
            conflictCount: this._conflictTracker.size,
            relevanceCount: this._relevanceScores.size,
            inferenceChainCount: this._inferenceChains.length,
            metrics: this.getMetrics()
        };
    }

    /**
     * Check for consistency in the belief base
     */
    checkConsistency() {
        let inconsistencies = [];
        
        // Check for direct contradictions in the belief base
        for (const [key1, belief1] of this._beliefBase.entries()) {
            for (const [key2, belief2] of this._beliefBase.entries()) {
                if (key1 !== key2) {
                    // This is a simplified contradiction check - in a real system,
                    // we'd have more sophisticated logic to detect contradictions
                    if (this._areContradictory(belief1.term, belief2.term)) {
                        inconsistencies.push({
                            term1: key1,
                            term2: key2,
                            belief1: belief1,
                            belief2: belief2
                        });
                    }
                }
            }
        }
        
        return inconsistencies;
    }

    /**
     * Simple check if two terms are contradictory
     */
    _areContradictory(term1, term2) {
        // This is a very basic implementation - a real system would have more sophisticated logic
        const str1 = term1.toString();
        const str2 = term2.toString();
        
        // Check for simple negation patterns
        return (str1 === `~${str2}` || str2 === `~${str1}`);
    }

    /**
     * Get beliefs related to a specific term
     */
    getRelatedBeliefs(term) {
        const termStr = term.toString();
        const related = [];
        
        for (const [key, belief] of this._beliefBase.entries()) {
            if (key.includes(termStr)) {
                related.push(belief);
            }
        }
        
        return related;
    }
}