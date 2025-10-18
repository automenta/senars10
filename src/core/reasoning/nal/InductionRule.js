import {NALRule} from './NALRule.js';
import {Term} from '../../term/Term.js';
import {RuleUtils} from './RuleUtils.js';

export class InductionRule extends NALRule {
    constructor() {
        super('induction', {
            name: 'Induction Rule',
            description: 'Performs inductive inference: If <a --> b> and <b --> a> then <a <-> b>',
            priority: 0.7,
            category: 'syllogistic'
        });
    }

    _matches(task, context) {
        return task.term?.isCompound &&
            task.term.operator === '-->' &&
            task.term.components?.length === 2;
    }

    async _apply(task, context) {
        const results = [];

        if (!task.term?.isCompound || task.term.operator !== '-->' || task.term.components?.length !== 2) {
            return results;
        }

        const [subject, predicate] = task.term.components;

        const allTasks = RuleUtils.collectTasks(context);
        const inheritanceTasks = RuleUtils.filterByInheritance(allTasks);

        for (const compTask of inheritanceTasks) {
            const [compSubject, compPredicate] = compTask.term.components;

            // Check if it's the reverse: <b --> a> where task is <a --> b>
            if (this._termsMatch(compSubject, predicate) && this._termsMatch(compPredicate, subject)) {
                const derivedTerm = new Term('compound', 'SIMILARITY', [subject, predicate], '<->');
                const derivedTruth = this._calculateTruth(task.truth, compTask.truth);

                results.push(this._createDerivedTask(task, {
                    term: derivedTerm,
                    truth: derivedTruth,
                    type: 'BELIEF',
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