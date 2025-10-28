import {NALRule} from './NALRule.js';
import {Term} from '../../term/Term.js';
import {RuleUtils} from './RuleUtils.js';

/**
 * Conjunction Rule: Combines multiple beliefs into compound statements
 */
export class ConjunctionRule extends NALRule {
    constructor() {
        super('conjunction', {
            name: 'Conjunction Rule',
            description: 'Forms compound statements using conjunction: If <a> and <b> then <(&, a, b)>',
            priority: 0.6,
            category: 'compound'
        });
    }

    _matches(task, context) {
        // Match when there are other tasks available to form conjunctions with
        const allTasks = RuleUtils.collectTasks(context);
        return allTasks.length > 1 && task.term?.isAtomic;
    }

    async _apply(task, context) {
        const results = [];
        const allTasks = RuleUtils.collectTasks(context);

        // Only process belief tasks when the current task is also a belief
        const beliefTasks = allTasks.filter(t => t.type === 'BELIEF');

        for (const otherTask of beliefTasks) {
            if (otherTask !== task) {  // Don't form conjunction with itself
                // Create a conjunction term: (&, task.term, otherTask.term)
                const conjunctionTerm = new Term(
                    'compound',
                    `(&,${task.term.name},${otherTask.term.name})`,
                    [task.term, otherTask.term],
                    '&'
                );

                // Calculate truth value using conjunction logic
                const derivedTruth = this._calculateConjunctionTruth(task.truth, otherTask.truth);

                const conjunctionTask = this._createDerivedTask(task, {
                    term: conjunctionTerm,
                    truth: derivedTruth,
                    type: 'BELIEF',
                    priority: (task.budget.priority + otherTask.budget.priority) / 2 * this.priority
                });

                results.push(conjunctionTask);
            }
        }

        return results;
    }

    _calculateConjunctionTruth(t1, t2) {
        if (!t1 || !t2) return t1 || t2;

        // Conjunction: frequency is min of both, confidence is product of both
        const frequency = Math.min(t1.f, t2.f);
        const confidence = t1.c * t2.c;

        return {f: frequency, c: confidence};
    }
}