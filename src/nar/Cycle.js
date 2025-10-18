/**
 * Cycle class - Manages the reasoning cycle execution
 * Orchestrates task selection, rule application, and memory updates
 */

import {Logger} from '../util/Logger.js';
import {sortByProperty} from '../util/collections.js';

export class Cycle {
    constructor({memory, focus, ruleEngine, taskManager, config}) {
        this._memory = memory;
        this._focus = focus;
        this._ruleEngine = ruleEngine;
        this._taskManager = taskManager;
        this._config = config;
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
            const processedTasks = this._taskManager.processPendingTasks(cycleStartTime);

            // Consolidate memory (decay, promotion, forgetting)
            this._memory.consolidate(cycleStartTime);

            // Get tasks for reasoning (from focus memory)
            const focusTasks = this._getTasksForReasoning();

            // Apply rules to generate new inferences
            const newInferences = await this._applyRules(focusTasks);

            // Update memory with new inferences
            this._updateMemoryWithInferences(newInferences, cycleStartTime);

            // Update cycle statistics
            this._updateCycleStats(cycleStartTime);

            return {
                cycleNumber: this._cycleCount,
                processedTasks: processedTasks.length,
                focusTasks: focusTasks.length,
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

    _getTasksForReasoning() {
        const maxTasks = this._config.maxTasksPerCycle;
        const activeConcepts = this._memory.getMostActiveConcepts(20);
        const selectedTasks = [];

        for (const concept of activeConcepts) {
            if (selectedTasks.length >= maxTasks) break;

            // Get highest priority tasks from this concept
            const conceptTasks = sortByProperty(concept.getAllTasks(), 'priority', true);

            for (const task of conceptTasks) {
                if (selectedTasks.length >= maxTasks) break;
                selectedTasks.push(task);
            }
        }

        return selectedTasks;
    }

    async _applyRules(tasks) {
        const newInferences = [];

        for (const task of tasks) {
            try {
                // Get applicable rules for this task and apply them
                const applicableRules = this._ruleEngine.getApplicableRules(task);

                for (const rule of applicableRules) {
                    const ruleResults = await this._ruleEngine.applyRule(rule, task);

                    if (ruleResults?.results?.length > 0) {
                        newInferences.push(...ruleResults.results);
                        this._stats.totalRulesApplied += ruleResults.results.length;
                    }
                }
            } catch (error) {
                this.logger.warn(`Error applying rules to task ${task.stamp.id}:`, error);
            }
        }

        return newInferences;
    }

    _updateMemoryWithInferences(inferences, currentTime) {
        for (const inference of inferences) {
            // Add inference to memory
            this._memory.addTask(inference, currentTime);
            this._stats.totalTasksProcessed++;

            // Add to focus if priority is high enough
            if (inference.priority >= this._config.priorityThreshold) {
                this._focus.addTaskToFocus(inference, inference.priority);
            }
        }
    }

    _updateCycleStats(cycleStartTime) {
        this._cycleCount++;
        this._stats.totalCycles++;

        const cycleTime = Date.now() - cycleStartTime;

        // Update average cycle time (exponential moving average)
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