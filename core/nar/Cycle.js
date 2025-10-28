import {BaseComponent} from '../util/BaseComponent.js';
import {EvaluationEngine} from '../reasoning/EvaluationEngine.js';

const DEFAULT_FOCUS_TASK_LIMIT = 10;

export class Cycle extends BaseComponent {
    constructor({memory, focus, ruleEngine, taskManager, evaluator, config, reasoningStrategy, termFactory, nar}) {
        super(config, 'Cycle');
        this._memory = memory;
        this._focus = focus;
        this._ruleEngine = ruleEngine;
        this._taskManager = taskManager;
        this._evaluator = evaluator || new EvaluationEngine();
        this._config = config;
        this._reasoningStrategy = reasoningStrategy;
        this._termFactory = termFactory;
        this._nar = nar;

        this._cycleCount = 0;
        this._isRunning = false;
        this._stats = this._initStats();
    }

    get evaluator() { return this._evaluator; }
    get cycleCount() { return this._cycleCount; }
    get isRunning() { return this._isRunning; }
    get stats() { return {...this._stats}; }

    async execute() {
        const cycleStartTime = Date.now();
        this._isRunning = true;

        try {
            this._taskManager.processPendingTasks(cycleStartTime);
            this._memory.consolidate(cycleStartTime);

            const focusTasks = this._focus.getTasks(this._config.focusTaskLimit || DEFAULT_FOCUS_TASK_LIMIT);
            const allConcepts = this._memory.getAllConcepts();
            const memoryTasks = allConcepts.flatMap(c => c.getAllTasks ? c.getAllTasks() : []);

            const filteredTasks = this._filterTasksByBudget([...focusTasks, ...memoryTasks]);
            const taskMap = new Map();
            filteredTasks.forEach(task => taskMap.set(task.stamp.id, task));
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

            const processedInferences = await this._processInferencesWithEvaluator(newInferences);
            const budgetedInferences = this._applyBudgetConstraints(processedInferences);

            this._updateMemoryWithInferences(budgetedInferences, cycleStartTime);
            this._updateCycleStats(cycleStartTime);

            return {
                cycleNumber: this._cycleCount,
                newInferences: budgetedInferences.length,
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

    async _processInferencesWithEvaluator(inferences) {
        const processed = [];
        
        for (const inference of inferences) {
            try {
                processed.push(inference.term.operator === '^'
                    ? await this._processOperationTerm(inference)
                    : this._processNALTerm(inference));
            } catch (error) {
                this.logger.warn(`Evaluation failed for inference, keeping original:`, error.message);
                processed.push(inference);
            }
        }
        
        return processed;
    }

    async _processOperationTerm(inference) {
        const evaluationResult = await this._evaluator.evaluate(inference.term, this._nar, new Map());
        return evaluationResult.success && evaluationResult.result
            ? inference.clone({ term: evaluationResult.result })
            : inference;
    }

    _processNALTerm(inference) {
        const reducedTerm = this._evaluator.reduce(inference.term);
        return inference.clone({ term: reducedTerm });
    }

    _filterTasksByBudget(tasks) {
        return tasks.filter(task => {
            if (!task.budget) return true;
            
            return (task.budget.cycles === undefined || task.budget.cycles > 0) &&
                   (task.budget.depth === undefined || task.budget.depth > 0);
        });
    }

    _applyBudgetConstraints(inferences) {
        return inferences.map(inference => {
            if (!inference.budget) return inference;
            
            const newCycles = Math.max(0, (inference.budget.cycles ?? 0) - 1);
            const newDepth = Math.max(0, (inference.budget.depth ?? 0) - 1);
            
            const newBudget = {
                ...inference.budget,
                cycles: newCycles,
                depth: newDepth
            };
            
            return inference.clone({ budget: newBudget });
        });
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
        this._stats = this._initStats();
    }
    
    _initStats() {
        return {
            totalCycles: 0,
            totalTasksProcessed: 0,
            totalRulesApplied: 0,
            averageCycleTime: 0,
            createdAt: Date.now()
        };
    }

    serialize() {
        return {
            cycleCount: this._cycleCount,
            isRunning: this._isRunning,
            stats: this._stats,
            config: this._config,
            version: '1.0.0'
        };
    }

    async deserialize(data) {
        try {
            if (!data) {
                throw new Error('Invalid cycle data for deserialization');
            }

            this._cycleCount = data.cycleCount || 0;
            this._isRunning = data.isRunning || false;
            this._stats = data.stats || this._initStats();
            this._config = data.config || this._config;

            return true;
        } catch (error) {
            console.error('Error during cycle deserialization:', error);
            return false;
        }
    }
}
