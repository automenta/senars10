import {NALRule} from './NALRule.js';
import {Term} from '../../term/Term.js';
import {Truth} from '../../Truth.js';
import {RuleUtils} from './RuleUtils.js';

/**
 * ConditionalRule: Implements advanced conditional reasoning patterns
 * Handles various forms of conditional statements and their interactions
 */
export class ConditionalRule extends NALRule {
    constructor() {
        super('conditional', {
            name: 'Conditional Reasoning Rule',
            description: 'Handles various forms of conditional statements and their interactions',
            priority: 0.6,
            category: 'conditional'
        });
    }

    _matches(task, context) {
        return this._isConditionalTerm(task.term);
    }

    _isConditionalTerm(term) {
        if (!term?.isCompound) return false;

        // Check for conditional operators: implication (==>), equivalence (<=>)
        return term.operator === '==>' || term.operator === '<=>';
    }

    async _apply(task, context) {
        const results = [];

        if (!this._isConditionalTerm(task.term)) {
            return results;
        }

        const allTasks = RuleUtils.collectTasks(context);
        
        for (const compTask of allTasks) {
            if (compTask === task) continue;

            // Handle different conditional reasoning patterns
            if (this._isConditionalTerm(compTask.term)) {
                // Two conditional statements - check for transitivity, syllogisms, etc.
                const conditionalResults = this._applyConditionalToConditional(task, compTask);
                results.push(...conditionalResults);
            } else {
                // One conditional and one non-conditional - check for modus ponens, etc.
                const ponensResults = this._applyConditionalToFact(task, compTask);
                results.push(...ponensResults);
                
                // Also try the reverse order
                const reversePonensResults = this._applyConditionalToFact(compTask, task);
                results.push(...reversePonensResults);
            }
        }

        return results;
    }

    /**
     * Apply conditional reasoning when both terms are conditional statements
     */
    _applyConditionalToConditional(task1, task2) {
        const results = [];

        if (task1.term.operator === '==>' && task2.term.operator === '==>') {
            // Check for transitivity: (A ==> B) and (B ==> C) -> (A ==> C)
            const transitivityResult = this._checkTransitivity(task1.term, task2.term, task1, task2);
            if (transitivityResult) {
                results.push(transitivityResult);
            }

            // Check for contrapositive patterns
            const contrapositiveResult = this._checkContrapositive(task1.term, task2.term, task1, task2);
            if (contrapositiveResult) {
                results.push(contrapositiveResult);
            }
        }

        if (task1.term.operator === '<=>' && task2.term.operator === '<=>') {
            // Handle equivalence relations
            const equivalenceResult = this._checkEquivalenceChain(task1.term, task2.term, task1, task2);
            if (equivalenceResult) {
                results.push(equivalenceResult);
            }
        }

        if ((task1.term.operator === '==>' && task2.term.operator === '<=>') ||
            (task1.term.operator === '<=>' && task2.term.operator === '==>')) {
            // Mixed conditional and equivalence reasoning
            const mixedResult = this._checkMixedConditional(task1.term, task2.term, task1, task2);
            if (mixedResult) {
                results.push(mixedResult);
            }
        }

        return results;
    }

    /**
     * Apply conditional reasoning with a fact: modus ponens, modus tollens, etc.
     */
    _applyConditionalToFact(conditionalTask, factTask) {
        const results = [];

        if (conditionalTask.term.operator === '==>') {
            // Modus ponens: (A ==> B) and A -> B
            const ponensResult = this._applyModusPonens(conditionalTask.term, factTask.term, conditionalTask, factTask);
            if (ponensResult) {
                results.push(ponensResult);
            }

            // Modus tollens: (A ==> B) and ¬B -> ¬A
            const tollensResult = this._applyModusTollens(conditionalTask.term, factTask.term, conditionalTask, factTask);
            if (tollensResult) {
                results.push(tollensResult);
            }
        }

        if (conditionalTask.term.operator === '<=>') {
            // Apply to equivalence
            const equivResult = this._applyToEquivalence(conditionalTask.term, factTask.term, conditionalTask, factTask);
            if (equivResult) {
                results.push(equivResult);
            }
        }

        return results;
    }

    /**
     * Check for transitivity: (A ==> B) and (B ==> C) -> (A ==> C)
     */
    _checkTransitivity(term1, term2, task1, task2) {
        if (term1.components?.length !== 2 || term2.components?.length !== 2) {
            return null;
        }

        const [ant1, cons1] = term1.components;
        const [ant2, cons2] = term2.components;

        // Pattern 1: (A ==> B) and (B ==> C) -> (A ==> C)
        if (this._termsMatch(cons1, ant2)) {
            return this._createDerivedTask(task1, {
                term: new Term('compound', `(==>, ${ant1.name || ant1.toString()}, ${cons2.name || cons2.toString()})`, [ant1, cons2], '==>'),
                truth: this._calculateTransitiveTruth(task1.truth, task2.truth),
                type: task1.type,
                priority: task1.priority * task2.priority * this.priority
            });
        }

        // Pattern 2: (B ==> C) and (A ==> B) -> (A ==> C) (reversed order)
        if (this._termsMatch(cons2, ant1)) {
            return this._createDerivedTask(task1, {
                term: new Term('compound', `(==>, ${ant2.name || ant2.toString()}, ${cons1.name || cons1.toString()})`, [ant2, cons1], '==>'),
                truth: this._calculateTransitiveTruth(task2.truth, task1.truth),
                type: task1.type,
                priority: task1.priority * task2.priority * this.priority
            });
        }

        return null;
    }

    /**
     * Check for contrapositive: (A ==> B) -> (¬B ==> ¬A)
     */
    _checkContrapositive(term1, term2, task1, task2) {
        if (term1.components?.length !== 2 || term2.components?.length !== 2) {
            return null;
        }

        // This is for when we might have specific contrapositive patterns
        // (Currently a placeholder - more complex logic would be needed for full contrapositive)
        
        return null;
    }

    /**
     * Check for equivalence chain: (A <=> B) and (B <=> C) -> (A <=> C)
     */
    _checkEquivalenceChain(term1, term2, task1, task2) {
        if (term1.components?.length !== 2 || term2.components?.length !== 2) {
            return null;
        }

        const [left1, right1] = term1.components;
        const [left2, right2] = term2.components;

        // Pattern 1: (A <=> B) and (B <=> C) -> (A <=> C)
        if (this._termsMatch(right1, left2)) {
            return this._createDerivedTask(task1, {
                term: new Term('compound', `(<=>, ${left1.name || left1.toString()}, ${right2.name || right2.toString()})`, [left1, right2], '<=>'),
                truth: this._calculateTransitiveTruth(task1.truth, task2.truth),
                type: task1.type,
                priority: task1.priority * task2.priority * this.priority
            });
        }

        // Pattern 2: (B <=> C) and (A <=> B) -> (A <=> C) (reversed order)
        if (this._termsMatch(right2, left1)) {
            return this._createDerivedTask(task1, {
                term: new Term('compound', `(<=>, ${left2.name || left2.toString()}, ${right1.name || right1.toString()})`, [left2, right1], '<=>'),
                truth: this._calculateTransitiveTruth(task2.truth, task1.truth),
                type: task1.type,
                priority: task1.priority * task2.priority * this.priority
            });
        }

        return null;
    }

    /**
     * Check for mixed conditional and equivalence
     */
    _checkMixedConditional(term1, term2, task1, task2) {
        // Handle cases where one is implication and one is equivalence
        // For now, this is a placeholder - more complex logic would be needed
        return null;
    }

    /**
     * Apply modus ponens: (A ==> B) and A -> B
     */
    _applyModusPonens(conditionalTerm, factTerm, conditionalTask, factTask) {
        if (conditionalTerm.components?.length !== 2) {
            return null;
        }

        const [antecedent, consequent] = conditionalTerm.components;

        // Check if fact matches antecedent
        if (this._termsMatch(antecedent, factTerm)) {
            return this._createDerivedTask(conditionalTask, {
                term: consequent,
                truth: this._calculateModusPonensTruth(conditionalTask.truth, factTask.truth),
                type: factTask.type,
                priority: conditionalTask.priority * factTask.priority * this.priority
            });
        }

        return null;
    }

    /**
     * Apply modus tollens: (A ==> B) and ¬B -> ¬A
     */
    _applyModusTollens(conditionalTerm, negatedFactTerm, conditionalTask, factTask) {
        if (conditionalTerm.components?.length !== 2) {
            return null;
        }

        const [antecedent, consequent] = conditionalTerm.components;

        // For modus tollens, we'd need to identify a negated form of the consequent
        // This is more complex and would require additional logic for negation handling
        // For now, this is a simplified version

        return null;
    }

    /**
     * Apply reasoning with equivalence
     */
    _applyToEquivalence(equivTerm, factTerm, equivTask, factTask) {
        if (equivTerm.components?.length !== 2) {
            return null;
        }

        const [left, right] = equivTerm.components;

        // If fact matches left side, derive right side
        if (this._termsMatch(left, factTerm)) {
            return this._createDerivedTask(equivTask, {
                term: right,
                truth: this._calculateTruth(equivTask.truth, factTask.truth),
                type: factTask.type,
                priority: equivTask.priority * factTask.priority * this.priority
            });
        }

        // If fact matches right side, derive left side
        if (this._termsMatch(right, factTerm)) {
            return this._createDerivedTask(equivTask, {
                term: left,
                truth: this._calculateTruth(equivTask.truth, factTask.truth),
                type: factTask.type,
                priority: equivTask.priority * factTask.priority * this.priority
            });
        }

        return null;
    }

    _termsMatch(t1, t2) {
        const bindings = this._unify(t1, t2);
        return bindings !== null;
    }

    _calculateTransitiveTruth(truth1, truth2) {
        if (!truth1 || !truth2) {
            return new Truth(0.5, 0.5);
        }

        // Simple combination for transitivity
        const frequency = Math.min(truth1.frequency, truth2.frequency);
        const confidence = truth1.confidence * truth2.confidence;
        return new Truth(frequency, confidence);
    }

    _calculateModusPonensTruth(implicationTruth, factTruth) {
        if (!implicationTruth || !factTruth) {
            return new Truth(0.5, 0.5);
        }

        // In NAL, modus ponens truth calculation depends on both the implication and fact truths
        const frequency = implicationTruth.frequency * factTruth.frequency;
        const confidence = implicationTruth.confidence * factTruth.confidence;
        return new Truth(frequency, confidence);
    }

    _calculateTruth(truth1, truth2) {
        if (!truth1 || !truth2) {
            return new Truth(0.5, 0.5);
        }

        const frequency = (truth1.frequency + truth2.frequency) / 2;
        const confidence = Math.min(truth1.confidence, truth2.confidence) * 0.9;
        return new Truth(frequency, confidence);
    }
}