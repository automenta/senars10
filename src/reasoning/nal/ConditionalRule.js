import {NALRule} from './NALRule.js';
import {Term} from '../../term/Term.js';
import {RuleUtils} from './RuleUtils.js';

/**
 * Conditional Rule: Handle conditional statements in NAL
 * Implements rules for material implication and conditional inference
 */
export class ConditionalRule extends NALRule {
    constructor() {
        super('conditional', {
            name: 'Conditional Rule',
            description: 'Performs conditional inference: If <a ==> b> and <a> then <b> (material implication)',
            priority: 0.8,
            category: 'conditional'
        });
    }

    _matches(task, context) {
        return task.term?.isCompound &&
               (task.term.operator === '==>' || task.term.operator === '<=>') && // Implication or equivalence
               task.term.components?.length === 2;
    }

    async _apply(task, context) {
        const results = [];

        if (!task.term?.isCompound || 
            !['==>', '<=>'].includes(task.term.operator) || 
            task.term.components?.length !== 2) {
            return results;
        }

        const [condition, consequent] = task.term.components;

        // Look for tasks matching the condition
        const allTasks = RuleUtils.collectTasks(context);
        
        // Find tasks that match the condition of the implication
        for (const compTask of allTasks) {
            // Check if compTask term matches the condition of the implication
            if (this._termsMatch(condition, compTask.term)) {
                // Apply modus ponens: from <a ==> b> and <a>, derive <b>
                const derivedTerm = consequent;
                const derivedTruth = this._calculateTruth(task.truth, compTask.truth);

                results.push(this._createDerivedTask(task, {
                    term: derivedTerm,
                    truth: derivedTruth,
                    type: compTask.type, // Use same type as the matching task
                    priority: task.priority * compTask.priority * this.priority
                }));
            }
            
            // Also try the reverse for equivalence: if we have <a <=> b> and <b>, derive <a>
            if (task.term.operator === '<=>' && this._termsMatch(consequent, compTask.term)) {
                const derivedTerm = condition;
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