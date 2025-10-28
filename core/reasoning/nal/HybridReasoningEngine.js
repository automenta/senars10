import {Logger} from '../../util/Logger.js';

/**
 * Helper class for resolving conflicts between NAL and LM results
 */
class ConflictResolver {
    constructor() {
        this.conflicts = [];
        this.resolutionStrategies = new Map();
        this.stats = {
            conflictsDetected: 0,
            conflictsResolved: 0,
            resolutionMethodCounts: {}
        };
    }

    /**
     * Resolves conflicts between NAL, LM, and hybrid results
     */
    async resolveConflicts(nalResults, lmResults, hybridResults) {
        const allResults = [...nalResults, ...lmResults, ...hybridResults];
        const resolvedResults = [];
        const potentialConflicts = [];

        // Detect potential conflicts by comparing similar results
        for (let i = 0; i < allResults.length; i++) {
            for (let j = i + 1; j < allResults.length; j++) {
                if (this._isConflicting(allResults[i], allResults[j])) {
                    potentialConflicts.push([allResults[i], allResults[j]]);
                    this.stats.conflictsDetected++;
                }
            }
        }

        if (potentialConflicts.length > 0) {
            // Resolve each conflict
            for (const [result1, result2] of potentialConflicts) {
                const resolved = await this._resolvePair(result1, result2);
                resolvedResults.push(resolved);
                this.stats.conflictsResolved++;
            }
        } else {
            // No conflicts, return all results
            return allResults;
        }

        return resolvedResults;
    }

    /**
     * Checks if two results are conflicting
     */
    _isConflicting(result1, result2) {
        // Two results conflict if they have the same term but significantly different truth values
        if (result1.term?.id !== result2.term?.id) {
            return false; // Different terms, not conflicting
        }

        // Check for significant difference in truth values
        const truthDiff = Math.abs((result1.truth?.f || 0.5) - (result2.truth?.f || 0.5));
        return truthDiff > 0.3; // Consider conflicting if frequency differs by more than 0.3
    }

    /**
     * Resolves a conflict between two results
     */
    async _resolvePair(result1, result2) {
        // Resolution strategy: prefer result with higher confidence
        const confidence1 = result1.truth?.c || 0.1;
        const confidence2 = result2.truth?.c || 0.1;

        if (confidence1 > confidence2) {
            this._updateResolutionStats('confidence_based');
            return result1;
        } else if (confidence2 > confidence1) {
            this._updateResolutionStats('confidence_based');
            return result2;
        } else {
            // Same confidence, use other factors
            // For now, prefer NAL results but in real implementation this could be configurable
            this._updateResolutionStats('default_preference');
            return result1;
        }
    }

    /**
     * Updates statistics for resolution method used
     */
    _updateResolutionStats(method) {
        this.stats.resolutionMethodCounts[method] = (this.stats.resolutionMethodCounts[method] || 0) + 1;
    }

    /**
     * Gets conflict resolution statistics
     */
    getStats() {
        return this.stats;
    }
}

/**
 * HybridReasoningEngine - Manages sophisticated collaboration between NAL and LM reasoning
 */
export class HybridReasoningEngine {
    constructor(nalEngine, lm, config = {}) {
        this.nalEngine = nalEngine;  // NAL Rule Engine
        this.lm = lm;                // Language Model instance
        this.config = {
            gapDetectionThreshold: config.gapDetectionThreshold || 0.3,
            confidenceThreshold: config.confidenceThreshold || 0.7,
            maxIterations: config.maxIterations || 3,
            ...config
        };
        this.logger = Logger;
        this.feedbackLoops = new Map(); // Track feedback between systems
        this.conflictResolver = new ConflictResolver();
    }

    /**
     * Performs hybrid reasoning by coordinating NAL and LM systems
     */
    async reason(task, context = {}) {
        const results = {
            nalResults: [],
            lmResults: [],
            hybridResults: [],
            reasoningPath: [],
            finalDecision: null
        };

        this.logger.info(`Starting hybrid reasoning for task: ${task.term?.toString() || task.toString()}`);

        // Step 1: Apply NAL reasoning
        const nalResults = await this._applyNALReasoning(task, context);
        results.reasoningPath.push('NAL reasoning applied');
        results.nalResults = nalResults;

        // Step 2: Apply LM reasoning
        const lmResults = await this._applyLMReasoning(task, context);
        results.reasoningPath.push('LM reasoning applied');
        results.lmResults = lmResults;

        // Step 3: Detect gaps and apply cross-validation
        const gaps = this._detectReasoningGaps(task, nalResults, lmResults, context);
        if (gaps.length > 0) {
            results.reasoningPath.push(`Detected ${gaps.length} gaps in reasoning`);

            // Fill gaps using the other system
            for (const gap of gaps) {
                const gapResult = await this._fillGap(task, gap, context);
                results.hybridResults.push(...gapResult);
            }
        }

        // Step 4: Cross-validate results
        const validatedResults = await this._crossValidate(nalResults, lmResults, context);
        results.reasoningPath.push('Cross-validation completed');
        results.hybridResults.push(...validatedResults);

        // Step 5: Resolve conflicts between NAL and LM results
        const finalResults = await this.conflictResolver.resolveConflicts(nalResults, lmResults, results.hybridResults);
        results.reasoningPath.push('Conflict resolution completed');
        results.finalDecision = finalResults;

        return results;
    }

    /**
     * Fills a reasoning gap using the appropriate system
     */
    async _fillGap(task, gap, context) {
        return gap.requiresLM
            ? await this._applyLMForGap(task, gap, context)
            : await this._applyNALForGap(task, gap, context);
    }

    /**
     * Applies NAL reasoning to the given task
     */
    async _applyNALReasoning(task, context) {
        if (!this.nalEngine) return [];

        try {
            // Apply all applicable NAL rules to the task
            return await this.nalEngine.applyRules(task);
        } catch (error) {
            this.logger.error('Error in NAL reasoning:', error);
            return [];
        }
    }

    /**
     * Applies LM reasoning to the given task
     */
    async _applyLMReasoning(task, context) {
        if (!this.lm) return [];

        try {
            // Use LM rules if available, otherwise use direct LM processing
            const lmRules = this._getLMReasoningRules();
            const results = [];

            for (const rule of lmRules) {
                if (rule.canApply && rule.canApply(task, context)) {
                    const ruleResults = await rule.apply(task, context);
                    results.push(...ruleResults.results || ruleResults);
                }
            }

            return results;
        } catch (error) {
            this.logger.error('Error in LM reasoning:', error);
            return [];
        }
    }

    /**
     * Gets available LM reasoning rules
     */
    _getLMReasoningRules() {
        if (!this.nalEngine || !this.nalEngine.lm) return [];

        // In a real implementation, these would be registered LM rules
        // For now, we'll return an empty array and implement specific rules separately
        return this.nalEngine.lm._registeredLMRules || [];
    }

    /**
     * Detects gaps in reasoning between NAL and LM systems
     */
    _detectReasoningGaps(task, nalResults, lmResults, context) {
        const gaps = [];

        // Check if NAL reasoning produced low-confidence results
        const lowConfidenceNAL = nalResults.filter(result =>
            result.truth && result.truth.c < this.config.gapDetectionThreshold
        );

        if (lowConfidenceNAL.length > 0) {
            gaps.push({
                type: 'low_confidence_nal',
                requiresLM: true,
                target: lowConfidenceNAL,
                description: 'NAL produced low-confidence results'
            });
        }

        // Check if LM reasoning produced low-confidence results
        const lowConfidenceLM = lmResults.filter(result =>
            result.truth && result.truth.c < this.config.gapDetectionThreshold
        );

        if (lowConfidenceLM.length > 0) {
            gaps.push({
                type: 'low_confidence_lm',
                requiresLM: false, // Actually requires NAL validation
                target: lowConfidenceLM,
                description: 'LM produced low-confidence results'
            });
        }

        // Check for complex reasoning that might benefit from hybrid approach
        if (task.term?.complexity > 5) { // Complex terms
            gaps.push({
                type: 'complex_reasoning',
                requiresLM: true,
                target: task,
                description: 'Task requires complex reasoning beyond NAL capabilities'
            });
        }

        // Check if there are no results from either system
        if (nalResults.length === 0 && lmResults.length === 0) {
            gaps.push({
                type: 'no_results',
                requiresLM: true,
                target: task,
                description: 'Neither system produced results'
            });
        }

        return gaps;
    }

    /**
     * Applies LM reasoning to fill identified gaps
     */
    async _applyLMForGap(task, gap, context) {
        if (!this.lm) return [];

        try {
            // Create a targeted prompt based on the gap
            const prompt = this._createGapFillingPrompt(gap, task);

            // Generate response using LM
            const lmResponse = await this.lm.process(prompt, {
                temperature: 0.7,
                maxTokens: 200
            });

            // Process the response (in a real system, this would parse LM output to tasks)
            this.logger.info(`LM filled gap: ${gap.description}`);

            return []; // Placeholder - would convert LM response to tasks in real implementation
        } catch (error) {
            this.logger.error('Error filling gap with LM:', error);
            return [];
        }
    }

    /**
     * Creates a prompt for LM to fill the reasoning gap
     */
    _createGapFillingPrompt(gap, task) {
        switch (gap.type) {
            case 'low_confidence_nal':
                return `The following NAL reasoning produced low-confidence results: ${gap.target.map(r => r.toString()).join(', ')}. Can you provide a better reasoning path or explanation?`;
            case 'complex_reasoning':
                return `The following complex task requires reasoning: ${task.term?.toString() || task.toString()}. Please provide insights or conclusions.`;
            case 'no_results':
                return `The following task has not been resolved: ${task.term?.toString() || task.toString()}. Please provide relevant reasoning or conclusions.`;
            default:
                return `Task: ${task.term?.toString() || task.toString()}. Context: ${JSON.stringify({}).substring(0, 100)}. Please provide reasoning.`;
        }
    }

    /**
     * Applies NAL reasoning to fill identified gaps
     */
    async _applyNALForGap(task, gap, context) {
        if (!this.nalEngine) return [];

        try {
            // Apply more comprehensive NAL reasoning for validation
            this.logger.info(`NAL validating LM result: ${gap.description}`);
            return await this._applyNALReasoning(task, {...context, validationMode: true});
        } catch (error) {
            this.logger.error('Error validating with NAL:', error);
            return [];
        }
    }

    /**
     * Cross-validates results between NAL and LM systems
     */
    async _crossValidate(nalResults, lmResults, hybridResults) {
        const validated = [];

        // Compare NAL and LM results for consistency
        for (const nalResult of nalResults) {
            for (const lmResult of lmResults) {
                const similarity = this._calculateSemanticSimilarity(nalResult, lmResult);

                if (similarity > this.config.confidenceThreshold) {
                    // Results are consistent, boost confidence
                    const enhancedResult = this._boostConsistentResult(nalResult, lmResult);
                    validated.push(enhancedResult);
                } else {
                    // Results differ, flag for conflict resolution
                    this.logger.info(`Potential conflict detected between NAL and LM results`);
                }
            }
        }

        return validated;
    }

    /**
     * Calculates semantic similarity between two results
     */
    _calculateSemanticSimilarity(result1, result2) {
        // Simple term similarity check (in reality, this would be more sophisticated)
        if (result1.term?.id === result2.term?.id) {
            return 1.0; // Same term
        }

        // Check for semantic similarity in term structure
        const commonComplexity = Math.min(result1.term?.complexity || 0, result2.term?.complexity || 0);
        const difference = Math.abs((result1.term?.complexity || 0) - (result2.term?.complexity || 0));

        // Simple similarity calculation (would be more sophisticated in real implementation)
        return commonComplexity > 0 ? (commonComplexity / (commonComplexity + difference)) : 0.1;
    }

    /**
     * Boosts confidence when NAL and LM results are consistent
     */
    _boostConsistentResult(nalResult, lmResult) {
        // Combine truth values when results are consistent
        const combinedTruth = {
            f: ((nalResult.truth?.f || 0.5) + (lmResult.truth?.f || 0.5)) / 2,
            c: Math.min(0.95, (nalResult.truth?.c || 0.5) + (lmResult.truth?.c || 0.5))
        };

        // Return a new task with boosted confidence
        return {
            ...nalResult,
            truth: combinedTruth
        };
    }

    /**
     * Selects the optimal reasoning path based on task characteristics
     */
    selectReasoningPath(task, context = {}) {
        // Factors to consider:
        // - Task complexity
        // - Available knowledge in memory
        // - Task type (question, belief, goal)
        // - Confidence requirements

        const isComplex = task.term?.complexity > 3;
        const isQuestion = task.type === 'QUESTION';
        const isSimple = task.term?.complexity <= 2 && task.term?.isAtomic;

        if (isSimple) {
            return 'nal'; // Use NAL for simple, atomic tasks
        } else if (isQuestion) {
            return 'hybrid'; // Questions often benefit from both systems
        } else if (isComplex) {
            return 'hybrid'; // Complex tasks benefit from combined reasoning
        } else {
            return 'nal'; // Default to NAL for most tasks
        }
    }

    /**
     * Gets hybrid reasoning metrics
     */
    getMetrics() {
        return {
            nalEngine: this.nalEngine ? this.nalEngine.metrics : null,
            lmStats: this.lm ? this.lm.getMetrics() : null,
            feedbackLoopCount: this.feedbackLoops.size,
            conflictResolverStats: this.conflictResolver.getStats()
        };
    }
}