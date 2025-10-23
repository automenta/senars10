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
        this._nar = nar;

        this._operationEvaluationEngine = new OperationEvaluationEngine();
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
            this._taskManager.processPendingTasks(cycleStartTime);
            this._memory.consolidate(cycleStartTime);

            const focusTasks = this._focus.getTasks(this._config.focusTaskLimit || 10);
            const allConcepts = this._memory.getAllConcepts();
            const memoryTasks = allConcepts.flatMap(c => c.getAllTasks ? c.getAllTasks() : []);

            const taskMap = new Map();
            [...focusTasks, ...memoryTasks].forEach(task => taskMap.set(task.stamp.id, task));
            let allTasks = Array.from(taskMap.values());

            if (this._nar?.termLayer) {
                allTasks = await this._enhanceTasksWithAssociativeLinks(allTasks, this._nar.termLayer);
            }

            const newInferences = await this._reasoningStrategy.execute(
                this._memory,
                this._ruleEngine.rules,
                this._termFactory,
                allTasks
            );

            this._updateMemoryWithInferences(newInferences, cycleStartTime);
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

    async _enhanceTasksWithAssociativeLinks(tasks, termLayer) {
        if (!tasks?.length || !termLayer) return tasks;

        const enhancedTasks = new Set(tasks);

        for (const task of tasks) {
            const associatedTerms = termLayer.get(task.term);

            for (const assoc of associatedTerms) {
                if (assoc.target?.name) {
                    const concept = this._memory.getConcept(this._termFactory.create(assoc.target.name));
                    if (concept?.getAllTasks) {
                        concept.getAllTasks().forEach(t => enhancedTasks.add(t));
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
