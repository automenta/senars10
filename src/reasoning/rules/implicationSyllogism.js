import {NALRule} from '../NALRule.js';
import {Truth} from '../../Truth.js';

/**
 * Implements the implication syllogistic deduction rule.
 * Derives (a ==> c) from (a ==> b) and (b ==> c)
 *
 * Premise 1: (a ==> b) {f1, c1}
 * Premise 2: (b ==> c) {f2, c2}
 * Conclusion: (a ==> c) {F_ded}
 */
export class ImplicationSyllogisticRule extends NALRule {
    constructor(id, premises, conclusion) {
        // The truth function for deduction is passed to the parent constructor.
        super(id, premises, conclusion, (t1, t2) => Truth.deduction(t1, t2));
    }

    /**
     * Creates a new instance of the ImplicationSyllogisticRule with its
     * specific premise and conclusion patterns.
     *
     * @param {TermFactory} termFactory - The factory to create terms.
     * @returns {ImplicationSyllogisticRule} A new instance of the rule.
     */
    static create(termFactory) {
        // Create variable terms for the pattern. The '?' prefix is a convention
        // recognized by the unification algorithm.
        const A = termFactory.create('?A');
        const B = termFactory.create('?B');
        const C = termFactory.create('?C');

        // Define the premise patterns using the variables.
        // For implication syllogism: (A ==> B) and (B ==> C) -> (A ==> C)
        const premises = [
            termFactory.create({operator: '==>', components: [A, B]}), // A ==> B
            termFactory.create({operator: '==>', components: [B, C]}), // B ==> C
        ];

        // Define the conclusion pattern.
        const conclusion = termFactory.create({operator: '==>', components: [A, C]}); // A ==> C

        return new ImplicationSyllogisticRule('syllogism/implication-deduction', premises, conclusion);
    }

    // No _apply method is needed here. The parent NALRule._apply provides the
    // generic mechanism for unification and substitution. The ReasoningStrategy
    // is responsible for finding and feeding the correct premise tasks to the rule.
}