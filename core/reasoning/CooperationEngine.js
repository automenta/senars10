import {Logger} from '../util/Logger.js';

/**
 * CooperationEngine: A modular component that handles cooperation between different rule types
 * This extracts the cooperation logic from CoordinatedReasoningStrategy for better reusability
 */
export class CooperationEngine {
    constructor(config = {}) {
        this.config = {
            crossValidationEnabled: config.crossValidationEnabled !== false,
            feedbackEnabled: config.feedbackEnabled !== false,
            confidenceThreshold: config.confidenceThreshold || 0.1,
            maxCooperationDepth: config.maxCooperationDepth || 2,
            ...config
        };
        this.logger = Logger;
        this.feedbackRegistry = new Map(); // Tracks feedback between rule types
    }

    /**
     * Performs cooperative reasoning where LM and NAL rules enhance each other
     */
    async performCooperativeReasoning(initialTask, ruleEngine, memory, termFactory) {
        const results = {
            initialTask,
            lmGenerated: [],
            nalGenerated: [],
            crossValidated: [],
            finalResults: []
        };

        // Step 1: Apply LM rules to initial task
        const lmResults = ruleEngine.applyLMRules(initialTask, null, memory);
        results.lmGenerated = [...lmResults];

        // Step 2: Apply NAL rules to initial task
        const nalResults = ruleEngine.applyNALRules(initialTask, null, memory);
        results.nalGenerated = [...nalResults];

        // Step 3: Cross-validation - apply NAL rules to LM results
        if (this.config.crossValidationEnabled) {
            for (const lmResult of lmResults) {
                const nalOnLM = ruleEngine.applyNALRules(lmResult, null, memory);
                results.crossValidated.push(...nalOnLM);
            }

            // Apply LM rules to NAL results
            for (const nalResult of nalResults) {
                const lmOnNAL = ruleEngine.applyLMRules(nalResult, null, memory);
                results.crossValidated.push(...lmOnNAL);
            }
        }

        // Step 4: Apply deeper cooperation if enabled
        if (this.config.maxCooperationDepth > 1) {
            const deeperResults = await this.performDeeperCooperation(
                [...lmResults, ...nalResults, ...results.crossValidated],
                ruleEngine,
                memory,
                termFactory
            );
            results.crossValidated.push(...deeperResults);
        }

        // Step 5: Combine and filter results
        results.finalResults = this.combineAndFilterResults(results, memory);

        return results;
    }

    /**
     * Performs deeper cooperation between rule types
     */
    async performDeeperCooperation(tasks, ruleEngine, memory, termFactory) {
        if (this.config.maxCooperationDepth <= 1) return [];

        const deeperResults = [];
        for (const task of tasks) {
            // Apply both rule types to each task to find more inferences
            const lmMore = ruleEngine.applyLMRules(task, null, memory);
            const nalMore = ruleEngine.applyNALRules(task, null, memory);

            deeperResults.push(...lmMore, ...nalMore);

            // If we have more cooperation depth, continue the process
            if (this.config.maxCooperationDepth > 2) {
                const evenDeeper = await this.performDeeperCooperation(
                    [...lmMore, ...nalMore],
                    ruleEngine,
                    memory,
                    termFactory
                );
                deeperResults.push(...evenDeeper);
            }
        }

        return deeperResults;
    }

    /**
     * Combines and filters results based on configuration
     */
    combineAndFilterResults(results, memory) {
        const allResults = [
            ...results.lmGenerated,
            ...results.nalGenerated,
            ...results.crossValidated
        ];

        // Filter by confidence threshold if configured
        if (this.config.confidenceThreshold > 0) {
            return allResults.filter(task =>
                task.truth?.c !== undefined && task.truth.c >= this.config.confidenceThreshold
            );
        }

        return allResults;
    }

    /**
     * Applies feedback between rule types
     * For example: if LM generates a result that NAL validates, boost confidence
     */
    applyCrossTypeFeedback(lmResults, nalResults) {
        const enhancedResults = [];

        for (const lmResult of lmResults) {
            const matchingNalResult = nalResults.find(nalResult =>
                this.termsMatch(lmResult.term, nalResult.term)
            );

            if (matchingNalResult) {
                // Results match - boost confidence due to cross-validation
                const enhancedTask = this.boostTaskConfidence(lmResult, matchingNalResult);
                enhancedResults.push(enhancedTask);

                // Record feedback event
                this.recordFeedbackEvent(lmResult, matchingNalResult, 'cross_validation');
            } else {
                // No matching NAL result, keep original LM result
                enhancedResults.push(lmResult);
            }
        }

        // Also enhance NAL results that were validated by LM
        for (const nalResult of nalResults) {
            const matchingLmResult = lmResults.find(lmResult =>
                this.termsMatch(nalResult.term, lmResult.term)
            );

            if (!matchingLmResult) {
                // Add NAL results that didn't have LM matches (to preserve all reasoning)
                enhancedResults.push(nalResult);
            }
        }

        return enhancedResults;
    }

    /**
     * Records a feedback event between rule types
     */
    recordFeedbackEvent(result1, result2, type) {
        const feedbackId = `${result1.term?.id || 'unknown'}_${result2.term?.id || 'unknown'}_${Date.now()}`;
        this.feedbackRegistry.set(feedbackId, {
            timestamp: Date.now(),
            type,
            result1,
            result2,
            enhanced: true
        });
    }

    /**
     * Checks if two terms match semantically
     */
    termsMatch(term1, term2) {
        if (!term1 || !term2) return false;
        return term1.toString() === term2.toString();
    }

    /**
     * Boosts the confidence of a task based on cross-validation
     */
    boostTaskConfidence(task1, task2) {
        const combinedTruth = {
            f: ((task1.truth?.f || 0.5) + (task2.truth?.f || 0.5)) / 2,
            c: Math.min(0.95, (task1.truth?.c || 0.5) + (task2.truth?.c || 0.5))
        };

        return {
            ...task1,
            truth: combinedTruth
        };
    }

    /**
     * Gets feedback statistics
     */
    getFeedbackStats() {
        return {
            totalFeedbackEvents: this.feedbackRegistry.size,
            feedbackTypes: this.getFeedbackTypeCounts(),
            recentFeedback: Array.from(this.feedbackRegistry.values()).slice(-10)
        };
    }

    /**
     * Gets counts by feedback type
     */
    getFeedbackTypeCounts() {
        const counts = {};
        for (const feedback of this.feedbackRegistry.values()) {
            counts[feedback.type] = (counts[feedback.type] || 0) + 1;
        }
        return counts;
    }

    /**
     * Clears feedback history
     */
    clearFeedbackHistory() {
        this.feedbackRegistry.clear();
    }
}