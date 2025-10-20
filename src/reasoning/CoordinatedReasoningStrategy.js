import { ReasoningStrategy } from './ReasoningStrategy.js';
import { RuleCooperationManager } from './RuleCooperationManager.js';
import {Logger} from '../util/Logger.js';

/**
 * A reasoning strategy that coordinates between different rule types (LM and NAL)
 * to provide more sophisticated reasoning capabilities.
 */
export class CoordinatedReasoningStrategy extends ReasoningStrategy {
    constructor(ruleEngine, config = {}) {
        super();
        this.ruleEngine = ruleEngine;
        this.config = {
            maxIterations: config.maxIterations || 3,
            confidenceThreshold: config.confidenceThreshold || 0.1,
            enableCrossValidation: config.enableCrossValidation !== false,
            enableFeedbackLoops: config.enableFeedbackLoops !== false,
            enableCooperationManager: config.enableCooperationManager !== false,
            ...config
        };
        this.logger = Logger;
        
        if (this.config.enableCooperationManager) {
            this.cooperationManager = new RuleCooperationManager(this.config.cooperation || {});
        }
    }

    /**
     * Execute coordinated reasoning between LM and NAL rules
     * @param {Object} memory - The memory system containing tasks and concepts
     * @param {Array} rules - The rules to apply (typically ignored since we use ruleEngine)
     * @param {Object} termFactory - The term factory for creating new terms
     * @returns {Array} - Array of derived tasks from coordinated reasoning
     */
    async execute(memory, rules, termFactory) {
        // Set the termFactory in the ruleEngine if not already set
        if (!this.ruleEngine._termFactory && termFactory) {
            this.ruleEngine._termFactory = termFactory;
        }

        // Get all tasks from memory concepts
        const tasks = this._getAllTasksFromMemory(memory);

        if (this.cooperationManager && this.config.enableCooperationManager) {
            // Use cooperation manager for advanced coordination
            return await this._executeWithCooperationManager(tasks, memory, termFactory);
        } else {
            // Use basic coordinated approach
            return await this._executeBasicCoordination(tasks, memory, termFactory);
        }
    }

    /**
     * Executes reasoning using the cooperation manager for advanced coordination
     */
    async _executeWithCooperationManager(tasks, memory, termFactory) {
        const allResults = [];
        
        for (const task of tasks) {
            const cooperationResult = await this.cooperationManager.performCooperativeReasoning(
                task, 
                this.ruleEngine, 
                memory, 
                termFactory
            );
            
            allResults.push(...cooperationResult.finalResults);
        }

        // Apply feedback mechanisms if enabled
        if (this.config.enableCrossValidation && this.cooperationManager) {
            const feedbackResults = this.cooperationManager.applyCrossTypeFeedback(
                allResults.filter(r => r._ruleType === 'LM'),
                allResults.filter(r => r._ruleType === 'NAL')
            );
            return this._filterAndValidateResults(feedbackResults);
        }

        return this._filterAndValidateResults(allResults);
    }

    /**
     * Executes basic coordinated reasoning without cooperation manager
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
            cooperationStats: this.cooperationManager ? this.cooperationManager.getFeedbackStats() : null
        };
    }
}