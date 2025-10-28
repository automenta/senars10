import {Task} from './Task.js';
import {collectTasksFromAllConcepts} from '../util/memory.js';
import {BaseComponent} from '../util/BaseComponent.js';

const PRIORITY_BUCKETS = Object.freeze({
    LOW_THRESHOLD: 0.3,
    MEDIUM_THRESHOLD: 0.7
});

const DEFAULT_PRIORITY_THRESHOLD = 0.1;
const DEFAULT_MIN_PRIORITY = 0.7;
const DEFAULT_MAX_AGE = 60000;
const DEFAULT_LIMIT = 20;

export class TaskManager extends BaseComponent {
    constructor(memory, focus, config) {
        super(config, 'TaskManager');
        this._memory = memory;
        this._focus = focus;
        this._config = config;
        this._pendingTasks = new Map();
        this._stats = {
            totalTasksCreated: 0,
            totalTasksProcessed: 0,
            tasksPending: 0,
            createdAt: Date.now()
        };
    }

    get stats() {
        return {...this._stats};
    }

    get pendingTasksCount() {
        return this._pendingTasks.size;
    }

    addTask(task) {
        if (!(task instanceof Task)) {
            throw new Error('TaskManager.addTask requires a Task instance');
        }

        this._pendingTasks.set(task.stamp.id, task);
        this._stats.totalTasksCreated++;
        this._stats.tasksPending = this._pendingTasks.size;
        return true;
    }

    processPendingTasks(currentTime = Date.now()) {
        const processedTasks = [];

        const priorityThreshold = this._config?.priorityThreshold ?? DEFAULT_PRIORITY_THRESHOLD;

        for (const [taskId, task] of this._pendingTasks) {
            const addedToMemory = this._memory.addTask(task, currentTime);

            if (addedToMemory) {
                if (this._focus && task.budget.priority >= priorityThreshold) {
                    this._focus.addTaskToFocus(task);
                }

                processedTasks.push(task);
                this._stats.totalTasksProcessed++;
            }
        }

        this._pendingTasks.clear();
        this._stats.tasksPending = 0;
        return processedTasks;
    }

    _createTask(punctuation, term, truth = null, budget) {
        return new Task({
            term,
            truth,
            punctuation,
            budget: budget ?? this._config?.defaultBudget
        });
    }

    createBelief(term, truth, budget) {
        return this._createTask('.', term, truth, budget);
    }

    createGoal(term, truth = null, budget) {
        return this._createTask('!', term, truth, budget);
    }

    createQuestion(term, budget) {
        return this._createTask('?', term, null, budget);
    }

    findTasksByTerm(term) {
        const concept = this._memory.getConcept(term);
        return concept ? concept.getAllTasks() : [];
    }

    findTasksByType(taskType) {
        return collectTasksFromAllConcepts(this._memory, t => t.type === taskType);
    }

    findTasksByPriority(minPriority = 0, maxPriority = 1) {
        return collectTasksFromAllConcepts(this._memory,
            t => t.budget.priority >= minPriority && t.budget.priority <= maxPriority);
    }

    findRecentTasks(sinceTimestamp) {
        return collectTasksFromAllConcepts(this._memory,
            t => t.stamp.creationTime >= sinceTimestamp);
    }

    getHighestPriorityTasks(limit = 10) {
        const allTasks = collectTasksFromAllConcepts(this._memory);
        return allTasks.sort((a, b) => b.budget.priority - a.budget.priority).slice(0, limit);
    }

    updateTaskPriority(task, newPriority) {
        const concept = this._memory.getConcept(task.term);
        if (!concept) return false;
        const oldTask = concept.getTask(task.stamp.id);
        if (!oldTask) return false;
        const newTask = oldTask.clone({budget: {...oldTask.budget, priority: newPriority}});
        return concept.replaceTask(oldTask, newTask);
    }

    removeTask(task) {
        const concept = this._memory.getConcept(task.term);
        if (!concept) return false;

        const removed = concept.removeTask(task);
        if (removed) this._stats.totalTasksProcessed++;
        return removed;
    }

    getTasksNeedingAttention(criteria = {}) {
        const {minPriority = DEFAULT_MIN_PRIORITY, maxAge = DEFAULT_MAX_AGE, limit = DEFAULT_LIMIT} = criteria;
        const currentTime = Date.now();

        const allTasks = collectTasksFromAllConcepts(this._memory, task =>
            task.budget.priority >= minPriority && (currentTime - task.stamp.creationTime) <= maxAge
        );

        return allTasks
            .sort((a, b) => b.budget.priority - a.budget.priority || b.stamp.creationTime - a.stamp.creationTime)
            .slice(0, limit);
    }

    getTaskStats() {
        const stats = {
            tasksByType: {BELIEF: 0, GOAL: 0, QUESTION: 0},
            priorityDistribution: {low: 0, medium: 0, high: 0},
            totalPriority: 0,
            oldestTask: Date.now(),
            newestTask: 0
        };

        collectTasksFromAllConcepts(this._memory, task => {
            stats.tasksByType[task.type]++;
            stats.priorityDistribution[this._getPriorityBucket(task.budget.priority)]++;
            stats.totalPriority += task.budget.priority;
            stats.oldestTask = Math.min(stats.oldestTask, task.stamp.creationTime);
            stats.newestTask = Math.max(stats.newestTask, task.stamp.creationTime);
            return true;
        });

        const totalTasks = Object.values(stats.tasksByType).reduce((sum, count) => sum + count, 0);
        const averagePriority = totalTasks > 0 ? stats.totalPriority / totalTasks : 0;

        return {
            ...this._stats,
            tasksByType: stats.tasksByType,
            priorityDistribution: stats.priorityDistribution,
            averagePriority,
            oldestTask: stats.oldestTask,
            newestTask: stats.newestTask,
            ageRange: stats.newestTask - stats.oldestTask
        };
    }

    _getPriorityBucket = (priority) => 
        priority < PRIORITY_BUCKETS.LOW_THRESHOLD ? 'low' : 
        priority < PRIORITY_BUCKETS.MEDIUM_THRESHOLD ? 'medium' : 'high';

    clearPendingTasks() {
        this._pendingTasks.clear();
        this._stats.tasksPending = 0;
    }

    hasTask(task) {
        const concept = this._memory.getConcept(task.term);
        return concept ? concept.containsTask(task) : false;
    }

    getPendingTasks() {
        return Array.from(this._pendingTasks.values());
    }

    serialize() {
        return {
            config: this._config,
            pendingTasks: Array.from(this._pendingTasks.entries()).map(([id, task]) => ({
                id: id,
                task: task.serialize ? task.serialize() : null
            })),
            stats: this._stats,
            version: '1.0.0'
        };
    }

    async deserialize(data) {
        try {
            if (!data) {
                throw new Error('Invalid task manager data for deserialization');
            }

            if (data.config) {
                this._config = data.config;
            }

            this._pendingTasks.clear();

            if (data.pendingTasks) {
                for (const { id, task: taskData } of data.pendingTasks) {
                    if (taskData) {
                        this._pendingTasks.set(id, Task.fromJSON ? Task.fromJSON(taskData) : null);
                    }
                }
            }

            if (data.stats) {
                this._stats = { ...data.stats };
            }

            return true;
        } catch (error) {
            console.error('Error during task manager deserialization:', error);
            return false;
        }
    }
}