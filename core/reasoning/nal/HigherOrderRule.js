import {NALRule} from './NALRule.js';
import {Term} from '../../term/Term.js';
import {Truth} from '../../Truth.js';

/**
 * HigherOrderRule: Handles reasoning about higher-order statements and patterns
 * Implements patterns like (A ==> B) ==> C where the implication itself is the subject
 */
export class HigherOrderRule extends NALRule {
    constructor() {
        super('higher-order', {
            name: 'Higher-Order Reasoning Rule',
            description: 'Handles reasoning about higher-order statements and patterns',
            priority: 0.4,
            category: 'higher-order'
        });
    }

    _matches(task, context) {
        // Check if the term is a compound with nested structures that can be treated as terms themselves
        return this._isHigherOrderTerm(task.term);
    }

    _isHigherOrderTerm(term) {
        if (!term?.isCompound) return false;

        // Check if any component is itself a compound that could represent a statement
        for (const component of term.components || []) {
            if (this._representsStatement(component)) {
                return true;
            }
        }

        return false;
    }

    _representsStatement(term) {
        if (!term?.isCompound) return false;

        // Check for NAL statement operators: --> (inheritance), ==> (implication), <=> (equivalence)
        return ['-->', '==>', '<=>'].includes(term.operator);
    }

    async _apply(task, context) {
        const results = [];

        if (!this._isHigherOrderTerm(task.term)) {
            return results;
        }

        // Look for complementary terms that might match within the higher-order structure
        const allTasks = this._collectTasks(context);
        for (const compTask of allTasks) {
            if (compTask === task) continue; // Don't match with itself

            // Attempt to match the outer structure while considering inner statements
            const bindings = this._unify(task.term, compTask.term);
            
            if (bindings) {
                // Create a derived term by substituting bindings
                const derivedTerm = this._substituteVariables(task.term, bindings);
                
                // Calculate truth value for the derived statement
                const derivedTruth = this._calculateTruth(task.truth, compTask.truth);
                
                results.push(this._createDerivedTask(task, {
                    term: derivedTerm,
                    truth: derivedTruth,
                    type: 'belief', // Default to belief type
                    priority: Math.max(task.priority, compTask.priority) * this.priority
                }));
            }
        }

        return results;
    }

    _collectTasks(context) {
        const tasks = [];
        if (context?.memory?.concepts) {
            for (const concept of context.memory.concepts.values()) {
                if (concept.beliefs) {
                    tasks.push(...concept.beliefs);
                }
                if (concept.goals) {
                    tasks.push(...concept.goals);
                }
            }
        }
        return tasks;
    }

    _calculateTruth(truth1, truth2) {
        if (!truth1 || !truth2) {
            return new Truth(0.5, 0.5); // Default truth if not provided
        }

        // Combine truth values using NAL truth-value functions
        // For simplicity here, we'll return a combination of the two
        const frequency = (truth1.frequency + truth2.frequency) / 2;
        const confidence = Math.min(truth1.confidence, truth2.confidence) * 0.9; // Reduce confidence due to combination
        return new Truth(frequency, confidence);
    }

    _substituteVariables(term, bindings) {
        if (!term) return term;

        if (term.name?.startsWith('?') && bindings.has(term.name)) {
            return bindings.get(term.name);
        }

        if (term.isCompound && term.components) {
            const newComponents = term.components.map(comp => this._substituteVariables(comp, bindings));
            // Check if any component changed
            const hasChanges = newComponents.some((comp, idx) => comp !== term.components[idx]);
            if (hasChanges) {
                return new Term(term.type, term.name, newComponents, term.operator);
            }
        }

        return term;
    }
}