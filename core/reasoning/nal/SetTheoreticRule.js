import {NALRule} from './NALRule.js';
import {Term} from '../../term/Term.js';

/**
 * Set-Theoretic Rule: Handle set membership and subset relations
 * Implements rules for set operations like extensional and intensional sets
 */
export class SetTheoreticRule extends NALRule {
    constructor() {
        super('set-theoretic', {
            name: 'Set-Theoretic Rule',
            description: 'Performs set-theoretic inferences with extensional and intensional sets',
            priority: 0.7,
            category: 'set-theoretic'
        });
    }

    _matches(task, context) {
        // Matches terms involving set operations (extensional: {}, intensional: [])
        return task.term?.isCompound &&
            (task.term.operator === '{}' || task.term.operator === '[]');
    }

    async _apply(task, context) {
        const results = [];

        if (!task.term?.isCompound) {
            return results;
        }

        // Handle different set operators
        if (task.term.operator === '{}') {
            // Extensional set: {a, b, c}
            const elements = task.term.components;
            for (const element of elements) {
                // For element in extensional set: <element --> {set}> 
                const derivedTerm = new Term('compound', 'INHERITANCE', [element, task.term], '-->');
                const derivedTruth = this._calculateSetMembershipTruth(task.truth, element);

                results.push(this._createDerivedTask(task, {
                    term: derivedTerm,
                    truth: derivedTruth,
                    type: task.type,
                    priority: task.priority * this.priority * 0.8
                }));
            }
        } else if (task.term.operator === '[]') {
            // Intensional set: [a, b, c] 
            const elements = task.term.components;
            for (const element of elements) {
                // For element in intensional set: <[set] --> element>
                const derivedTerm = new Term('compound', 'INHERITANCE', [task.term, element], '-->');
                const derivedTruth = this._calculateSetMembershipTruth(task.truth, element);

                results.push(this._createDerivedTask(task, {
                    term: derivedTerm,
                    truth: derivedTruth,
                    type: task.type,
                    priority: task.priority * this.priority * 0.8
                }));
            }
        }

        return results;
    }

    _calculateSetMembershipTruth(setTruth, element) {
        // For set membership, return a modified truth value
        if (setTruth) {
            return {
                frequency: setTruth.frequency,
                confidence: setTruth.confidence * 0.9 // Slightly reduce confidence for membership derived
            };
        }
        return null;
    }
}