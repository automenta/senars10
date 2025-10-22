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
     * @returns {Map|null} - Updated bindings map or null if unification fails
     */
    unify(pattern, term, existingBindings = null) {
        const bindings = existingBindings || new Map();
        return this._unifyTerms(pattern, term, bindings) ? bindings : null;
    }

    /**
     * Unify multiple pattern-term pairs, accumulating bindings
     * @param {Array<{pattern: Term, term: Term}>} patternTermPairs - Array of pattern-term pairs to unify
     * @param {Map} initialBindings - Initial bindings to start with (optional)
     * @returns {Map|null} - Final bindings map or null if unification fails
     */
    unifyMultiple(patternTermPairs, initialBindings = new Map()) {
        let currentBindings = new Map(initialBindings);

        for (const {pattern, term} of patternTermPairs) {
            const result = this.unify(pattern, term, currentBindings);
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
    _unifyTerms(pattern, term, bindings) {
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
                    return this._unifyCommutative(pattern, term, bindings);
                }
                return false;
            }
            if (pattern.components.length !== term.components.length) return false;

            // Recursively unify components
            for (let i = 0; i < pattern.components.length; i++) {
                if (!this._unifyTerms(pattern.components[i], term.components[i], bindings)) {
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
    _unifyCommutative(pattern, term, bindings) {
        // A simple approach: try the ordered matching (pattern[i] with term[i])
        // For commutative operators, the order of matching may vary but for basic cases
        // the ordered approach should work
        if (pattern.components.length !== term.components.length) {
            return false;
        }

        // Use the same approach as regular unification but with the same bindings object
        for (let i = 0; i < pattern.components.length; i++) {
            if (!this._unifyTerms(pattern.components[i], term.components[i], bindings)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Apply variable substitutions to a term with complex handling
     * @param {Term} term - The term to substitute
     * @param {Map} bindings - The variable bindings
     * @returns {Term} - The substituted term
     */
    substitute(term, bindings) {
        if (this._isVariable(term)) {
            const variableName = term.name || term.toString();
            if (bindings.has(variableName)) {
                // Get the bound value
                let boundValue = bindings.get(variableName);
                
                // If the bound value itself contains variables, substitute those too
                // Use recursive substitution by default
                return this.substitute(boundValue, bindings);
            }
            return term;
        }

        if (term.isCompound) {
            // Apply substitutions to each component
            const newComponents = term.components.map(comp => this.substitute(comp, bindings));
            
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
        return !!(term?.name?.startsWith?.('?'));
    }

    /**
     * Check if an operator is commutative
     * @param {string} operator - The operator to check
     * @returns {boolean} - Whether the operator is commutative
     */
    _isCommutativeOperator = (operator => new Set(['&', '|', '<->', '<=>', '=']).has(operator));

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
            // Create a temporary bindings object without recursive substitution for this comparison
            // We just want to substitute the variables in place, not recursively
            t1 = this.substitute(t1, bindings);
            t2 = this.substitute(t2, bindings);
        }
        
        // Use term's equals method if available, otherwise fallback to string comparison
        if (t1.equals && typeof t1.equals === 'function') {
            return t1.equals(t2);
        }
        
        // Fallback to string representation
        return t1.toString() === t2.toString();
    }
}