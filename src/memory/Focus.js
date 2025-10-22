/**
 * Focus class - manages attention focus sets (short-term memory)
 * Implements focus set management as specified in DESIGN.md
 */
import {clamp} from '../util/common.js';
import {sortByProperty} from '../util/collections.js';
import {BaseComponent} from '../util/BaseComponent.js';

export class Focus extends BaseComponent {
    constructor(config = {}) {
        super(config, 'Focus');
        this._config = {
            maxFocusSets: 5,
            defaultFocusSetSize: 100,
            attentionDecayRate: 0.05,
            ...config
        };

        this._focusSets = new Map(); // Map<name, FocusSet>
        this._currentFocus = null;

        // Create default focus set
        this.createFocusSet('default');
        this.setFocus('default');
    }

    /**
     * Create a new focus set
     * @param {string} name - Name of the focus set
     * @param {number} maxSize - Maximum size (optional, uses default)
     * @returns {boolean} - True if created successfully
     */
    createFocusSet(name, maxSize) {
        if (this._focusSets.has(name)) {
            return false;
        }

        if (this._focusSets.size >= this._config.maxFocusSets) {
            return false;
        }

        const focusSet = new FocusSet(name, maxSize || this._config.defaultFocusSetSize);
        this._focusSets.set(name, focusSet);
        return true;
    }

    /**
     * Set the current active focus set
     * @param {string} name - Name of the focus set
     * @returns {boolean} - True if set successfully
     */
    setFocus(name) {
        if (!this._focusSets.has(name)) {
            return false;
        }

        this._currentFocus = name;
        return true;
    }

    /**
     * Get the current focus set name
     * @returns {string|null} - Current focus set name or null
     */
    getCurrentFocus() {
        return this._currentFocus;
    }

    /**
     * Get tasks from the current focus set
     * @param {number} count - Maximum number of tasks to return
     * @returns {Array<Task>} - Tasks in priority order
     */
    getTasks(count = 10) {
        const focusSet = this._focusSets.get(this._currentFocus);
        if (!focusSet) {
            return [];
        }

        return focusSet.getTasks(count);
    }

    /**
     * Add a task to the current focus set
     * @param {Task} task - Task to add
     * @returns {boolean} - True if added successfully
     */
    addTaskToFocus(task) {
        const focusSet = this._focusSets.get(this._currentFocus);
        if (!focusSet) {
            return false;
        }

        return focusSet.addTask(task);
    }

    /**
     * Remove a task from all focus sets
     * @param {string} taskHash - Hash of the task to remove
     * @returns {boolean} - True if found and removed
     */
    removeTaskFromFocus(taskHash) {
        let removed = false;

        for (const focusSet of this._focusSets.values()) {
            if (focusSet.removeTask(taskHash)) {
                removed = true;
            }
        }

        return removed;
    }

    /**
     * Update attention score for a focus set
     * @param {string} name - Name of the focus set
     * @param {number} delta - Change in attention score
     */
    updateAttention(name, delta) {
        const focusSet = this._focusSets.get(name);
        if (focusSet) {
            focusSet.updateAttention(delta);
        }
    }

    /**
     * Apply decay to all focus sets
     */
    applyDecay() {
        for (const focusSet of this._focusSets.values()) {
            focusSet.applyDecay(this._config.attentionDecayRate);
        }
    }

    /**
     * Get statistics for all focus sets
     * @returns {Object} - Statistics object
     */
    getStats() {
        const stats = {};

        for (const [name, focusSet] of this._focusSets) {
            stats[name] = focusSet.getStats();
        }

        return {
            currentFocus: this._currentFocus,
            totalFocusSets: this._focusSets.size,
            focusSets: stats
        };
    }

    /**
     * Clear all focus sets
     */
    clear() {
        for (const focusSet of this._focusSets.values()) {
            focusSet.clear();
        }
        this._focusSets.clear();
        this._currentFocus = null;
    }
}

/**
 * FocusSet class - represents a single focus set
 */
class FocusSet {
    constructor(name, maxSize) {
        this._name = name;
        this._maxSize = maxSize;
        this._tasks = new Map(); // Map<taskHash, {task, priority, addedAt}>
        this._attentionScore = 0;
        this._accessCount = 0;
        this._createdAt = Date.now();
        this._lastAccessed = Date.now();
    }

    /**
     * Add a task to this focus set
     * @param {Task} task - Task to add
     * @returns {boolean} - True if added successfully
     */
    addTask(task) {
        const taskHash = task.stamp.id;

        if (this._tasks.has(taskHash)) {
            return false; // Task already in focus
        }

        if (this._tasks.size >= this._maxSize) {
            this._removeLowestPriorityTask();
        }

        this._tasks.set(taskHash, {
            task,
            priority: task.budget.priority,
            addedAt: Date.now()
        });

        // Increase attention based on task priority
        this._attentionScore = Math.max(this._attentionScore, task.budget.priority * 0.5);

        this._lastAccessed = Date.now();
        this._accessCount++;

        return true;
    }

    /**
     * Remove a task from this focus set
     * @param {string} taskHash - Hash of the task to remove
     * @returns {boolean} - True if found and removed
     */
    removeTask(taskHash) {
        const removed = this._tasks.delete(taskHash);

        if (removed) {
            this._lastAccessed = Date.now();
        }

        return removed;
    }

    /**
     * Get tasks in priority order
     * @param {number} count - Maximum number of tasks to return
     * @returns {Array<Task>} - Tasks in priority order
     */
    getTasks(count = 10) {
        const taskEntries = Array.from(this._tasks.values());

        // Sort by priority (highest first)
        const sortedTaskEntries = sortByProperty(taskEntries, 'priority', true);

        return sortedTaskEntries.slice(0, count).map(entry => entry.task);
    }

    /**
     * Get tasks by composite scoring algorithm
     * @param {number} count - Maximum number of tasks to return
     * @param {Object} scoringOptions - Options for composite scoring
     * @returns {Array<Task>} - Tasks in composite score order
     */
    getTasksByCompositeScore(count = 10, scoringOptions = {}) {
        const {
            priorityWeight = 0.4,
            activationWeight = 0.3,
            complexityWeight = 0.2,
            recencyWeight = 0.1,
            targetComplexity = null
        } = scoringOptions;

        const taskEntries = Array.from(this._tasks.values());

        // Calculate composite scores for each task
        const scoredTasks = taskEntries.map(entry => {
            const {task, priority, addedAt} = entry;

            // Calculate activation score (based on priority)
            const activationScore = priority;

            // Calculate complexity score (based on term complexity, if available)
            const complexityScore = this._calculateTaskComplexityScore(task);

            // Calculate recency score (more recent tasks get higher scores)
            const recencyScore = this._calculateRecencyScore(addedAt);

            // Calculate composite score
            const compositeScore =
                (priority * priorityWeight) +
                (activationScore * activationWeight) +
                (complexityScore * complexityWeight) +
                (recencyScore * recencyWeight);

            return {
                task,
                priority,
                compositeScore,
                activationScore,
                complexityScore,
                recencyScore
            };
        });

        // Sort by composite score (highest first)
        scoredTasks.sort((a, b) => b.compositeScore - a.compositeScore);

        // If target complexity is specified, prefer tasks with similar complexity
        if (targetComplexity !== null) {
            scoredTasks.sort((a, b) => {
                const aDistance = Math.abs(a.complexityScore - targetComplexity);
                const bDistance = Math.abs(b.complexityScore - targetComplexity);
                return aDistance - bDistance; // Sort by complexity distance first
            });
        }

        return scoredTasks.slice(0, count).map(scoredTask => scoredTask.task);
    }

    /**
     * Calculate complexity score for a task based on its term
     * @param {Task} task - The task to score
     * @returns {number} - Complexity score between 0 and 1
     */
    _calculateTaskComplexityScore(task) {
        // If the task has a term factory or complexity method, use it
        // Otherwise, use a simple heuristic based on term structure
        if (task.term && typeof task.term === 'object' && task.term.components) {
            // Calculate based on number of components and operator depth
            const components = task.term.components || [];
            const complexity = Math.min(1, 0.1 + (components.length * 0.3));
            return complexity;
        }
        return 0.1; // Simple terms have low complexity
    }

    /**
     * Calculate recency score for a task based on when it was added
     * @param {number} addedAt - Timestamp when task was added
     * @returns {number} - Recency score between 0 and 1
     */
    _calculateRecencyScore(addedAt) {
        const now = Date.now();
        const timeDiff = now - addedAt;
        // More recent tasks get higher scores (inverse relationship with time difference)
        return Math.exp(-timeDiff / (10 * 60 * 1000)); // Decay over 10 minutes
    }

    /**
     * Update attention score
     * @param {number} delta - Change in attention score
     */
    updateAttention(delta) {
        this._attentionScore = clamp(this._attentionScore + delta, 0, 1);
    }

    /**
     * Apply decay to task priorities and attention
     * @param {number} decayRate - Rate to decay priorities
     */
    applyDecay(decayRate) {
        // Decay attention score
        this._attentionScore *= (1 - decayRate);

        // Decay task priorities
        for (const [taskHash, entry] of this._tasks) {
            entry.priority *= (1 - decayRate);
        }
    }

    /**
     * Get statistics for this focus set
     * @returns {Object} - Statistics object
     */
    getStats() {
        return {
            name: this._name,
            size: this._tasks.size,
            maxSize: this._maxSize,
            attentionScore: this._attentionScore,
            accessCount: this._accessCount,
            utilization: this._tasks.size / this._maxSize,
            createdAt: this._createdAt,
            lastAccessed: this._lastAccessed,
            age: Date.now() - this._createdAt
        };
    }

    /**
     * Clear all tasks from this focus set
     */
    clear() {
        this._tasks.clear();
        this._attentionScore = 0;
    }

    /**
     * Remove the lowest priority task to make room
     */
    _removeLowestPriorityTask() {
        if (this._tasks.size === 0) {
            return;
        }

        let lowestPriorityHash = null;
        let lowestPriority = Infinity;

        for (const [taskHash, entry] of this._tasks) {
            if (entry.priority < lowestPriority) {
                lowestPriority = entry.priority;
                lowestPriorityHash = taskHash;
            }
        }

        if (lowestPriorityHash) {
            this._tasks.delete(lowestPriorityHash);
        }
    }
}