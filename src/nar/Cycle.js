/**
 * Cycle class - Manages the reasoning cycle execution
 * Orchestrates task selection, rule application, and memory updates
 */
import {Logger} from '../util/Logger.js';

export class Cycle {
    constructor({memory, focus, ruleEngine, taskManager, config, reasoningStrategy, termFactory}) {
        this._memory = memory;
        this._focus = focus;
        this._ruleEngine = ruleEngine;
        this._taskManager = taskManager;
        this._config = config;
        this._reasoningStrategy = reasoningStrategy;
        this._termFactory = termFactory;
        this.logger = Logger;

        this._cycleCount = 0;
        this._isRunning = false;
        this._stats = {
            totalCycles: 0,
            totalTasksProcessed: 0,
            totalRulesApplied: 0,
            averageCycleTime: 0,
            createdAt: Date.now()
        };
    }

    get cycleCount() {
        return this._cycleCount;
    }

    get isRunning() {
        return this._isRunning;
    }

    get stats() {
        return {...this._stats};
    }

    async execute() {
        const cycleStartTime = Date.now();
        this._isRunning = true;

        try {
            // Process any pending tasks first
            this._taskManager.processPendingTasks(cycleStartTime);

            // Consolidate memory (decay, promotion, forgetting)
            this._memory.consolidate(cycleStartTime);

            // The reasoning strategy is now responsible for selecting tasks and applying rules.
            // We pass it the full context it needs to do its job.
            // For backward compatibility and proper reasoning, we need to pass focus tasks too
            const focusTasks = this._focus.getTasks(this._config.focusTaskLimit || 10);
            const newInferences = await this._reasoningStrategy.execute(
                this._memory,
                this._ruleEngine.rules,
                this._termFactory,
                focusTasks  // Pass focus tasks as additional parameter if supported
            );

            // Update memory with new inferences
            this._updateMemoryWithInferences(newInferences, cycleStartTime);

            // Update cycle statistics
            this._updateCycleStats(cycleStartTime);

            return {
                cycleNumber: this._cycleCount,
                newInferences: newInferences.length,
                cycleTime: Date.now() - cycleStartTime,
                memoryStats: this._memory.getDetailedStats()
            };

        } catch (error) {
            this.logger.error('Error in reasoning cycle:', error);
            throw error;
        } finally {
            this._isRunning = false;
        }
    }

    _updateMemoryWithInferences(inferences, currentTime) {
        for (const inference of inferences) {
            this._memory.addTask(inference, currentTime);
            this._stats.totalTasksProcessed++;

            if (inference.priority >= this._config.priorityThreshold) {
                this._focus.addTaskToFocus(inference, inference.priority);
            }
        }
    }

    _updateCycleStats(cycleStartTime) {
        this._cycleCount++;
        this._stats.totalCycles++;
        const cycleTime = Date.now() - cycleStartTime;
        this._stats.averageCycleTime = this._stats.averageCycleTime === 0
            ? cycleTime
            : this._stats.averageCycleTime * 0.9 + cycleTime * 0.1;
    }

    reset() {
        this._cycleCount = 0;
        this._isRunning = false;
        this._stats = {
            totalCycles: 0,
            totalTasksProcessed: 0,
            totalRulesApplied: 0,
            averageCycleTime: 0,
            createdAt: Date.now()
        };
    }
}
