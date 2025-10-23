import {BaseComponent} from '../util/BaseComponent.js';
import {OperationEvaluationEngine} from '../reasoning/OperationEvaluationEngine.js';

export class Cycle extends BaseComponent {
    constructor({memory, focus, ruleEngine, taskManager, config, reasoningStrategy, termFactory, nar}) {
        super(config, 'Cycle');
        this._memory = memory;
        this._focus = focus;
        this._ruleEngine = ruleEngine;
        this._taskManager = taskManager;
        this._config = config;
        this._reasoningStrategy = reasoningStrategy;
        this._termFactory = termFactory;
        this._nar = nar;  // Store reference to the NAR instance to access TermLayer

        // Initialize Operation Evaluation Engine for back-solving and complex operations
        this._operationEvaluationEngine = new OperationEvaluationEngine(this._ruleEngine.getFunctorRegistry());

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

    get operationEvaluationEngine() {
        return this._operationEvaluationEngine;
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

            // In addition to focus tasks, we should also consider tasks from memory for multi-premise reasoning
            // Get all tasks from all concepts in memory
            const allConcepts = this._memory.getAllConcepts();
            const memoryTasks = allConcepts.flatMap(c => c.getAllTasks ? c.getAllTasks() : []);

            // Combine focus tasks with memory tasks for comprehensive reasoning
            // Use a Set to avoid duplicates based on task stamp IDs
            const taskMap = new Map();
            [...focusTasks, ...memoryTasks].forEach(task => {
                taskMap.set(task.stamp.id, task);
            });
            let allTasks = Array.from(taskMap.values());

            // Add associative premise selection using TermLayer
            // If the nar instance has a TermLayer, get related terms to enhance reasoning
            if (this._nar && this._nar.termLayer) {
                allTasks = await this._enhanceTasksWithAssociativeLinks(allTasks, this._nar.termLayer);
            }

            const newInferences = await this._reasoningStrategy.execute(
                this._memory,
                this._ruleEngine.rules,
                this._termFactory,
                allTasks  // Pass combined tasks for multi-premise reasoning
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

    /**
     * Enhance tasks with associative links from the TermLayer to improve reasoning
     */
    async _enhanceTasksWithAssociativeLinks(tasks, termLayer) {
        if (!tasks || tasks.length === 0 || !termLayer) {
            return tasks;
        }

        // For each task, get associated terms from the TermLayer
        const enhancedTasks = new Set([...tasks]); // Use a set to avoid duplicates

        for (const task of tasks) {
            // Get associated terms related to the task's term
            const associatedTerms = termLayer.get(task.term);
            
            // Add tasks related to these associated terms to the task list
            for (const assoc of associatedTerms) {
                if (assoc.target && assoc.target.name) {
                    // Look up the concept in memory that corresponds to the associated term
                    const concept = this._memory.getConcept(this._termFactory.create(assoc.target.name));
                    if (concept && concept.getAllTasks) {
                        const relatedTasks = concept.getAllTasks();
                        relatedTasks.forEach(t => enhancedTasks.add(t));
                    }
                }
            }
        }

        return Array.from(enhancedTasks);
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
