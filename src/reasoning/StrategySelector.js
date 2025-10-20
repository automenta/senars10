import {CoordinatedReasoningStrategy} from './CoordinatedReasoningStrategy.js';
import {NaiveExhaustiveStrategy} from './NaiveExhaustiveStrategy.js';
import {Logger} from '../util/Logger.js';

/**
 * StrategySelector: Intelligent selection of reasoning strategies based on task characteristics
 */
export class StrategySelector {
    constructor(config = {}) {
        this.config = {
            enableDynamicSelection: config.enableDynamicSelection !== false,
            defaultStrategy: config.defaultStrategy || 'coordinated', // coordinated or naive
            performanceThreshold: config.performanceThreshold || 100, // ms
            taskComplexityThreshold: config.taskComplexityThreshold || 5, // number of premises
            naive: config.naive || config.naive || {}, // Accept both spellings, fix typo
            coordinated: config.coordinated || {},
            ...config
        };

        this.performanceStats = new Map(); // Track strategy performance
        this.availableStrategies = new Map(); // Registry for custom strategies
        this.logger = Logger;

        // Register default strategies
        this.registerStrategy('coordinated', CoordinatedReasoningStrategy);
        this.registerStrategy('naive', NaiveExhaustiveStrategy);
    }

    /**
     * Register a custom strategy type
     */
    registerStrategy(name, StrategyClass) {
        this.availableStrategies.set(name, StrategyClass);
        return this;
    }

    /**
     * Select the most appropriate reasoning strategy based on context
     */
    selectStrategy(context, tasks = [], rules = []) {
        if (!this.config.enableDynamicSelection) {
            return this.getDefaultStrategy(context);
        }

        // Analyze task characteristics
        const taskAnalysis = this.analyzeTasks(tasks);

        // Choose strategy based on analysis
        if (this._shouldUseCoordinatedStrategy(taskAnalysis, context)) {
            return this._createStrategy('coordinated', context);
        } else {
            return this._createStrategy('naive', context);
        }
    }

    /**
     * Get the default strategy
     */
    getDefaultStrategy(context) {
        const strategyType = this.config.defaultStrategy || 'coordinated';
        return this._createStrategy(strategyType, context);
    }

    /**
     * Create an instance of a registered strategy
     */
    _createStrategy(strategyType, context) {
        const StrategyClass = this.availableStrategies.get(strategyType);
        if (!StrategyClass) {
            throw new Error(`Unknown strategy type: ${strategyType}`);
        }

        // Pass appropriate config based on strategy type
        const strategyConfig = this.config[strategyType] || {};

        // For CoordinatedReasoningStrategy, pass ruleEngine as first parameter
        if (strategyType === 'coordinated' && context && context.ruleEngine) {
            return new StrategyClass(context.ruleEngine, strategyConfig);
        } else {
            return new StrategyClass(strategyConfig);
        }
    }

    /**
     * Analyze tasks to determine their characteristics
     */
    analyzeTasks(tasks) {
        if (!Array.isArray(tasks) || tasks.length === 0) {
            return {
                count: 0,
                complexity: 0,
                types: [],
                hasLMCompatible: false,
                hasNALCompatible: false
            };
        }

        const analysis = {
            count: tasks.length,
            complexity: 0,
            types: [...new Set(tasks.map(t => t.type || 'unknown'))],
            hasLMCompatible: false,
            hasNALCompatible: false
        };

        // Calculate average complexity and check compatibility
        let totalComponents = 0;
        for (const task of tasks) {
            if (task.term && task.term.components) {
                totalComponents += task.term.components.length;
            }

            // Check if task might be suitable for LM (natural language, complex, ambiguous)
            if (this._isLMCompatible(task)) {
                analysis.hasLMCompatible = true;
            }

            // Check if task is suitable for NAL (structured, formal)
            if (this._isNALCompatible(task)) {
                analysis.hasNALCompatible = true;
            }
        }

        analysis.complexity = tasks.length > 0 ? totalComponents / tasks.length : 0;

        return analysis;
    }

    /**
     * Determine if a task is compatible with LM reasoning
     */
    _isLMCompatible(task) {
        // Tasks that might benefit from LM reasoning
        return task.type === 'QUESTION' ||
            task.type === 'GOAL' ||
            (task.term && task.term.name && task.term.name.includes(' ')) || // Natural language terms
            (task.content && typeof task.content === 'string' && task.content.length > 50); // Long text content
    }

    /**
     * Determine if a task is compatible with NAL reasoning
     */
    _isNALCompatible(task) {
        // Tasks that are suitable for NAL reasoning
        return task.term &&
            task.term.isCompound &&
            !this._isAmbiguous(task.term);
    }

    /**
     * Check if term is ambiguous
     */
    _isAmbiguous(term) {
        if (!term) return false;
        return term.isVariable ||
            (term.name && (term.name === 'any' || term.name === '?' || term.name.startsWith('?')));
    }

    /**
     * Determine if coordinated strategy should be used
     */
    _shouldUseCoordinatedStrategy(taskAnalysis, context) {
        // Use coordinated strategy if:
        // 1. LM is available and tasks might benefit from it
        // 2. Task complexity is moderate to high
        // 3. There's a mix of task types that could benefit from both LM and NAL
        // 4. System has sufficient resources for coordination overhead

        const hasLM = context.ruleEngine && context.ruleEngine.lm;
        const isComplex = taskAnalysis.complexity > this.config.taskComplexityThreshold;
        const hasMix = taskAnalysis.hasLMCompatible && taskAnalysis.hasNALCompatible;

        return (hasLM && (taskAnalysis.hasLMCompatible || hasMix)) ||
            isComplex ||
            taskAnalysis.types.includes('QUESTION') ||
            taskAnalysis.types.includes('GOAL');
    }

    /**
     * Record performance of a strategy
     */
    recordPerformance(strategyType, executionTime, resultsCount) {
        if (!this.performanceStats.has(strategyType)) {
            this.performanceStats.set(strategyType, {
                totalExecutions: 0,
                totalTime: 0,
                totalResults: 0,
                avgTime: 0,
                avgResults: 0
            });
        }

        const stats = this.performanceStats.get(strategyType);
        stats.totalExecutions++;
        stats.totalTime += executionTime;
        stats.totalResults += resultsCount;
        stats.avgTime = stats.totalTime / stats.totalExecutions;
        stats.avgResults = stats.totalResults / stats.totalExecutions;
    }

    /**
     * Get recommendation for strategy based on performance
     */
    getPerformanceRecommendation() {
        if (this.performanceStats.size === 0) {
            return null;
        }

        let bestStrategy = null;
        let bestScore = -1;

        for (const [strategyType, stats] of this.performanceStats.entries()) {
            // Calculate a score combining efficiency (results/time) and effectiveness (results count)
            const efficiency = stats.avgTime > 0 ? stats.avgResults / stats.avgTime : 0;
            const effectiveness = stats.avgResults;
            const score = efficiency * 0.7 + effectiveness * 0.3; // Weighted score

            if (score > bestScore) {
                bestScore = score;
                bestStrategy = strategyType;
            }
        }

        return bestStrategy;
    }

    /**
     * Reset performance statistics
     */
    resetStats() {
        this.performanceStats.clear();
    }
}