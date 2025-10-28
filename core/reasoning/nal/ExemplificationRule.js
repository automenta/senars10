import {NALRule} from './NALRule.js';
import {Term} from '../../term/Term.js';
import {RuleUtils} from './RuleUtils.js';

/**
 * Exemplification Rule: If <a --> b> and <b --> c> then <c --> a>
 */
export class ExemplificationRule extends NALRule {
    constructor() {
        super('exemplification', {
            name: 'Exemplification Rule',
            description: 'Exemplification: If <a --> b> and <b --> c> then <c --> a>',
            priority: 0.3,
            category: 'syllogistic'
        });
    }

    _matches(task, context) {
        // Apply to inheritance statements <a --> b>
        return task.term?.isCompound &&
            task.term.operator === '-->' &&
            task.term.components?.length === 2;
    }

    async _apply(task, context) {
        const results = [];

        if (!task.term?.isCompound || task.term.operator !== '-->' || task.term.components?.length !== 2) {
            return results;
        }

        const [a, b] = task.term.components;

        // Look for another inheritance statement <b --> c>
        const allTasks = RuleUtils.collectTasks(context);
        const inheritanceTasks = allTasks.filter(t =>
            t.term?.isCompound &&
            t.term.operator === '-->' &&
            t.term.components?.length === 2
        );

        for (const otherTask of inheritanceTasks) {
            const [b2, c] = otherTask.components || otherTask.term.components;

            // Check if b matches b2 (with unification)
            if (this._termsMatch(b, b2)) {
                // Create exemplification: <c --> a>
                const exemplificationTerm = new Term(
                    'compound',
                    `(${c.name} --> ${a.name})`,
                    [c, a],
                    '-->'
                );

                // Calculate truth value using exemplification logic
                const derivedTruth = this._calculateExemplificationTruth(task.truth, otherTask.truth);

                const exemplificationTask = this._createDerivedTask(task, {
                    term: exemplificationTerm,
                    truth: derivedTruth,
                    type: 'BELIEF', // Exemplifications are beliefs
                    priority: task.budget.priority * otherTask.budget.priority * this.priority
                });

                results.push(exemplificationTask);
            }
        }

        return results;
    }

    _termsMatch(t1, t2) {
        const bindings = this._unify(t1, t2);
        return bindings !== null;
    }

    _calculateExemplificationTruth(t1, t2) {
        if (!t1 || !t2) return t1 || t2;

        // Exemplification: frequency and confidence calculations
        const frequency = Math.max(t1.f, t2.f) * 0.8; // Reduced frequency
        const confidence = t1.c * t2.c * 0.3; // Significantly reduced confidence

        return {f: frequency, c: confidence};
    }
}