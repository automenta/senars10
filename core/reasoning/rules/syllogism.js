import {NALRule} from '../NALRule.js';
import {Truth} from '../../Truth.js';

/**
 * Implements the inheritance syllogistic deduction rule.
 * Derives (S --> P) from (S --> M) and (M --> P)
 *
 * Premise 1: (S --> M) {f1, c1}
 * Premise 2: (M --> P) {f2, c2}
 * Conclusion: (S --> P) {F_ded}
 */
export class SyllogisticRule extends NALRule {
    constructor(id, premises, conclusion) {
        // The truth function for deduction is passed to the parent constructor.
        super(id, premises, conclusion, (t1, t2) => Truth.deduction(t1, t2));
    }

    /**
     * Creates a new instance of the SyllogisticRule with its
     * specific premise and conclusion patterns.
     *
     * @param {TermFactory} termFactory - The factory to create terms.
     * @returns {SyllogisticRule} A new instance of the rule.
     */
    static create(termFactory) {
        // Create variable terms for the pattern. The '?' prefix is a convention
        // recognized by the unification algorithm.
        const S = termFactory.create('?S');  // Subject
        const M = termFactory.create('?M');  // Middle term
        const P = termFactory.create('?P');  // Predicate

        // Define the premise patterns using the variables.
        // For inheritance syllogism: (S --> M) and (M --> P) => (S --> P)
        const premises = [
            termFactory.create({operator: '-->', components: [S, M]}), // S --> M
            termFactory.create({operator: '-->', components: [M, P]}), // M --> P
        ];

        // Define the conclusion pattern.
        const conclusion = termFactory.create({operator: '-->', components: [S, P]}); // S --> P

        return new SyllogisticRule('syllogism/deduction', premises, conclusion);
    }

    // No _apply method is needed here. The parent NALRule._apply provides the
    // generic mechanism for unification and substitution. The ReasoningStrategy
    // is responsible for finding and feeding the correct premise tasks to the rule.
}
