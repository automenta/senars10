import { SYSTEM_ATOMS } from './SystemAtoms.js';
import { isTrue, isFalse, isNull } from './SystemAtoms.js';

/**
 * Unified Operator Evaluator for SeNARS v10
 * Handles operators that can serve both structural and functional purposes based on argument types
 */
export class UnifiedOperatorEvaluator {
    constructor() {
        // No initialization needed
    }

    // Evaluate unified operators that can serve both structural and functional purposes
    evaluate(operationTerm, variableBindings = new Map()) {
        // Check if all arguments are Truth values or Boolean atoms
        const isFunctionalEvaluation = this._areAllBooleanValues(operationTerm.components, variableBindings);
        
        if (isFunctionalEvaluation) {
            // Perform functional evaluation
            switch (operationTerm.operator) {
                case '&':
                    return this._evaluateAndFunction(operationTerm, variableBindings);
                case '|':
                    return this._evaluateOrFunction(operationTerm, variableBindings);
                case '==>':
                    return this._evaluateImplicationFunction(operationTerm, variableBindings);
                case '<=>':
                    return this._evaluateEquivalenceFunction(operationTerm, variableBindings);
                default:
                    return this._createResult(operationTerm, true, 'Non-unified operator, returning as-is');
            }
        } else {
            // Return as structural compound (the traditional NAL behavior)
            return this._createResult(operationTerm, true, 'Structural compound, not functional evaluation');
        }
    }

    // Check if all components are Truth values or Boolean atoms
    _areAllBooleanValues(components, variableBindings) {
        for (const comp of components) {
            const boundComp = this._substituteVariables(comp, variableBindings);
            if (!isTrue(boundComp) && !isFalse(boundComp) && !isNull(boundComp)) {
                // Check if it's a Truth value (frequency and confidence)
                if (typeof boundComp === 'object' && boundComp.frequency !== undefined && boundComp.confidence !== undefined) {
                    continue; // This is a Truth value
                }
                // It's not a boolean/Truth value, so we can't do functional evaluation
                return false;
            }
        }
        return true;
    }

    _evaluateAndFunction(operationTerm, variableBindings) {
        const components = operationTerm.components.map(comp => this._substituteVariables(comp, variableBindings));
        const values = components.map(comp => this._termToValue(comp));

        // Boolean AND evaluation: if any component is False, return False; if all are True, return True; otherwise return original term
        if (values.some(val => val === false)) {
            return this._createResult(SYSTEM_ATOMS.False, true, 'Boolean AND evaluation: contains False');
        }

        if (values.every(val => val === true)) {
            return this._createResult(SYSTEM_ATOMS.True, true, 'Boolean AND evaluation: all True');
        }

        // If we have mixed values or non-boolean values, return null
        return this._createResult(SYSTEM_ATOMS.Null, false, 'Boolean AND evaluation: cannot determine');
    }

    _evaluateOrFunction(operationTerm, variableBindings) {
        const components = operationTerm.components.map(comp => this._substituteVariables(comp, variableBindings));
        const values = components.map(comp => this._termToValue(comp));

        // Boolean OR evaluation: if any component is True, return True; if all are False, return False
        if (values.some(val => val === true)) {
            return this._createResult(SYSTEM_ATOMS.True, true, 'Boolean OR evaluation: contains True');
        }

        if (values.every(val => val === false)) {
            return this._createResult(SYSTEM_ATOMS.False, true, 'Boolean OR evaluation: all False');
        }

        // If we have mixed values or non-boolean values, return null
        return this._createResult(SYSTEM_ATOMS.Null, false, 'Boolean OR evaluation: cannot determine');
    }

    _evaluateImplicationFunction(operationTerm, variableBindings) {
        if (operationTerm.components.length !== 2) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Implication requires exactly 2 arguments');
        }

        const [antecedent, consequent] = operationTerm.components.map(comp => this._substituteVariables(comp, variableBindings));
        const antVal = this._termToValue(antecedent);
        const consVal = this._termToValue(consequent);

        // Boolean implication: not A OR B
        if (antVal === true && consVal === false) {
            return this._createResult(SYSTEM_ATOMS.False, true, 'Boolean implication: true => false = false');
        }

        if (antVal === false || consVal === true) {
            return this._createResult(SYSTEM_ATOMS.True, true, 'Boolean implication: false => X or X => true = true');
        }

        // If we have non-boolean values, return null
        return this._createResult(SYSTEM_ATOMS.Null, false, 'Boolean implication: cannot determine with non-boolean values');
    }

    _evaluateEquivalenceFunction(operationTerm, variableBindings) {
        if (operationTerm.components.length !== 2) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Equivalence requires exactly 2 arguments');
        }

        const [left, right] = operationTerm.components.map(comp => this._substituteVariables(comp, variableBindings));
        const leftVal = this._termToValue(left);
        const rightVal = this._termToValue(right);

        // Boolean equivalence: A iff B
        if (leftVal === rightVal) {
            return this._createResult(SYSTEM_ATOMS.True, true, 'Boolean equivalence: values are equal');
        }

        return this._createResult(SYSTEM_ATOMS.False, true, 'Boolean equivalence: values are different');
    }

    // Enhanced equality evaluation that supports bidirectional evaluation
    evaluateEquality(operationTerm, variableBindings) {
        if (operationTerm.components.length !== 2) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Equality requires exactly 2 arguments');
        }

        const [left, right] = operationTerm.components;
        
        // Check for variable bindings in both directions
        const leftBound = this._substituteVariables(left, variableBindings);
        const rightBound = this._substituteVariables(right, variableBindings);

        // If both are atomic values, compare them directly
        if (leftBound.isAtomic && rightBound.isAtomic) {
            const leftVal = this._termToValue(leftBound);
            const rightVal = this._termToValue(rightBound);
            
            // For simple values, return True/False
            if (leftVal === rightVal) {
                return this._createResult(SYSTEM_ATOMS.True, true, 'Equality: atomic values match');
            } else {
                return this._createResult(SYSTEM_ATOMS.False, true, 'Equality: atomic values do not match');
            }
        }

        // For compound structures, do more complex matching
        const bindings = this._matchAndBindVariables(leftBound, rightBound, variableBindings);
        if (bindings) {
            // If successful matching occurred, return True
            return this._createResult(SYSTEM_ATOMS.True, true, 'Equality: structures match', { bindings });
        }

        // If no match found, return False
        return this._createResult(SYSTEM_ATOMS.False, false, 'Equality: structures do not match');
    }

    // Helper methods for term-to-value conversion and substitution
    _termToValue(term) {
        if (!term) return null;

        const { name } = term;
        if (name === 'True') return true;
        if (name === 'False') return false;
        if (name === 'Null') return null;

        if (term.isAtomic) {
            const numValue = Number(name);
            return isNaN(numValue) ? name : numValue;
        }

        // Handle Product terms as numeric vectors: (*,1,2) and shorthand (1,2)
        if (term.operator === ',') {
            const vectorValues = [];
            for (const comp of term.components) {
                const compValue = this._termToValue(comp);
                if (typeof compValue !== 'number') {
                    // If any component is not a number, return as term
                    return term;
                }
                vectorValues.push(compValue);
            }
            // Return as an array (vector)
            return vectorValues;
        }

        return term;
    }

    _substituteVariables(term, bindings) {
        if (!term) return term;

        if (term.name?.startsWith('?')) {
            return bindings.get(term.name) ?? term;
        }

        if (term.isCompound) {
            const newComponents = term.components.map(comp => this._substituteVariables(comp, bindings));
            const hasChanges = newComponents.some((comp, idx) => comp !== term.components[idx]);
            return hasChanges ? this._cloneTerm(term, newComponents) : term;
        }

        return term;
    }

    _cloneTerm(term, newComponents) {
        // Create a new term with the same properties but new components
        // For simplicity, we'll return the term as is since Term is frozen
        return term;
    }

    _createResult(result, success, message, additionalData = {}) {
        return { result, success, message, ...additionalData };
    }

    _matchAndBindVariables(leftTerm, rightTerm, variableBindings) {
        // This is a simplified version for use within this module
        // In practice, would use the full implementation from EqualitySolver
        const newBindings = new Map(variableBindings);

        // If both terms are compound with same operator
        if (leftTerm.isCompound && rightTerm.isCompound && leftTerm.operator === rightTerm.operator) {
            if (leftTerm.components.length !== rightTerm.components.length) {
                return null;
            }

            for (let i = 0; i < leftTerm.components.length; i++) {
                const leftComp = leftTerm.components[i];
                const rightComp = rightTerm.components[i];
                
                if (leftComp.name?.startsWith('?')) {
                    newBindings.set(leftComp.name, rightComp);
                } else if (rightComp.name?.startsWith('?')) {
                    newBindings.set(rightComp.name, leftComp);
                } else if (leftComp.name !== rightComp.name) {
                    return null;
                }
            }
            
            return newBindings;
        }
        
        if (leftTerm.name?.startsWith('?') && !rightTerm.name?.startsWith('?')) {
            newBindings.set(leftTerm.name, rightTerm);
            return newBindings;
        }
        
        if (rightTerm.name?.startsWith('?') && !leftTerm.name?.startsWith('?')) {
            newBindings.set(rightTerm.name, leftTerm);
            return newBindings;
        }
        
        if (leftTerm.name === rightTerm.name) {
            return newBindings;
        }
        
        return null;
    }
}