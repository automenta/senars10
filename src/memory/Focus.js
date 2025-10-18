/**
 * Focus class - manages attention focus sets (short-term memory)
 * Implements focus set management as specified in DESIGN.md
 */
import {clamp, sortByPriority} from '../util/common.js';

export class Focus {
    constructor(config = {}) {
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
     * @param {number} priority - Priority of the task
     * @returns {boolean} - True if added successfully
     */
    addTaskToFocus(task, priority) {
        const focusSet = this._focusSets.get(this._currentFocus);
        if (!focusSet) {
            return false;
        }

        return focusSet.addTask(task, priority);
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
     * @param {number} priority - Priority of the task
     * @returns {boolean} - True if added successfully
     */
    addTask(task, priority) {
        const taskHash = task.stamp.id;

        if (this._tasks.has(taskHash)) {
            return false; // Task already in focus
        }

        if (this._tasks.size >= this._maxSize) {
            this._removeLowestPriorityTask();
        }

        this._tasks.set(taskHash, {
            task,
            priority,
            addedAt: Date.now()
        });

        // Increase attention based on task priority
        this._attentionScore = Math.max(this._attentionScore, priority * 0.5);

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
        const sortedTaskEntries = sortByPriority(taskEntries);

        return sortedTaskEntries.slice(0, count).map(entry => entry.task);
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