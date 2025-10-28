import {ConfigurableComponent} from '../util/ConfigurableComponent.js';

/**
 * Advanced task selection with composite scoring for focus sets
 * Implements sophisticated selection based on priority, urgency, cognitive diversity, and context sensitivity
 */
export class FocusSetSelector extends ConfigurableComponent {
    constructor(config = {}) {
        const defaultConfig = {
            maxSize: 10,
            priorityThreshold: 0.1,
            priorityWeight: 0.5,
            urgencyWeight: 0.3,
            diversityWeight: 0.2,
            recencyWeight: 0.1,        // Weight for temporal recency
            noveltyWeight: 0.1,        // Weight for novelty/infrequency
            goalRelevanceWeight: 0.2,  // Weight for relevance to current goals
            conflictWeight: 0.15       // Weight for handling conflicting information
        };

        super(defaultConfig);
        this.configure(config);
        
        // Track task access patterns for context sensitivity
        this._taskAccessCounts = new Map();
        this._taskLastAccessed = new Map();
        this._recentTasks = new Set();  // For recency tracking
    }

    /**
     * Select tasks using composite scoring algorithm with context sensitivity
     * @param {Task[]} tasks - Candidate tasks to select from
     * @param {object} context - Reasoning context with memory and other info
     * @param {number} currentTime - Current system timestamp
     * @returns {Task[]} Selected tasks ordered by composite score
     */
    select(tasks, context, currentTime = Date.now()) {
        if (!tasks?.length) return [];

        // Filter by priority threshold
        const candidates = tasks.filter(task => task.budget.priority >= this.getConfigValue('priorityThreshold'));
        if (!candidates.length) return [];

        // Calculate normalization factors
        const maxUrgency = Math.max(...candidates.map(task => currentTime - task.stamp.creationTime));
        const maxComplexity = Math.max(...candidates.map(task => task.term.complexity || 1));
        const maxAccessCount = Math.max(...candidates.map(task => this._taskAccessCounts.get(task) || 0), 1);

        // Calculate composite scores with context sensitivity
        const scoredTasks = candidates.map(task => {
            const score = this._calculateCompositeScore(task, context, currentTime, maxUrgency, maxComplexity, maxAccessCount);
            return { task, score };
        });

        // Sort by score and return top tasks
        return scoredTasks
            .sort((a, b) => b.score - a.score)
            .slice(0, this.getConfigValue('maxSize'))
            .map(item => item.task);
    }

    /**
     * Calculate composite score for task selection with context sensitivity
     * @private
     */
    _calculateCompositeScore(task, context, currentTime, maxUrgency, maxComplexity, maxAccessCount) {
        // Base components
        const priority = task.budget.priority;
        const urgency = maxUrgency > 0 ? (currentTime - task.stamp.creationTime) / maxUrgency : 0;
        const diversity = maxComplexity > 0 ? (task.term.complexity || 1) / maxComplexity : 0;

        // Context-sensitive components
        const recency = this._calculateRecencyScore(task, currentTime);
        const novelty = this._calculateNoveltyScore(task, maxAccessCount);
        const goalRelevance = this._calculateGoalRelevanceScore(task, context);
        const conflictScore = this._calculateConflictScore(task, context);

        // Weighted combination using configuration values
        return priority * this.getConfigValue('priorityWeight') +
            urgency * this.getConfigValue('urgencyWeight') +
            diversity * this.getConfigValue('diversityWeight') +
            recency * this.getConfigValue('recencyWeight') +
            novelty * this.getConfigValue('noveltyWeight') +
            goalRelevance * this.getConfigValue('goalRelevanceWeight') +
            conflictScore * this.getConfigValue('conflictWeight');
    }

    /**
     * Calculate recency score based on how recently the task was accessed
     */
    _calculateRecencyScore(task, currentTime) {
        const lastAccess = this._taskLastAccessed.get(task);
        if (!lastAccess) return 1.0; // New tasks get high recency score

        const timeSinceAccess = currentTime - lastAccess;
        // Higher score for more recent access (inverse relationship)
        return Math.exp(-timeSinceAccess / 10000); // 10 second half-life
    }

    /**
     * Calculate novelty score based on how infrequently the task is accessed
     */
    _calculateNoveltyScore(task, maxAccessCount) {
        const accessCount = this._taskAccessCounts.get(task) || 0;
        // Higher score for less frequently accessed tasks
        return maxAccessCount > 0 ? (maxAccessCount - accessCount) / maxAccessCount : 1.0;
    }

    /**
     * Calculate relevance to current goals
     */
    _calculateGoalRelevanceScore(task, context) {
        if (!context?.memory?.concepts) return 0.0;

        // Check how closely the task relates to active goals
        let maxRelevance = 0.0;

        for (const concept of context.memory.concepts.values()) {
            if (concept.goals) {
                for (const goal of concept.goals) {
                    // Simple relevance calculation based on term structure similarity
                    const relevance = this._calculateTermRelevance(task.term, goal.term);
                    maxRelevance = Math.max(maxRelevance, relevance);
                }
            }
        }

        return maxRelevance;
    }

    /**
     * Calculate potential conflict with existing beliefs
     */
    _calculateConflictScore(task, context) {
        if (!context?.memory?.concepts) return 0.0;

        // Check for potential conflicts with existing beliefs
        let maxConflict = 0.0;

        for (const concept of context.memory.concepts.values()) {
            if (concept.beliefs) {
                for (const belief of concept.beliefs) {
                    // Check for contradiction or strong disagreement
                    if (this._isContradictory(task.term, belief.term)) {
                        // This is a high-conflict situation - might need to resolve it
                        maxConflict = Math.max(maxConflict, 0.8);
                    } else if (this._isInAgreement(task.term, belief.term)) {
                        maxConflict = Math.max(maxConflict, -0.2); // Negative conflict = harmony
                    }
                }
            }
        }

        return maxConflict;
    }

    /**
     * Calculate term relevance based on structural similarity
     */
    _calculateTermRelevance(term1, term2) {
        if (!term1 || !term2) return 0.0;

        // Simple similarity based on shared components
        if (term1.name === term2.name) return 1.0;

        if (term1.isCompound && term2.isCompound && term1.components && term2.components) {
            // Calculate overlap in components
            let matches = 0;
            let total = Math.max(term1.components.length, term2.components.length, 1);

            for (const comp1 of term1.components) {
                for (const comp2 of term2.components) {
                    if (comp1.name === comp2.name) {
                        matches++;
                        break;
                    }
                }
            }

            return matches / total;
        }

        return 0.0;
    }

    /**
     * Check if two terms are contradictory
     */
    _isContradictory(term1, term2) {
        // Simple check: if terms are direct opposites
        if (term1.name && term2.name) {
            return (term1.name === `~${term2.name}` || term2.name === `~${term1.name}`);
        }

        // More complex contradiction detection would go here
        return false;
    }

    /**
     * Check if two terms are in agreement
     */
    _isInAgreement(term1, term2) {
        // Simple agreement check
        return term1.name === term2.name;
    }

    /**
     * Mark a task as accessed to update context sensitivity
     */
    markAccessed(task, currentTime = Date.now()) {
        this._taskAccessCounts.set(task, (this._taskAccessCounts.get(task) || 0) + 1);
        this._taskLastAccessed.set(task, currentTime);
        this._recentTasks.add(task);
    }

    /**
     * Get current configuration for monitoring purposes
     */
    getStats() {
        return {
            totalTasksAccessed: this._taskAccessCounts.size,
            recentTasksCount: this._recentTasks.size,
            avgAccessCount: [...this._taskAccessCounts.values()].reduce((a, b) => a + b, 0) / (this._taskAccessCounts.size || 1)
        };
    }
}