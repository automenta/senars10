import {clamp} from '../util/common.js';
import {sortByProperty} from '../util/collections.js';
import {BaseComponent} from '../util/BaseComponent.js';

const DEFAULT_CONFIG = Object.freeze({
    maxFocusSets: 5,
    defaultFocusSetSize: 100,
    attentionDecayRate: 0.05
});

export class Focus extends BaseComponent {
    constructor(config = {}) {
        super(config, 'Focus');
        this._config = {
            ...DEFAULT_CONFIG,
            ...config
        };

        this._focusSets = new Map();
        this._currentFocus = null;

        this.createFocusSet('default');
        this.setFocus('default');
    }

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

    setFocus(name) {
        if (!this._focusSets.has(name)) {
            return false;
        }

        this._currentFocus = name;
        return true;
    }

    getCurrentFocus() {
        return this._currentFocus;
    }

    getTasks(count = 10) {
        const focusSet = this._focusSets.get(this._currentFocus);
        if (!focusSet) {
            return [];
        }

        return focusSet.getTasks(count);
    }

    addTaskToFocus(task) {
        const focusSet = this._focusSets.get(this._currentFocus);
        if (!focusSet) {
            return false;
        }

        return focusSet.addTask(task);
    }

    removeTaskFromFocus(taskHash) {
        let removed = false;

        for (const focusSet of this._focusSets.values()) {
            if (focusSet.removeTask(taskHash)) {
                removed = true;
            }
        }

        return removed;
    }

    updateAttention(name, delta) {
        const focusSet = this._focusSets.get(name);
        if (focusSet) {
            focusSet.updateAttention(delta);
        }
    }

    applyDecay() {
        for (const focusSet of this._focusSets.values()) {
            focusSet.applyDecay(this._config.attentionDecayRate);
        }
    }

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

    clear() {
        for (const focusSet of this._focusSets.values()) {
            focusSet.clear();
        }
        this._focusSets.clear();
        this._currentFocus = null;
    }

    serialize() {
        const focusSetData = {};
        for (const [name, focusSet] of this._focusSets) {
            focusSetData[name] = focusSet.serialize ? focusSet.serialize() : null;
        }

        return {
            config: this._config,
            currentFocus: this._currentFocus,
            focusSets: focusSetData,
            version: '1.0.0'
        };
    }

    async deserialize(data) {
        try {
            if (!data) {
                throw new Error('Invalid focus data for deserialization');
            }

            if (data.config) {
                this._config = { ...this._config, ...data.config };
            }

            this.clear();

            if (data.focusSets) {
                for (const [name, focusSetData] of Object.entries(data.focusSets)) {
                    if (focusSetData) {
                        const focusSet = new FocusSet(name, focusSetData.maxSize);
                        if (focusSet.deserialize) {
                            await focusSet.deserialize(focusSetData);
                        }
                        this._focusSets.set(name, focusSet);
                    }
                }
            }

            if (data.currentFocus) {
                this._currentFocus = data.currentFocus;
            }

            return true;
        } catch (error) {
            console.error('Error during focus deserialization:', error);
            return false;
        }
    }
}

const DEFAULT_SCORE_WEIGHTS = Object.freeze({
    priorityWeight: 0.4,
    activationWeight: 0.3,
    complexityWeight: 0.2,
    recencyWeight: 0.1
});

class FocusSet {
    constructor(name, maxSize) {
        this._name = name;
        this._maxSize = maxSize;
        this._tasks = new Map();
        this._attentionScore = 0;
        this._accessCount = 0;
        this._createdAt = Date.now();
        this._lastAccessed = Date.now();
    }

    addTask(task) {
        const taskHash = task.stamp.id;

        if (this._tasks.has(taskHash)) {
            return false;
        }

        if (this._tasks.size >= this._maxSize) {
            this._removeLowestPriorityTask();
        }

        this._tasks.set(taskHash, {
            task,
            priority: task.budget.priority,
            addedAt: Date.now()
        });

        this._attentionScore = Math.max(this._attentionScore, task.budget.priority * 0.5);

        this._lastAccessed = Date.now();
        this._accessCount++;

        return true;
    }

    removeTask(taskHash) {
        const removed = this._tasks.delete(taskHash);

        if (removed) {
            this._lastAccessed = Date.now();
        }

        return removed;
    }

    getTasks(count = 10) {
        const taskEntries = Array.from(this._tasks.values());

        const sortedTaskEntries = sortByProperty(taskEntries, 'priority', true);

        return sortedTaskEntries.slice(0, count).map(entry => entry.task);
    }

    getTasksByCompositeScore(count = 10, scoringOptions = {}) {
        const options = {
            ...DEFAULT_SCORE_WEIGHTS,
            ...scoringOptions
        };

        const taskEntries = Array.from(this._tasks.values());

        const scoredTasks = taskEntries.map(entry => {
            const {task, priority, addedAt} = entry;

            const activationScore = priority;
            const complexityScore = this._calculateTaskComplexityScore(task);
            const recencyScore = this._calculateRecencyScore(addedAt);

            const compositeScore =
                (priority * options.priorityWeight) +
                (activationScore * options.activationWeight) +
                (complexityScore * options.complexityWeight) +
                (recencyScore * options.recencyWeight);

            return {
                task,
                priority,
                compositeScore,
                activationScore,
                complexityScore,
                recencyScore
            };
        });

        scoredTasks.sort((a, b) => b.compositeScore - a.compositeScore);

        if (options.targetComplexity !== null) {
            scoredTasks.sort((a, b) => {
                const aDistance = Math.abs(a.complexityScore - options.targetComplexity);
                const bDistance = Math.abs(b.complexityScore - options.targetComplexity);
                return aDistance - bDistance;
            });
        }

        return scoredTasks.slice(0, count).map(scoredTask => scoredTask.task);
    }

    _calculateTaskComplexityScore(task) {
        if (task.term && typeof task.term === 'object' && task.term.components) {
            const components = task.term.components || [];
            const complexity = Math.min(1, 0.1 + (components.length * 0.3));
            return complexity;
        }
        return 0.1;
    }

    _calculateRecencyScore(addedAt) {
        const now = Date.now();
        const timeDiff = now - addedAt;
        return Math.exp(-timeDiff / (10 * 60 * 1000));
    }

    updateAttention(delta) {
        this._attentionScore = clamp(this._attentionScore + delta, 0, 1);
    }

    applyDecay(decayRate) {
        this._attentionScore *= (1 - decayRate);

        for (const [taskHash, entry] of this._tasks) {
            entry.priority *= (1 - decayRate);
        }
    }

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

    clear() {
        this._tasks.clear();
        this._attentionScore = 0;
    }

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

    serialize() {
        const tasksData = [];
        for (const [taskHash, taskEntry] of this._tasks) {
            tasksData.push({
                hash: taskHash,
                priority: taskEntry.priority,
                addedAt: taskEntry.addedAt,
                task: taskEntry.task.serialize ? taskEntry.task.serialize() : null
            });
        }

        return {
            name: this._name,
            maxSize: this._maxSize,
            tasks: tasksData,
            attentionScore: this._attentionScore,
            accessCount: this._accessCount,
            createdAt: this._createdAt,
            lastAccessed: this._lastAccessed,
            version: '1.0.0'
        };
    }

    async deserialize(data) {
        try {
            if (!data) {
                throw new Error('Invalid focus set data for deserialization');
            }

            this._name = data.name || this._name;
            this._maxSize = data.maxSize || this._maxSize;
            this._attentionScore = data.attentionScore || 0;
            this._accessCount = data.accessCount || 0;
            this._createdAt = data.createdAt || Date.now();
            this._lastAccessed = data.lastAccessed || Date.now();

            this._tasks.clear();

            if (data.tasks) {
                for (const taskEntry of data.tasks) {
                    if (taskEntry) {
                        const reconstructedTask = taskEntry.task ? 
                            (Task.fromJSON ? Task.fromJSON(taskEntry.task) : null) : 
                            null;

                        if (reconstructedTask) {
                            this._tasks.set(taskEntry.hash, {
                                task: reconstructedTask,
                                priority: taskEntry.priority || 0,
                                addedAt: taskEntry.addedAt || Date.now()
                            });
                        }
                    }
                }
            }

            return true;
        } catch (error) {
            console.error('Error during focus set deserialization:', error);
            return false;
        }
    }
}