import {Logger} from '../util/Logger.js';
import {CooperationEngine} from './CooperationEngine.js';

/**
 * RuleCooperationManager: A wrapper around CooperationEngine to maintain backward compatibility
 * This provides the same interface as before but delegates to the more modular CooperationEngine
 */
export class RuleCooperationManager {
    constructor(config = {}) {
        this.cooperationEngine = new CooperationEngine(config);
        this.logger = Logger;
    }

    // Delegate other methods to cooperation engine
    get feedbackRegistry() {
        return this.cooperationEngine.feedbackRegistry;
    }

    get config() {
        return this.cooperationEngine.config;
    }

    /**
     * Performs cooperative reasoning where LM and NAL rules enhance each other
     */
    async performCooperativeReasoning(initialTask, ruleEngine, memory, termFactory) {
        return await this.cooperationEngine.performCooperativeReasoning(initialTask, ruleEngine, memory, termFactory);
    }

    /**
     * Applies feedback between rule types
     * For example: if LM generates a result that NAL validates, boost confidence
     */
    applyCrossTypeFeedback(lmResults, nalResults) {
        return this.cooperationEngine.applyCrossTypeFeedback(lmResults, nalResults);
    }

    /**
     * Gets feedback statistics
     */
    getFeedbackStats() {
        return this.cooperationEngine.getFeedbackStats();
    }

    /**
     * Clears feedback history
     */
    clearFeedbackHistory() {
        return this.cooperationEngine.clearFeedbackHistory();
    }

    combineAndFilterResults(results, memory) {
        return this.cooperationEngine.combineAndFilterResults(results, memory);
    }

    // Backward compatibility methods for tests
    _recordFeedbackEvent(result1, result2, type) {
        return this.cooperationEngine.recordFeedbackEvent(result1, result2, type);
    }

    _boostTaskConfidence(task1, task2) {
        return this.cooperationEngine.boostTaskConfidence(task1, task2);
    }

    _termsMatch(term1, term2) {
        return this.cooperationEngine.termsMatch(term1, term2);
    }

    _combineAndFilterResults(results, memory) {
        return this.cooperationEngine.combineAndFilterResults(results, memory);
    }

    _getFeedbackTypeCounts() {
        return this.cooperationEngine.getFeedbackTypeCounts();
    }

    _performDeeperCooperation(tasks, ruleEngine, memory, termFactory) {
        return this.cooperationEngine.performDeeperCooperation(tasks, ruleEngine, memory, termFactory);
    }
}