import { ReasoningStrategy } from './ReasoningStrategy.js';
import { StrategyMetrics } from './StrategyMetrics.js';

/**
 * A naive, exhaustive reasoning strategy that iterates through all task combinations.
 * Computationally expensive, but useful for ensuring correctness.
 */
export class NaiveExhaustiveStrategy extends ReasoningStrategy {
    constructor(config = {}) {
        super();
        this.config = {
            maxCombinations: config.maxCombinations || 100,
            maxTasksPerBatch: config.maxTasksPerBatch || 50,
            maxRuleApplications: config.maxRuleApplications || 1000,
            enableMetrics: config.enableMetrics !== false,
            ...config
        };
        
        // Initialize metrics if enabled
        if (this.config.enableMetrics) {
            this.metrics = new StrategyMetrics({
                strategyId: 'naive-exhaustive',
                ...this.config.metrics
            });
        } else {
            this.metrics = null;
        }
    }

    async execute(memoryOrContext, rules = [], termFactory = null) {
        const startTime = performance.now();
        let success = true;
        let result = [];
        let taskCount = 0; // Declare outside try block

        try {
            let memory, context;
            
            // Check if the first parameter is a ReasoningContext
            if (memoryOrContext && typeof memoryOrContext === 'object' && memoryOrContext.hasOwnProperty('config')) {
                // It's a ReasoningContext
                context = memoryOrContext;
                memory = context.memory;
                termFactory = context.termFactory;
            } else {
                // It's the old style parameters
                memory = memoryOrContext;
                // rules parameter is already passed as the second parameter
                // termFactory is already passed as the third parameter
            }

            const tasks = this._getAllTasksFromMemory(memory);
            taskCount = tasks ? tasks.length : 0;
            
            // Split tasks into smaller batches if needed
            const taskBatches = this._createBatches(tasks, this.config.maxTasksPerBatch);
            
            const allDerivedTasks = [];
            let ruleApplications = 0;
            
            for (const taskBatch of taskBatches) {
                const batchResults = await this._processBatch(taskBatch, rules, termFactory);
                allDerivedTasks.push(...batchResults);
                
                // Stop if max applications reached
                ruleApplications += batchResults.length;
                if (ruleApplications >= this.config.maxRuleApplications) {
                    break;
                }
            }

            // Remove duplicates
            result = this._removeDuplicates(allDerivedTasks);
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

    _getAllTasksFromMemory(memory) {
        if (memory.getAllConcepts) {
            return memory.getAllConcepts().flatMap(c => c.getAllTasks ? c.getAllTasks() : []);
        } else if (memory.getAllTasks) {
            return memory.getAllTasks();
        }
        return [];
    }

    _createBatches(tasks, batchSize) {
        const batches = [];
        for (let i = 0; i < tasks.length; i += batchSize) {
            batches.push(tasks.slice(i, i + batchSize));
        }
        return batches;
    }

    async _processBatch(tasks, rules, termFactory) {
        const derivedTasks = [];

        for (const rule of rules) {
            if (rule.premises && Array.isArray(rule.premises)) {
                const ruleResults = await this._applyRuleToTasks(rule, tasks, termFactory);
                derivedTasks.push(...ruleResults);
            }
        }

        return derivedTasks;
    }

    async _applyRuleToTasks(rule, tasks, termFactory) {
        const results = [];
        const premisesCount = rule.premises ? rule.premises.length : 0;

        switch (premisesCount) {
            case 1:
                for (const task of tasks) {
                    const ruleResults = await rule._apply([task], null, termFactory);
                    results.push(...ruleResults);
                }
                break;

            case 2:
                if (tasks.length < 2) break;
                let combinationCount = 0;
                
                for (let i = 0; i < tasks.length && combinationCount < this.config.maxCombinations; i++) {
                    for (let j = i + 1; j < tasks.length && combinationCount < this.config.maxCombinations; j++) {
                        const task1 = tasks[i];
                        const task2 = tasks[j];

                        // Test both premise permutations
                        const results1 = await rule._apply([task1, task2], null, termFactory);
                        results.push(...results1);
                        combinationCount += results1.length;

                        const results2 = await rule._apply([task2, task1], null, termFactory);
                        results.push(...results2);
                        combinationCount += results2.length;
                    }
                }
                break;

            default:
                // For rules with different numbers of premises, use a more general approach
                results.push(...await this._applyRuleToAllCombinations(rule, tasks, premisesCount, termFactory));
                break;
        }

        return results;
    }

    async _applyRuleToAllCombinations(rule, tasks, premisesCount, termFactory) {
        if (premisesCount <= 0 || tasks.length < premisesCount) return [];
        
        const combinations = this._getCombinations(tasks, premisesCount);
        const results = [];
        
        for (const combination of combinations) {
            const ruleResults = await rule._apply(combination, null, termFactory);
            results.push(...ruleResults);
        }
        
        return results;
    }

    _getCombinations(array, length) {
        if (length === 1) return array.map(item => [item]);
        
        const combinations = [];
        
        for (let i = 0; i <= array.length - length; i++) {
            const head = array[i];
            const tailCombinations = this._getCombinations(array.slice(i + 1), length - 1);
            
            for (const tail of tailCombinations) {
                combinations.push([head, ...tail]);
            }
        }
        
        return combinations;
    }

    _removeDuplicates(tasks) {
        const seen = new Set();
        const uniqueTasks = [];

        for (const task of tasks) {
            const taskKey = task.term ? task.term.toString() : JSON.stringify(task);
            if (!seen.has(taskKey)) {
                seen.add(taskKey);
                uniqueTasks.push(task);
            }
        }

        return uniqueTasks;
    }
}
