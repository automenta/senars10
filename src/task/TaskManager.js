import {Task} from './Task.js';
import {collectTasksFromAllConcepts} from '../util/memory.js';

export class TaskManager {
    constructor(memory, focus, config) {
        this._memory = memory;
        this._focus = focus;
        this._config = config;
        this._pendingTasks = new Map(); // Map<taskId, Task>
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

        // Use a default priority threshold if not configured
        const priorityThreshold = this._config?.priorityThreshold ?? 0.1;

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
        const {minPriority = 0.7, maxAge = 60000, limit = 20} = criteria;
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

    _getPriorityBucket = (priority) => priority < 0.3 ? 'low' : priority < 0.7 ? 'medium' : 'high';

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
}