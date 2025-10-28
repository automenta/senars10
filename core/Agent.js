import { NAR } from './nar/NAR.js';
import { EvaluationEngine } from './reasoning/EvaluationEngine.js';

export class InputTasks {
    constructor() {
        this.tasks = [];
    }

    addTask(task, priority = 0) {
        if (!this._validateTask(task)) throw new Error('Invalid task format');
        this.tasks.push({ task, priority, timestamp: Date.now() });
        this._sortTasks();
    }

    removeTask(index) {
        return index >= 0 && index < this.tasks.length ? this.tasks.splice(index, 1)[0] : null;
    }

    updatePriority(index, newPriority) {
        return index >= 0 && index < this.tasks.length ? (this.tasks[index].priority = newPriority, this._sortTasks(), true) : false;
    }

    getHighestPriorityTask() {
        return this.tasks[0] || null;
    }

    getAllTasks() {
        return [...this.tasks];
    }

    getTasksByPriority(minPriority = -Infinity) {
        return this.tasks.filter(item => item.priority >= minPriority);
    }

    clear() {
        this.tasks = [];
    }

    _validateTask = task => task != null;

    _sortTasks() {
        this.tasks.sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp);
    }

    size() {
        return this.tasks.length;
    }
}

export class Agent {
    constructor(config = {}) {
        this.nar = config.nar || new NAR(config.narConfig || {});
        this.inputTasks = new InputTasks();
        this.evaluator = this.nar._evaluator;
        this.isRunning = false;
        this.config = { maxCyclesPerStep: config.maxCyclesPerStep || 100, ...config };
    }

    addTask(task, priority = 0) {
        this.inputTasks.addTask(task, priority);
    }

    removeTask(index) {
        return this.inputTasks.removeTask(index);
    }

    updatePriority(index, newPriority) {
        return this.inputTasks.updatePriority(index, newPriority);
    }

    async run() {
        this.isRunning = true;
        if (!this.nar.isRunning) this.nar.start();
        while (this.isRunning) {
            await this.processNextTask();
            await this._sleep(0);
        }
    }

    async processNextTask() {
        const taskItem = this.inputTasks.getHighestPriorityTask();
        if (taskItem) {
            const { task } = taskItem;
            try {
                if (this.nar._taskManager.addTask(task)) {
                    await this.nar.step();
                    await this._processDerivedTasks();
                }
                this._removeProcessedTask(task);
            } catch (error) {
                this.logger?.error('Error processing task:', error);
            }
        } else {
            await this._sleep(10);
        }
    }

    async _processDerivedTasks() {}

    stop() {
        this.isRunning = false;
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            taskCount: this.inputTasks.size(),
            narStatus: this.nar ? {
                isRunning: this.nar.isRunning,
                cycleCount: this.nar.cycleCount,
                memoryStats: this.nar.memory?.getDetailedStats() || 'N/A'
            } : 'N/A'
        };
    }

    _sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    _removeProcessedTask(task) {
        const index = this.inputTasks.getAllTasks().findIndex(item => item.task === task);
        if (index !== -1) this.inputTasks.removeTask(index);
    }

    getNAR() { return this.nar; }
    getEvaluator() { return this.evaluator; }
    getInputTasks() { return this.inputTasks; }
    getLM() { return this.nar.lm || null; }
    getMetricsMonitor() { return this.nar.metricsMonitor || null; }
    getEmbeddingLayer() { return this.nar.embeddingLayer || null; }
    getTermLayer() { return this.nar.termLayer || null; }
    getTools() { return this.nar.tools || null; }
    getPluginManager() { return this._pluginManager || null; }
}