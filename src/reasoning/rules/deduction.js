import {NALRule} from '../NALRule.js';
import {TruthFunctions} from '../../term/operations.js';
import {Term} from '../../term/Term.js';

export class DeductionRule extends NALRule {
    constructor() {
        const premises = [
            new Term('compound', 'IMPLICATION', [
                new Term('atom', 'S'),
                new Term('atom', 'P')
            ], '-->'),
            new Term('compound', 'IMPLICATION', [
                new Term('atom', 'S'),
                new Term('atom', 'M')
            ], '-->')
        ];

        const conclusion = new Term('compound', 'IMPLICATION', [
            new Term('atom', 'P'),
            new Term('atom', 'M')
        ], '-->');

        super('deduction', premises, conclusion, TruthFunctions.deduction, 0.8);
    }

    _matches(task) {
        return task.term.isCompound &&
            task.term.operator === '-->' &&
            super._matches(task);
    }

    async _deriveFromPremise(premise, task) {
        const bindings = this._unifyPatterns(premise, task.term);
        if (!bindings) return [];

        const complementaryPremise = this._findComplementaryPremise(task, bindings);
        if (!complementaryPremise) return [];

        const derivedTerm = this._substituteVariables(this._conclusion, bindings);
        const derivedTruth = this._computeDeductionTruth(task.truth, complementaryPremise.truth);

        if (!derivedTerm || !derivedTruth) return [];

        return [{
            term: derivedTerm,
            truth: derivedTruth,
            type: 'BELIEF',
            stamp: task.stamp,
            priority: task.priority * this.priority
        }];
    }

    _findComplementaryPremise(task, bindings) {
        return null;
    }

    _computeDeductionTruth(truth1, truth2) {
        if (!truth1 || !truth2) return truth1;
        return TruthFunctions.deduction(truth1, truth2);
    }
}