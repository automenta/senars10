import { SYSTEM_ATOMS } from './SystemAtoms.js';
import { TermFactory } from '../term/TermFactory.js';
import { VariableBindingUtils } from './VariableBindingUtils.js';

/**
 * Equality Solver Module for SeNARS v10
 * Handles equality evaluation and variable binding
 */
export class EqualitySolver {
    constructor(termFactory = null) {
        this.termFactory = termFactory || new TermFactory();
    }

    // Solve equality equations and return all variable bindings
    solveEquality(equalityTerm, variableBindings = new Map()) {
        if (!equalityTerm.isCompound || equalityTerm.operator !== '=' || equalityTerm.components.length !== 2) {
            return VariableBindingUtils.createResult(SYSTEM_ATOMS.Null, false, 'Invalid equality format');
        }

        const [leftSide, rightSide] = equalityTerm.components;
        
        // Get all variable bindings from matching the two sides
        const bindings = VariableBindingUtils.matchAndBindVariables(leftSide, rightSide, variableBindings);
        if (bindings) {
            return VariableBindingUtils.createResult(null, true, 'Equality solved', { bindings });
        }

        return VariableBindingUtils.createResult(SYSTEM_ATOMS.Null, false, 'Could not solve equality');
    }



    // Solve equation involving equality
    solveEquation(leftTerm, rightTerm, variableName, variableBindings = new Map()) {
        // Handle equality operator (=) for back-solving
        if (leftTerm.isCompound && leftTerm.operator === '=') {
            // For equality, we pass the equality term as left, and null as right (since right is already part of the equality)
            return this._solveEqualityEquation(leftTerm, rightTerm, variableName, variableBindings);
        }

        if (leftTerm.name?.startsWith('?') && leftTerm.name === variableName) {
            return VariableBindingUtils.createResult(rightTerm, true, 'Direct variable assignment', { solvedVariable: variableName });
        }

        return VariableBindingUtils.createResult(SYSTEM_ATOMS.Null, false, 'No back-solving pattern matched');
    }

    _solveEqualityEquation(equalityTerm, targetTerm, variableName, variableBindings) {
        if (!equalityTerm.isCompound || equalityTerm.operator !== '=' || equalityTerm.components.length !== 2) {
            return VariableBindingUtils.createResult(SYSTEM_ATOMS.Null, false, 'Invalid equality format for equation solving');
        }

        const [leftSide, rightSide] = equalityTerm.components;
        
        // Check for direct variable assignment in left side
        if (leftSide.name?.startsWith('?') && leftSide.name === variableName) {
            // If left side is the variable being solved for, return the right side
            return VariableBindingUtils.createResult(rightSide, true, 'Variable found on left side of equality', { solvedVariable: variableName });
        }

        // Check for direct variable assignment in right side
        if (rightSide.name?.startsWith('?') && rightSide.name === variableName) {
            // If right side is the variable being solved for, return the left side
            return VariableBindingUtils.createResult(leftSide, true, 'Variable found on right side of equality', { solvedVariable: variableName });
        }

        // Perform bidirectional matching and variable binding
        const bindings = VariableBindingUtils.matchAndBindVariables(leftSide, rightSide, variableBindings);
        if (bindings && bindings.has(variableName)) {
            const boundValue = bindings.get(variableName);
            return VariableBindingUtils.createResult(boundValue, true, 'Variable found through bidirectional matching', { solvedVariable: variableName });
        }

        return VariableBindingUtils.createResult(SYSTEM_ATOMS.Null, false, 'Target variable not found in equality expression');
    }


}