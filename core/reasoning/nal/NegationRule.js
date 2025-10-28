import {NALRule} from './NALRule.js';
import {Term} from '../../term/Term.js';

/**
 * Negation Rule: Creates negated statements
 */
export class NegationRule extends NALRule {
    constructor() {
        super('negation', {
            name: 'Negation Rule',
            description: 'Creates negated statements: If <a> then <(--, a)>',
            priority: 0.5,
            category: 'compound'
        });
    }

    _matches(task, context) {
        // Apply to atomic tasks that are not already negations
        return task.term?.isAtomic && !task.term.name.startsWith('--');
    }

    async _apply(task, context) {
        const results = [];

        if (task.term?.isAtomic) {
            // Create a negation term: (--, task.term)
            const negationTerm = new Term(
                'compound',
                `(--,${task.term.name})`,
                [task.term],
                '--'
            );

            // Calculate truth value using negation logic
            const derivedTruth = this._calculateNegationTruth(task.truth);

            const negationTask = this._createDerivedTask(task, {
                term: negationTerm,
                truth: derivedTruth,
                type: task.type, // Preserve the original task type
                priority: task.budget.priority * this.priority
            });

            results.push(negationTask);
        }

        return results;
    }

    _calculateNegationTruth(truth) {
        if (!truth) return {f: 0.5, c: 0.9}; // Default truth for unknown

        // Negation: flip frequency, preserve confidence
        const frequency = 1 - truth.f;
        const confidence = truth.c;

        return {f: frequency, c: confidence};
    }
}