import {StrategyInterface} from './StrategyInterface.js';
import {CooperationEngine} from './CooperationEngine.js';
import {Logger} from '../util/Logger.js';
import {StrategyMetrics} from './StrategyMetrics.js';

/**
 * A reasoning strategy that coordinates between different rule types (LM and NAL)
 * to provide more sophisticated reasoning capabilities.
 */
export class CoordinatedReasoningStrategy extends StrategyInterface {
    constructor(ruleEngine, config = {}) {
        super({id: 'coordinated-reasoning', ...config});
        this.ruleEngine = ruleEngine;
        this.config = {
            maxIterations: config.maxIterations || 3,
            confidenceThreshold: config.confidenceThreshold || 0.1,
            enableCrossValidation: config.enableCrossValidation !== false,
            enableFeedbackLoops: config.enableFeedbackLoops !== false,
            enableCooperationEngine: config.enableCooperationEngine !== false,
            enableMetrics: config.enableMetrics !== false,
            ...config
        };
        this.logger = Logger;

        if (this.config.enableCooperationEngine) {
            this.cooperationEngine = new CooperationEngine(this.config.cooperation || {});
        }

        // Initialize metrics if enabled
        if (this.config.enableMetrics) {
            this.metrics = new StrategyMetrics({
                strategyId: 'coordinated-reasoning',
                ...this.config.metrics
            });
        } else {
            this.metrics = null;
        }
    }

    /**
     * Execute coordinated reasoning between LM and NAL rules
     * This method supports multiple signatures for backward compatibility
     * @param {Object} contextOrMemory - The reasoning context or memory object
     * @param {Array} rulesOrTermFactory - Rules array or termFactory (depending on context)
     * @param {Object} termFactoryOrFocusTasks - termFactory or focus tasks
     * @param {Array} optionalFocusTasks - Optional focus tasks when called from cycle
     * @returns {Array} - Array of derived tasks from coordinated reasoning
     */
    async execute(contextOrMemory, rulesOrTermFactory = [], termFactoryOrFocusTasks, optionalFocusTasks) {
        const startTime = performance.now();
        let success = true;
        let result = [];
        let taskCount = 0;

        try {
            let memory, termFactory, tasks;

            // Check if the first parameter is a ReasoningContext (new interface)
            if (contextOrMemory && typeof contextOrMemory === 'object' && contextOrMemory.hasOwnProperty('memory')) {
                // New StrategyInterface approach: (context, rules, taskOrTasks)
                memory = contextOrMemory.memory;
                termFactory = contextOrMemory.termFactory;

                // If the context has ruleEngine and we don't have one, use it
                if (contextOrMemory.ruleEngine && !this.ruleEngine) {
                    this.ruleEngine = contextOrMemory.ruleEngine;
                }

                tasks = Array.isArray(termFactoryOrFocusTasks) ? termFactoryOrFocusTasks : [termFactoryOrFocusTasks].filter(t => t !== undefined);
            } else {
                // Handle multiple backward compatibility patterns:
                // Pattern 1: execute(memory, rules[], termFactory, focusTasks[]) - from updated Cycle
                if (Array.isArray(optionalFocusTasks) && optionalFocusTasks.length > 0) {
                    memory = contextOrMemory;
                    // rulesOrTermFactory is the rules array
                    // termFactoryOrFocusTasks is termFactory
                    // optionalFocusTasks is the focus tasks array
                    termFactory = termFactoryOrFocusTasks;
                    tasks = optionalFocusTasks; // Use focus tasks from cycle
                }
                // Pattern 2: execute(memory, rules[], termFactory) - original from tests
                else if (rulesOrTermFactory && typeof rulesOrTermFactory !== 'function' &&
                    Array.isArray(rulesOrTermFactory) &&
                    (termFactoryOrFocusTasks && typeof termFactoryOrFocusTasks === 'object' &&
                        !Array.isArray(termFactoryOrFocusTasks) &&
                        (!termFactoryOrFocusTasks.constructor || termFactoryOrFocusTasks.constructor.name !== 'Task'))) {
                    // This is the old signature: execute(memory, rules, termFactory)
                    // where rulesOrTermFactory is the rules array and termFactoryOrFocusTasks is termFactory
                    memory = contextOrMemory;
                    termFactory = termFactoryOrFocusTasks;
                    tasks = this._getAllTasksFromMemory(memory) || []; // Get tasks from memory for backward compatibility
                } else {
                    // Pattern 3: execute(memory, termFactory, focusTasks[] or undefined) - possible alternative
                    memory = contextOrMemory;
                    termFactory = rulesOrTermFactory;
                    tasks = Array.isArray(termFactoryOrFocusTasks) ? termFactoryOrFocusTasks : [termFactoryOrFocusTasks].filter(t => t !== undefined);

                    // For backward compatibility, if tasks is just undefined, try to get from memory
                    if (tasks.length === 1 && tasks[0] === undefined) {
                        tasks = this._getAllTasksFromMemory(memory) || [];
                    }
                }
            }

            taskCount = tasks.length;

            // Set the termFactory in the ruleEngine if not already set
            if (this.ruleEngine && !this.ruleEngine._termFactory && termFactory) {
                this.ruleEngine._termFactory = termFactory;
            }

            if (this.cooperationEngine && this.config.enableCooperationEngine) {
                // Use cooperation engine for advanced coordination
                result = await this._executeWithCooperationEngine(tasks, memory, termFactory);
            } else {
                // Use basic coordinated approach
                result = await this._executeBasicCoordination(tasks, memory, termFactory);
            }
        } catch (error) {
            success = false;
            throw error;
        } finally {
            const executionTime = performance.now() - startTime;

            // Record metrics if enabled
            if (this.metrics) {
                this.metrics.recordExecution(
                    executionTime,
                    taskCount,
                    result.length,
                    success
                );
            }
        }

        return result;
    }

    /**
     * Executes reasoning using the cooperation engine for advanced coordination
     */
    async _executeWithCooperationEngine(tasks, memory, termFactory) {
        const allResults = [];

        for (const task of tasks) {
            const cooperationResult = await this.cooperationEngine.performCooperativeReasoning(
                task,
                this.ruleEngine,
                memory,
                termFactory
            );

            allResults.push(...cooperationResult.finalResults);
        }

        // Apply feedback mechanisms if enabled
        if (this.config.enableCrossValidation && this.cooperationEngine) {
            const feedbackResults = this.cooperationEngine.applyCrossTypeFeedback(
                allResults.filter(r => r._ruleType === 'LM'),
                allResults.filter(r => r._ruleType === 'NAL')
            );
            return this._filterAndValidateResults(feedbackResults);
        }

        return this._filterAndValidateResults(allResults);
    }

    /**
     * Executes basic coordinated reasoning without cooperation engine
     */
    async _executeBasicCoordination(tasks, memory, termFactory) {
        // Perform coordinated reasoning iterations
        let allDerivedTasks = [];
        let currentTasks = [...tasks];

        for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
            this.logger.debug(`Coordinated reasoning iteration ${iteration + 1}/${this.config.maxIterations}`);

            const iterationResults = await this._performIteration(currentTasks, memory, termFactory);
            allDerivedTasks = [...allDerivedTasks, ...iterationResults.derivedTasks];

            // Update current tasks with new derivations for next iteration if feedback loops enabled
            if (this.config.enableFeedbackLoops && iterationResults.derivedTasks.length > 0) {
                currentTasks = [...tasks, ...iterationResults.derivedTasks];
            } else {
                break; // Only one iteration if feedback loops disabled
            }
        }

        return this._filterAndValidateResults(allDerivedTasks);
    }

    /**
     * Performs a single iteration of coordinated reasoning
     */
    async _performIteration(tasks, memory, termFactory) {
        const results = {
            lmResults: [],
            nalResults: [],
            hybridResults: [],
            derivedTasks: []
        };

        // Apply LM rules to all tasks
        for (const task of tasks) {
            const lmTaskResults = this.ruleEngine.applyLMRules(task, null, memory);
            // Tag results with rule type for potential feedback processing
            results.lmResults.push(...lmTaskResults.map(r => ({...r, _ruleType: 'LM'})));
        }

        // Apply NAL rules to original tasks
        for (const task of tasks) {
            const nalTaskResults = this.ruleEngine.applyNALRules(task, null, memory);
            // Tag results with rule type for potential feedback processing
            results.nalResults.push(...nalTaskResults.map(r => ({...r, _ruleType: 'NAL'})));
        }

        // Apply hybrid coordination - apply NAL rules to LM results and vice versa
        if (this.config.enableCrossValidation) {
            // Apply NAL rules to LM-generated results
            for (const lmResult of results.lmResults) {
                const nalOnLmResults = this.ruleEngine.applyNALRules(lmResult, null, memory);
                results.hybridResults.push(...nalOnLmResults.map(r => ({...r, _ruleType: 'Hybrid'})));
            }

            // Apply LM rules to NAL-generated results
            for (const nalResult of results.nalResults) {
                const lmOnNalResults = this.ruleEngine.applyLMRules(nalResult, null, memory);
                results.hybridResults.push(...lmOnNalResults.map(r => ({...r, _ruleType: 'Hybrid'})));
            }
        }

        // Combine all results
        results.derivedTasks = [
            ...results.lmResults,
            ...results.nalResults,
            ...results.hybridResults
        ];

        return results;
    }

    /**
     * Gets all tasks from memory
     */
    _getAllTasksFromMemory(memory) {
        if (memory.getAllConcepts) {
            return memory.getAllConcepts().flatMap(c => c.getAllTasks ? c.getAllTasks() : []);
        } else if (memory.getAllTasks) {
            return memory.getAllTasks();
        }
        return [];
    }

    /**
     * Filters and validates the final results
     */
    _filterAndValidateResults(results) {
        // Filter out low-confidence tasks if threshold is set
        if (this.config.confidenceThreshold && this.config.confidenceThreshold > 0) {
            return results.filter(task =>
                task.truth?.c !== undefined ? task.truth.c >= this.config.confidenceThreshold : true
            );
        }
        return results;
    }

    /**
     * Gets reasoning metrics for this strategy
     */
    getMetrics() {
        return {
            ...this.ruleEngine.metrics,
            config: this.config,
            cooperationStats: this.cooperationEngine ? this.cooperationEngine.getFeedbackStats() : null
        };
    }
}