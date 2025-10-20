import {RuleCooperationManager} from '../../../src/reasoning/RuleCooperationManager.js';
import {RuleEngine} from '../../../src/reasoning/RuleEngine.js';
import {Task} from '../../../src/task/Task.js';
import {Term} from '../../../src/term/Term.js';
import {Truth} from '../../../src/Truth.js';

describe('RuleCooperationManager', () => {
    let cooperationManager;
    let ruleEngine;

    beforeEach(() => {
        cooperationManager = new RuleCooperationManager();
        ruleEngine = new RuleEngine();
    });

    test('should perform cooperative reasoning between rule types', async () => {
        const mockTask = new Task({
            term: new Term('atomic', 'test'),
            truth: new Truth(0.8, 0.9),
            budget: {priority: 0.7, durability: 0.5, quality: 0.6}
        });

        // Create a spy on rule engine methods
        const originalApplyLMRules = ruleEngine.applyLMRules;
        ruleEngine.applyLMRules = (task) => [
            {term: new Term('atomic', 'lm-result'), truth: new Truth(0.7, 0.8), _ruleType: 'LM'}
        ];

        const originalApplyNALRules = ruleEngine.applyNALRules;
        ruleEngine.applyNALRules = (task) => [
            {term: new Term('atomic', 'nal-result'), truth: new Truth(0.6, 0.7), _ruleType: 'NAL'}
        ];

        const mockMemory = {};
        const mockTermFactory = {};

        const result = await cooperationManager.performCooperativeReasoning(
            mockTask,
            ruleEngine,
            mockMemory,
            mockTermFactory
        );

        expect(result.initialTask).toBe(mockTask);
        expect(result.lmGenerated.length).toBe(1);
        expect(result.nalGenerated.length).toBe(1);
        expect(Array.isArray(result.finalResults)).toBe(true);

        // Restore original functions
        ruleEngine.applyLMRules = originalApplyLMRules;
        ruleEngine.applyNALRules = originalApplyNALRules;
    });

    test('should apply cross-type feedback correctly', () => {
        const lmResults = [
            {
                term: new Term('atomic', 'same-term'),
                truth: new Truth(0.7, 0.6),
                _ruleType: 'LM'
            }
        ];

        const nalResults = [
            {
                term: new Term('atomic', 'same-term'),
                truth: new Truth(0.8, 0.7),
                _ruleType: 'NAL'
            }
        ];

        const feedbackResults = cooperationManager.applyCrossTypeFeedback(lmResults, nalResults);

        // Should have enhanced confidence due to matching terms
        expect(feedbackResults.length).toBeGreaterThan(0);
        expect(feedbackResults[0].truth.c).toBeGreaterThan(0.7); // Higher than individual confidences
    });

    test('should record feedback events', () => {
        const lmResult = {term: new Term('atomic', 'test1'), truth: new Truth(0.5, 0.5)};
        const nalResult = {term: new Term('atomic', 'test1'), truth: new Truth(0.6, 0.6)};

        // Access private method to test feedback recording
        cooperationManager._recordFeedbackEvent(lmResult, nalResult, 'cross_validation');

        const stats = cooperationManager.getFeedbackStats();
        expect(stats.totalFeedbackEvents).toBe(1);
        expect(stats.feedbackTypes['cross_validation']).toBe(1);
    });

    test('should boost task confidence when validated by both rule types', () => {
        const task1 = {
            term: new Term('atomic', 'test'),
            truth: new Truth(0.7, 0.6),
            priority: 0.5
        };

        const task2 = {
            term: new Term('atomic', 'test'), // Same term for matching
            truth: new Truth(0.8, 0.7),
            priority: 0.5
        };

        const enhanced = cooperationManager._boostTaskConfidence(task1, task2);

        // Combined frequency should be average
        expect(enhanced.truth.f).toBeCloseTo(0.75); // (0.7 + 0.8) / 2
        // Combined confidence should be higher (sum, but capped)
        expect(enhanced.truth.c).toBeGreaterThan(0.6); // Higher than individual confidence
    });

    test('should match terms correctly', () => {
        const term1 = new Term('atomic', 'test');
        const term2 = new Term('atomic', 'test');
        const term3 = new Term('atomic', 'different');

        expect(cooperationManager._termsMatch(term1, term2)).toBe(true);
        expect(cooperationManager._termsMatch(term1, term3)).toBe(false);
        expect(cooperationManager._termsMatch(null, term1)).toBe(false);
        expect(cooperationManager._termsMatch(term1, null)).toBe(false);
    });

    test('should filter results by confidence threshold', () => {
        cooperationManager.config.confidenceThreshold = 0.5;

        const results = [
            {truth: new Truth(0.8, 0.4)}, // Below threshold
            {truth: new Truth(0.7, 0.6)}, // Above threshold
            {truth: new Truth(0.9, 0.8)}  // Above threshold
        ];

        const filtered = cooperationManager._combineAndFilterResults(
            {lmGenerated: [], nalGenerated: [], crossValidated: results},
            {}
        );

        expect(filtered.length).toBe(2); // Only the 2 high-confidence results
    });
});