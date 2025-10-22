import {Term} from '../../term/Term.js';

/**
 * Pattern matcher class for handling complex and dependent variable bindings and substitutions
 */
export class PatternMatcher {
    /**
     * Unify two terms, adding variable bindings to an existing binding map
     * @param {Term} pattern - The pattern term
     * @param {Term} term - The actual term
     * @param {Map} bindings - The existing bindings map to update (optional)
     * @param {Object} options - Unification options
     * @returns {Map|null} - Updated bindings map or null if unification fails
     */
    unify(pattern, term, existingBindings = null, options = {}) {
        const bindings = existingBindings || new Map();

        if (!this._unifyTerms(pattern, term, bindings, options)) {
            return null; // Unification failed
        }

        return bindings;
    }

    /**
     * Unify multiple pattern-term pairs, accumulating bindings
     * @param {Array<{pattern: Term, term: Term}>} patternTermPairs - Array of pattern-term pairs to unify
     * @param {Map} initialBindings - Initial bindings to start with (optional)
     * @param {Object} options - Unification options
     * @returns {Map|null} - Final bindings map or null if unification fails
     */
    unifyMultiple(patternTermPairs, initialBindings = new Map(), options = {}) {
        let currentBindings = new Map(initialBindings);

        for (const {pattern, term} of patternTermPairs) {
            const result = this.unify(pattern, term, currentBindings, options);
            if (!result) {
                return null; // Unification failed for this pair
            }
            currentBindings = result;
        }

        return currentBindings;
    }

    /**
     * Internal method to unify two terms with support for complex and dependent variables
     * @private
     */
    _unifyTerms(pattern, term, bindings, options = {}) {
        // Check if pattern is a variable (starts with ?)
        if (this._isVariable(pattern)) {
            const variableName = pattern.name || pattern.toString();
            
            // Handle dependent variables (e.g., ?x, ?y where ?y may depend on ?x)
            if (bindings.has(variableName)) {
                // Variable already bound, check consistency
                const boundValue = bindings.get(variableName);
                return this._termsEqual(boundValue, term, bindings);
            } else {
                // Bind the variable
                bindings.set(variableName, term);
                return true;
            }
        }
        // Check if pattern is a complex variable pattern (e.g., function applications)
        else if (this._isComplexVariablePattern(pattern, term)) {
            return this._unifyComplexVariable(pattern, term, bindings, options);
        }

        // Both must be of same type
        if (pattern.type !== term.type) return false;

        // Check atomic terms
        if (pattern.isAtomic) {
            return this._termsEqual(pattern, term, bindings);
        }

        // Check compound terms
        if (pattern.isCompound) {
            if (pattern.operator !== term.operator) {
                // Handle commutative operators
                if (this._isCommutativeOperator(pattern.operator) && 
                    this._isCommutativeOperator(term.operator) &&
                    pattern.components.length === term.components.length) {
                    return this._unifyCommutative(pattern, term, bindings, options);
                }
                return false;
            }
            if (pattern.components.length !== term.components.length) return false;

            // Recursively unify components
            for (let i = 0; i < pattern.components.length; i++) {
                if (!this._unifyTerms(pattern.components[i], term.components[i], bindings, options)) {
                    return false;
                }
            }
            return true;
        }

        return false;
    }

    /**
     * Unify commutative operators where order doesn't matter
     * @private
     */
    _unifyCommutative(pattern, term, bindings, options) {
        const patternComponents = [...pattern.components];
        const termComponents = [...term.components];
        
        // Try to match each pattern component with a term component
        const matched = new Array(termComponents.length).fill(false);
        const tempBindings = new Map(bindings);
        
        // For each pattern component, find a matching term component
        for (let i = 0; i < patternComponents.length; i++) {
            let foundMatch = false;
            
            for (let j = 0; j < termComponents.length; j++) {
                if (matched[j]) continue;  // Skip already matched components
                
                const newBindings = new Map(tempBindings);
                if (this._unifyTerms(patternComponents[i], termComponents[j], newBindings, options)) {
                    // Update tempBindings with successful unification
                    for (const [key, value] of newBindings) {
                        if (!bindings.has(key)) {
                            tempBindings.set(key, value);
                        }
                    }
                    matched[j] = true;
                    foundMatch = true;
                    break;
                }
            }
            
            if (!foundMatch) return false;
        }
        
        // Copy new bindings back to original map
        for (const [key, value] of tempBindings) {
            if (!bindings.has(key)) {
                bindings.set(key, value);
            }
        }
        
        return true;
    }

    /**
     * Handle complex variable patterns (like function applications with variables)
     * @private
     */
    _unifyComplexVariable(pattern, term, bindings, options) {
        // For now, treat as regular unification but in the future can handle
        // more complex patterns like ?f(x, y) matching add(1, 2)
        if (pattern.isCompound && pattern.components.length > 0) {
            const firstComponent = pattern.components[0];
            if (this._isVariable(firstComponent)) {
                // This could be something like ?f(x, y) matching add(1, 2)
                const varName = firstComponent.name;
                if (bindings.has(varName)) {
                    // Variable already bound, check consistency
                    const boundTerm = bindings.get(varName);
                    if (!this._termsEqual(boundTerm, term, bindings)) return false;
                } else {
                    // Bind the variable to the entire term
                    bindings.set(varName, term);
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Apply variable substitutions to a term with complex handling
     * @param {Term} term - The term to substitute
     * @param {Map} bindings - The variable bindings
     * @param {Object} options - Substitution options
     * @returns {Term} - The substituted term
     */
    substitute(term, bindings, options = {}) {
        if (this._isVariable(term)) {
            const variableName = term.name || term.toString();
            if (bindings.has(variableName)) {
                // Get the bound value
                let boundValue = bindings.get(variableName);
                
                // If the bound value itself contains variables, substitute those too
                if (options.recursive !== false) {
                    return this.substitute(boundValue, bindings, options);
                }
                return boundValue;
            }
            return term;
        }

        if (term.isCompound) {
            // Apply substitutions to each component
            const newComponents = term.components.map(comp => this.substitute(comp, bindings, options));
            
            // Create a new term with substituted components
            return new Term(term.type, term.name, newComponents, term.operator);
        }

        return term;
    }

    /**
     * Check if a term is a variable
     * @param {Term} term - The term to check
     * @returns {boolean} - Whether the term is a variable
     */
    _isVariable(term) {
        return term.name && typeof term.name === 'string' && term.name.startsWith('?');
    }

    /**
     * Check if a pattern is a complex variable pattern
     * @param {Term} pattern - The pattern to check
     * @param {Term} term - The term to match against
     * @returns {boolean} - Whether it's a complex variable pattern
     */
    _isComplexVariablePattern(pattern, term) {
        // This would check for patterns like ?f(x, y) or other complex variable structures
        return pattern.isCompound && this._isVariable(pattern.components[0]);
    }

    /**
     * Check if an operator is commutative
     * @param {string} operator - The operator to check
     * @returns {boolean} - Whether the operator is commutative
     */
    _isCommutativeOperator(operator) {
        const commutativeOps = new Set(['&', '|', '<->', '<=>', '=']);
        return commutativeOps.has(operator);
    }

    /**
     * Check if two terms are equal with respect to bindings
     * @param {Term} t1 - First term
     * @param {Term} t2 - Second term
     * @param {Map} bindings - Current bindings
     * @returns {boolean} - Whether the terms are equal
     */
    _termsEqual(t1, t2, bindings = null) {
        if (!t1 || !t2) return t1 === t2;
        
        // If bindings exist, apply them before comparison
        if (bindings) {
            t1 = this.substitute(t1, bindings, { recursive: false });
            t2 = this.substitute(t2, bindings, { recursive: false });
        }
        
        // Use term's equals method if available
        if (t1.equals && typeof t1.equals === 'function') {
            return t1.equals(t2);
        }
        
        // Fallback comparison
        return t1.toString() === t2.toString();
    }
}