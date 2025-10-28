import {NALRule} from './NALRule.js';
import {Term} from '../../term/Term.js';
import {RuleUtils} from './RuleUtils.js';

/**
 * Comparison Rule: If <a --> c> and <b --> c> then <a <-> b>
 * Implements comparison inference in NAL to determine similarity between terms
 */
export class ComparisonRule extends NALRule {
    constructor() {
        super('comparison', {
            name: 'Comparison Rule',
            description: 'Performs comparison inference: If (a --> c) and (b --> c) then (a <-> b)',
            priority: 0.6,
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

        // Look for tasks with the same predicate but different subjects
        const allTasks = RuleUtils.collectTasks(context);
        const inheritanceTasks = RuleUtils.filterByInheritance(allTasks);

        for (const compTask of inheritanceTasks) {
            if (!compTask.term?.isCompound || compTask.term.operator !== '-->' || compTask.term.components?.length !== 2) {
                continue;
            }

            const [compSubject, compPredicate] = compTask.term.components;

            // Check if the predicates match but subjects are different
            if (this._termsMatch(predicate, compPredicate) && !this._termsMatch(subject, compSubject)) {
                // Create similarity term: <subject <-> compSubject>
                const derivedTerm = new Term('compound', 'SIMILARITY', [subject, compSubject], '<->');
                const derivedTruth = this._calculateTruth(task.truth, compTask.truth);

                results.push(this._createDerivedTask(task, {
                    term: derivedTerm,
                    truth: derivedTruth,
                    type: compTask.type, // Use same type as the complementary task
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