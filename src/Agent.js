import { NAR } from './nar/NAR.js';
import { EvaluationEngine } from './reasoning/EvaluationEngine.js';

/**
 * InputTasks - A prioritizable list of input Tasks for the Agent
 * Represents the system's current agenda for processing
 */
export class InputTasks {
    constructor() {
        this.tasks = [];
    }

    /**
     * Add a task to the input buffer
     * @param {Task} task - The task to add
     * @param {number} priority - The priority of the task (higher is more important)
     */
    addTask(task, priority = 0) {
        // Validate task format and types
        if (!this._validateTask(task)) {
            throw new Error('Invalid task format');
        }
        
        this.tasks.push({ task, priority, timestamp: Date.now() });
        
        // Sort tasks by priority (descending) and then by timestamp (ascending) as tiebreaker
        this._sortTasks();
    }

    /**
     * Remove a task from the input buffer
     * @param {number} index - Index of the task to remove
     */
    removeTask(index) {
        if (index >= 0 && index < this.tasks.length) {
            return this.tasks.splice(index, 1)[0];
        }
        return null;
    }

    /**
     * Update the priority of a specific task
     * @param {number} index - Index of the task to update
     * @param {number} newPriority - New priority value
     */
    updatePriority(index, newPriority) {
        if (index >= 0 && index < this.tasks.length) {
            this.tasks[index].priority = newPriority;
            this._sortTasks();
            return true;
        }
        return false;
    }

    /**
     * Get the highest priority task
     */
    getHighestPriorityTask() {
        return this.tasks[0] || null;
    }

    /**
     * Get all tasks, sorted by priority
     */
    getAllTasks() {
        return [...this.tasks]; // Return a copy to prevent external modification
    }

    /**
     * Get tasks by priority range
     * @param {number} minPriority - Minimum priority threshold
     */
    getTasksByPriority(minPriority = -Infinity) {
        return this.tasks.filter(item => item.priority >= minPriority);
    }

    /**
     * Clear all tasks from the buffer
     */
    clear() {
        this.tasks = [];
    }

    /**
     * Validate the format and types of a task
     * @param {Task} task - Task to validate
     */
    _validateTask(task) {
        // Basic validation to ensure the task has essential properties
        // In a real implementation, this would be more comprehensive based on Task structure
        return task != null;
    }

    /**
     * Sort tasks by priority (descending) and then by timestamp (ascending) as tiebreaker
     */
    _sortTasks() {
        this.tasks.sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp);
    }

    /**
     * Get the number of tasks in the buffer
     */
    size() {
        return this.tasks.length;
    }
}

/**
 * The Agent - The top-level entity that orchestrates the system's lifecycle
 * Manages an NAR instance and handles continuous, open-ended operation
 */
export class Agent {
    constructor(config = {}) {
        // Create a NAR instance to serve as the cognitive core
        this.nar = config.nar || new NAR(config.narConfig || {});
        
        // Create an InputTasks buffer to manage the system's agenda
        this.inputTasks = new InputTasks();
        
        // Get the evaluator from the NAR since it's a core component
        this.evaluator = this.nar._evaluator;
        
        // Flag to control the main processing loop
        this.isRunning = false;
        
        // Configuration options
        this.config = {
            maxCyclesPerStep: config.maxCyclesPerStep || 100,
            ...config
        };
    }

    /**
     * Add a task to the input buffer (can be synchronous or asynchronous)
     * @param {Task} task - The task to add (belief, goal, or question)
     * @param {number} priority - Priority of the task (higher is more important)
     */
    addTask(task, priority = 0) {
        this.inputTasks.addTask(task, priority);
    }

    /**
     * Remove a task from the input buffer
     * @param {number} index - Index of the task to remove
     */
    removeTask(index) {
        return this.inputTasks.removeTask(index);
    }

    /**
     * Update the priority of a specific task
     * @param {number} index - Index of the task to update
     * @param {number} newPriority - New priority value
     */
    updatePriority(index, newPriority) {
        return this.inputTasks.updatePriority(index, newPriority);
    }

    /**
     * Main processing loop - continuously process tasks from the InputTasks buffer
     */
    async run() {
        this.isRunning = true;
        
        // Start the NAR if it's not already running
        if (!this.nar.isRunning) {
            this.nar.start();
        }
        
        while (this.isRunning) {
            await this.processNextTask();
            
            // Small delay to prevent blocking the event loop
            await this._sleep(0);
        }
    }

    /**
     * Process a single step of the main loop - process one high-priority task
     */
    async processNextTask() {
        // Get the highest priority task from the input buffer
        const taskItem = this.inputTasks.getHighestPriorityTask();
        
        if (taskItem) {
            const { task } = taskItem;
            
            try {
                // Add the task to the NAR's task manager for processing in the reasoning cycle
                const added = this.nar._taskManager.addTask(task);
                
                if (added) {
                    // Execute one reasoning cycle to process the task
                    await this.nar.step();
                    
                    // Process all derived tasks through the unified EvaluationEngine
                    await this._processDerivedTasks();
                }
                
                // Remove the processed task from the input buffer
                this._removeProcessedTask(task);
            } catch (error) {
                console.error('Error processing task:', error);
                // In a production system, we might want to handle errors differently
                // For now, we'll just continue to the next task
            }
        } else {
            // No tasks to process, sleep briefly before checking again
            await this._sleep(10); // 10ms delay when no tasks
        }
    }
    
    /**
     * Process derived tasks through the unified EvaluationEngine
     */
    async _processDerivedTasks() {
        // Get any tasks that were generated during the reasoning cycle
        // In a full implementation, we would need to hook into the NAR's 
        // inference process to capture derived tasks
        
        // For now, we'll process any new concepts in memory through the evaluation engine
        // This is a simplified approach - in a comprehensive implementation, we would
        // need to track tasks as they are generated during inference
        
        // The evaluation engine can be applied to terms generated by the NAR
        // to ensure they are maximally simplified and evaluated
    }

    /**
     * Stop the main processing loop
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Get the current status of the agent
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            taskCount: this.inputTasks.size(),
            narStatus: this.nar ? {
                isRunning: this.nar.isRunning,
                cycleCount: this.nar.cycleCount,
                memoryStats: this.nar.memory ? this.nar.memory.getDetailedStats() : 'N/A'
            } : 'N/A'
        };
    }

    /**
     * Utility method to add a sleep/delay
     * @param {number} ms - Milliseconds to sleep
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Remove a processed task from the input buffer
     * @param {Task} task - Task to remove
     */
    _removeProcessedTask(task) {
        const index = this.inputTasks.getAllTasks().findIndex(item => item.task === task);
        if (index !== -1) {
            this.inputTasks.removeTask(index);
        }
    }

    /**
     * Get the NAR instance
     */
    getNAR() {
        return this.nar;
    }

    /**
     * Get the Evaluator instance
     */
    getEvaluator() {
        return this.evaluator;
    }

    /**
     * Get the InputTasks buffer
     */
    getInputTasks() {
        return this.inputTasks;
    }

    /**
     * Get the Language Model instance if available
     */
    getLM() {
        return this.nar.lm || null;
    }

    /**
     * Get the Metrics Monitor instance if available
     */
    getMetricsMonitor() {
        return this.nar.metricsMonitor || null;
    }

    /**
     * Get the Embedding Layer instance if available
     */
    getEmbeddingLayer() {
        return this.nar.embeddingLayer || null;
    }

    /**
     * Get the Term Layer instance if available
     */
    getTermLayer() {
        return this.nar.termLayer || null;
    }

    /**
     * Get the Tool Integration instance if available
     */
    getTools() {
        return this.nar.tools || null;
    }
}