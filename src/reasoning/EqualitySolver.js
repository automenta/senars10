import { SYSTEM_ATOMS } from './SystemAtoms.js';
import { TermFactory } from '../term/TermFactory.js';

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
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Invalid equality format');
        }

        const [leftSide, rightSide] = equalityTerm.components;
        
        // Get all variable bindings from matching the two sides
        const bindings = this._matchAndBindVariables(leftSide, rightSide, variableBindings);
        if (bindings) {
            return this._createResult(null, true, 'Equality solved', { bindings });
        }

        return this._createResult(SYSTEM_ATOMS.Null, false, 'Could not solve equality');
    }

    // Enhanced method to match and bind variables in compound structures
    _matchAndBindVariables(leftTerm, rightTerm, variableBindings) {
        // This handles cases like (?x, ?y) = (3, 4) → bindings ?x=3, ?y=4
        // or (f(?x), g(?y)) = (f(3), g(5)) → ?x=3, ?y=5
        // or (a, ?x, c) = (a, b, c) → ?x=b
        
        const newBindings = new Map(variableBindings);

        // If both terms are compound with same operator
        if (leftTerm.isCompound && rightTerm.isCompound && leftTerm.operator === rightTerm.operator) {
            if (leftTerm.components.length !== rightTerm.components.length) {
                // Cannot match terms with different numbers of components
                return null;
            }

            // Recursively match each component
            for (let i = 0; i < leftTerm.components.length; i++) {
                const leftComp = leftTerm.components[i];
                const rightComp = rightTerm.components[i];
                
                if (leftComp.name?.startsWith('?')) {
                    // Left component is a variable, bind it to the right component
                    newBindings.set(leftComp.name, rightComp);
                } else if (rightComp.name?.startsWith('?')) {
                    // Right component is a variable, bind it to the left component
                    newBindings.set(rightComp.name, leftComp);
                } else if (leftComp.isCompound && rightComp.isCompound) {
                    // Both components are compound, recursively match them
                    const subBindings = this._matchAndBindVariables(leftComp, rightComp, newBindings);
                    if (subBindings) {
                        // Merge the sub-bindings into our current bindings
                        for (const [varName, value] of subBindings) {
                            newBindings.set(varName, value);
                        }
                    } else {
                        // Sub-match failed, return null
                        return null;
                    }
                } else if (leftComp.name !== rightComp.name) {
                    // Atomic terms don't match, return null
                    return null;
                }
            }
            
            return newBindings;
        }
        
        // If one term is a variable and the other is not
        if (leftTerm.name?.startsWith('?') && !rightTerm.name?.startsWith('?')) {
            newBindings.set(leftTerm.name, rightTerm);
            return newBindings;
        }
        
        if (rightTerm.name?.startsWith('?') && !leftTerm.name?.startsWith('?')) {
            newBindings.set(rightTerm.name, leftTerm);
            return newBindings;
        }
        
        // If both are atomic and equal
        if (leftTerm.name === rightTerm.name) {
            return newBindings;
        }
        
        // No match found
        return null;
    }

    // Solve equation involving equality
    solveEquation(leftTerm, rightTerm, variableName, variableBindings = new Map()) {
        // Handle equality operator (=) for back-solving
        if (leftTerm.isCompound && leftTerm.operator === '=') {
            // For equality, we pass the equality term as left, and null as right (since right is already part of the equality)
            return this._solveEqualityEquation(leftTerm, rightTerm, variableName, variableBindings);
        }

        if (leftTerm.name?.startsWith('?') && leftTerm.name === variableName) {
            return this._createResult(rightTerm, true, 'Direct variable assignment', { solvedVariable: variableName });
        }

        return this._createResult(SYSTEM_ATOMS.Null, false, 'No back-solving pattern matched');
    }

    _solveEqualityEquation(equalityTerm, targetTerm, variableName, variableBindings) {
        if (!equalityTerm.isCompound || equalityTerm.operator !== '=' || equalityTerm.components.length !== 2) {
            return this._createResult(SYSTEM_ATOMS.Null, false, 'Invalid equality format for equation solving');
        }

        const [leftSide, rightSide] = equalityTerm.components;
        
        // Check for direct variable assignment in left side
        if (leftSide.name?.startsWith('?') && leftSide.name === variableName) {
            // If left side is the variable being solved for, return the right side
            return this._createResult(rightSide, true, 'Variable found on left side of equality', { solvedVariable: variableName });
        }

        // Check for direct variable assignment in right side
        if (rightSide.name?.startsWith('?') && rightSide.name === variableName) {
            // If right side is the variable being solved for, return the left side
            return this._createResult(leftSide, true, 'Variable found on right side of equality', { solvedVariable: variableName });
        }

        // Perform bidirectional matching and variable binding
        const bindings = this._matchAndBindVariables(leftSide, rightSide, variableBindings);
        if (bindings && bindings.has(variableName)) {
            const boundValue = bindings.get(variableName);
            return this._createResult(boundValue, true, 'Variable found through bidirectional matching', { solvedVariable: variableName });
        }

        return this._createResult(SYSTEM_ATOMS.Null, false, 'Target variable not found in equality expression');
    }

    _createResult(result, success, message, additionalData = {}) {
        return { result, success, message, ...additionalData };
    }
}