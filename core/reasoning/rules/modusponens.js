import {NALRule} from '../NALRule.js';
import {Truth} from '../../Truth.js';

/**
 * Implements the Modus Ponens inference rule.
 *
 * Premise 1: (P --> Q) {f1, c1}
 * Premise 2: P {f2, c2}
 * Conclusion: Q {F_ded}
 */
export class ModusPonensRule extends NALRule {
    constructor(id, premises, conclusion) {
        super(id, premises, conclusion, (implicationTruth, antecedentTruth) => {
            // For Modus Ponens: (P ==> Q) and P, derive Q
            // Truth value of implication is used with truth value of antecedent
            // Frequency: f_imp * f_ant
            // Confidence: c_imp * c_ant * f_imp (NAL formula)
            return new Truth(
                implicationTruth.f * antecedentTruth.f,     // f_imp * f_ant
                implicationTruth.c * antecedentTruth.c * implicationTruth.f  // c_imp * c_ant * f_imp
            );
        });
    }

    /**
     * Creates a new instance of the ModusPonensRule with its
     * specific premise and conclusion patterns.
     *
     * @param {TermFactory} termFactory - The factory to create terms.
     * @returns {ModusPonensRule} A new instance of the rule.
     */
    static create(termFactory) {
        const P = termFactory.create('?P');
        const Q = termFactory.create('?Q');

        const premises = [
            termFactory.create({operator: '==>', components: [P, Q]}), // P ==> Q
            P, // P
        ];

        const conclusion = Q; // Q

        return new ModusPonensRule('modusponens/deduction', premises, conclusion);
    }
}
