import {NALRule} from './NALRule.js';
import {RuleUtils} from './RuleUtils.js';

/**
 * Evaluation Rule: If <a> and <a --> b> then <b>
 * Note: This is similar to deduction but with different semantics
 */
export class EvaluationRule extends NALRule {
    constructor() {
        super('evaluation', {
            name: 'Evaluation Rule',
            description: 'Evaluates statements: If <a> and <a --> b> then <b>',
            priority: 0.8,
            category: 'syllogistic'
        });
    }

    _matches(task, context) {
        // Apply to atomic tasks that could be subjects in inheritance relationships
        return task.term?.isAtomic;
    }

    async _apply(task, context) {
        const results = [];

        // Look for inheritance statements <task --> X> where task is the subject
        const allTasks = RuleUtils.collectTasks(context);
        const inheritanceTasks = allTasks.filter(t =>
            t.term?.isCompound &&
            t.term.operator === '-->' &&
            t.term.components?.length === 2
        );

        for (const inheritanceTask of inheritanceTasks) {
            const [subject, predicate] = inheritanceTask.term.components;

            // Check if the subject matches our current task (with unification)
            const bindings = this._unify(subject, task.term);

            if (bindings) {
                // The result would be the predicate
                const resultTerm = this._substitute(predicate, bindings);

                // Calculate truth value using evaluation logic (similar to deduction)
                const derivedTruth = this._calculateEvaluationTruth(task.truth, inheritanceTask.truth);

                const evaluationTask = this._createDerivedTask(task, {
                    term: resultTerm,
                    truth: derivedTruth,
                    type: inheritanceTask.type, // Use same type as the inheritance statement
                    priority: task.budget.priority * inheritanceTask.budget.priority * this.priority
                });

                results.push(evaluationTask);
            }
        }

        return results;
    }

    _calculateEvaluationTruth(t1, t2) {
        if (!t1 || !t2) return t1 || t2;

        // Similar to deduction: combine truth values
        const frequency = t1.f * t2.f;
        const confidence = t1.c * t2.c;

        return {f: frequency, c: confidence};
    }
}