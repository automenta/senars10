import {NALRule} from '../NALRule.js';
import {Truth} from '../../Truth.js';

/**
 * Implements the similarity syllogistic rule.
 * Derives (S <-> P) from (S <-> M) and (M <-> P)
 *
 * Premise 1: (S <-> M) {f1, c1}
 * Premise 2: (M <-> P) {f2, c2}
 * Conclusion: (S <-> P) {F_ded}
 */
export class SimilaritySyllogism extends NALRule {
    constructor(id, premises, conclusion) {
        super(id, premises, conclusion, (t1, t2) => Truth.analogy(t1, t2));
    }

    /**
     * Creates a new instance of the SimilaritySyllogism rule with its
     * specific premise and conclusion patterns.
     *
     * @param {TermFactory} termFactory - The factory to create terms.
     * @returns {SimilaritySyllogism} A new instance of the rule.
     */
    static create(termFactory) {
        // Use variable names whose alphabetical order matches the desired term structure
        // to avoid canonicalization reordering the premise patterns.
        const A = termFactory.create('?A'); // Subject
        const B = termFactory.create('?B'); // Middle
        const C = termFactory.create('?C'); // Predicate

        const premises = [
            termFactory.create({operator: '<->', components: [A, B]}),
            termFactory.create({operator: '<->', components: [B, C]}),
        ];

        const conclusion = termFactory.create({operator: '<->', components: [A, C]});

        return new SimilaritySyllogism('syllogism/similarity', premises, conclusion);
    }
}
