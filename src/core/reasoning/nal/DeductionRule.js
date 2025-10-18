import {NALRule} from './NALRule.js';
import {RuleUtils} from './RuleUtils.js';

/**
 * Deduction Rule: If <a --> b> and <a> then <b>
 * Implements the fundamental deductive inference in NAL
 */
export class DeductionRule extends NALRule {
    constructor() {
        super('deduction', {
            name: 'Deduction Rule',
            description: 'Performs deductive inference: If <a --> b> and <a> then <b>',
            priority: 0.9,
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

        // Look for a matching statement that has the subject as its term
        const complementaryTasks = RuleUtils.findTasksByTerm(subject, context, this._unify.bind(this));

        for (const compTask of complementaryTasks) {
            const bindings = this._unify(subject, compTask.term);

            if (bindings) {
                const derivedTerm = predicate;
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
}