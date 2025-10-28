import { isTrue, isFalse, isNull, SYSTEM_ATOMS } from './SystemAtoms.js';

/**
 * Variable Binding Utilities for SeNARS v10
 * Shared utilities for matching and binding variables between terms
 */
export class VariableBindingUtils {
    
    /**
     * Enhanced method to match and bind variables in compound structures
     * This handles cases like (?x, ?y) = (3, 4) → bindings ?x=3, ?y=4
     * or (f(?x), g(?y)) = (f(3), g(5)) → ?x=3, ?y=5
     * or (a, ?x, c) = (a, b, c) → ?x=b
     */
    static matchAndBindVariables(leftTerm, rightTerm, variableBindings) {
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
                    const subBindings = VariableBindingUtils.matchAndBindVariables(leftComp, rightComp, newBindings);
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
    
    /**
     * Advanced pattern matching for higher-order reasoning
     * This handles cases where variables can match complex patterns, not just simple terms
     */
    static matchAndBindHigherOrder(leftTerm, rightTerm, variableBindings) {
        const newBindings = new Map(variableBindings);

        // Handle higher-order matching where a variable might match a complex pattern
        if (leftTerm.name?.startsWith('?') && !rightTerm.name?.startsWith('?')) {
            // Left term is a variable, bind it to the right term (which could be complex)
            newBindings.set(leftTerm.name, rightTerm);
            return newBindings;
        }
        
        if (rightTerm.name?.startsWith('?') && !leftTerm.name?.startsWith('?')) {
            // Right term is a variable, bind it to the left term (which could be complex)
            newBindings.set(rightTerm.name, leftTerm);
            return newBindings;
        }
        
        // If both terms are compound with same operator, try matching
        if (leftTerm.isCompound && rightTerm.isCompound && leftTerm.operator === rightTerm.operator) {
            if (leftTerm.components.length !== rightTerm.components.length) {
                return null;
            }

            // Match components with support for pattern variables
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
                    const subBindings = VariableBindingUtils.matchAndBindHigherOrder(leftComp, rightComp, newBindings);
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
                    // For higher-order matching, we allow more flexible matching
                    // between terms that represent logical statements
                    if (leftComp.isCompound && rightComp.isCompound) {
                        // Complex terms that might represent logical patterns
                        const subBindings = VariableBindingUtils.matchAndBindHigherOrder(leftComp, rightComp, newBindings);
                        if (subBindings) {
                            for (const [varName, value] of subBindings) {
                                newBindings.set(varName, value);
                            }
                        } else {
                            return null;
                        }
                    } else {
                        return null;
                    }
                }
            }
            
            return newBindings;
        }
        
        // If both are atomic and equal
        if (leftTerm.name === rightTerm.name) {
            return newBindings;
        }
        
        return null;
    }
    
    /**
     * Match complex patterns including higher-order terms like (Similar, (Human ==> Mortal), (Socrates ==> Mortal))
     */
    static matchHigherOrderPatterns(pattern, target, variableBindings) {
        const newBindings = new Map(variableBindings);
        
        // Pattern could be something like (Similar, ?X, ?Y) where ?X and ?Y could match complex terms
        if (pattern.isCompound && target.isCompound) {
            if (pattern.operator !== target.operator) {
                // For higher-order matching, we might still match if the structure allows it
                return null;
            }
            
            if (pattern.components.length !== target.components.length) {
                return null;
            }
            
            for (let i = 0; i < pattern.components.length; i++) {
                const patternComp = pattern.components[i];
                const targetComp = target.components[i];
                
                if (patternComp.name?.startsWith('?')) {
                    // This is a pattern variable, bind it to the target component
                    newBindings.set(patternComp.name, targetComp);
                } else if (patternComp.isCompound && targetComp.isCompound) {
                    // Recursively match nested patterns
                    const subBindings = VariableBindingUtils.matchHigherOrderPatterns(patternComp, targetComp, newBindings);
                    if (subBindings) {
                        for (const [varName, value] of subBindings) {
                            newBindings.set(varName, value);
                        }
                    } else {
                        return null;
                    }
                } else if (patternComp.name !== targetComp.name) {
                    return null;
                }
            }
            
            return newBindings;
        }
        
        // Basic equality case
        if (pattern.name === target.name) {
            return newBindings;
        }
        
        return null;
    }

    /**
     * Create standard result object for evaluation operations
     */
    static createResult(result, success, message, additionalData = {}) {
        return { result, success, message, ...additionalData };
    }
}