import {NALRule} from './NALRule.js';
import {Term} from '../../term/Term.js';
import {RuleUtils} from './RuleUtils.js';

/**
 * Temporal Deduction Rule: Handle temporal relationships between events
 * Implements temporal reasoning with before/after relationships
 */
export class TemporalDeductionRule extends NALRule {
    constructor() {
        super('temporal-deduction', {
            name: 'Temporal Deduction Rule',
            description: 'Performs temporal deduction: If (a ==> b) and (b ==> c) then (a ==> c) (transitivity)',
            priority: 0.5,
            category: 'temporal'
        });
    }

    _matches(task, context) {
        return task.term?.isCompound &&
            (task.term.operator === '==>' || task.term.operator === '<=>') && // Implication or equivalence for temporal relations
            task.term.components?.length === 2;
    }

    async _apply(task, context) {
        const results = [];

        if (!task.term?.isCompound ||
            !['==>', '<=>'].includes(task.term.operator) ||
            task.term.components?.length !== 2) {
            return results;
        }

        const [firstEvent, secondEvent] = task.term.components;

        // Look for complementary temporal tasks
        const allTasks = RuleUtils.collectTasks(context);
        const temporalTasks = allTasks.filter(t => t.term?.isCompound &&
            ['==>', '<=>'].includes(t.term.operator) &&
            t.term.components?.length === 2);

        for (const compTask of temporalTasks) {
            const [compFirst, compSecond] = compTask.term.components;

            // Look for transitivity: task is (a ==> b), compTask is (b ==> c), derive (a ==> c)
            if (this._termsMatch(secondEvent, compFirst)) {
                const derivedTerm = new Term('compound', 'SEQUENTIAL', [firstEvent, compSecond], task.term.operator);
                const derivedTruth = this._calculateTruth(task.truth, compTask.truth);

                results.push(this._createDerivedTask(task, {
                    term: derivedTerm,
                    truth: derivedTruth,
                    type: compTask.type,
                    priority: task.priority * compTask.priority * this.priority
                }));
            }
            // Also check reverse: task is (a ==> b), compTask is (c ==> a), derive (c ==> b)
            else if (this._termsMatch(firstEvent, compSecond)) {
                const derivedTerm = new Term('compound', 'SEQUENTIAL', [compFirst, secondEvent], task.term.operator);
                const derivedTruth = this._calculateTruth(task.truth, compTask.truth);

                results.push(this._createDerivedTask(task, {
                    term: derivedTerm,
                    truth: derivedTruth,
                    type: compTask.type,
                    priority: task.priority * compTask.priority * this.priority
                }));
            }
        }

        return results;
    }

    _termsMatch(t1, t2) {
        const bindings = this._unify(t1, t2);
        return bindings !== null;
    }
}