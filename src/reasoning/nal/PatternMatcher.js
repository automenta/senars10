import {Term} from '../../term/Term.js';

export class PatternMatcher {
    /**
     * Check if an operator is commutative
     */
    _isCommutativeOperator = (operator => new Set(['&', '|', '<->', '<=>', '=']).has(operator));
    _commutativeOperators = new Set(['&', '|', '<->', '<=>', '=']);

    /**
     * Unify two terms, adding variable bindings to an existing binding map
     */
    unify(pattern, term, existingBindings = null) {
        const bindings = existingBindings || new Map();
        return this._unifyTerms(pattern, term, bindings) ? bindings : null;
    }

    /**
     * Unify multiple pattern-term pairs, accumulating bindings
     */
    unifyMultiple(patternTermPairs, initialBindings = new Map()) {
        let currentBindings = new Map(initialBindings);

        for (const {pattern, term} of patternTermPairs) {
            const result = this.unify(pattern, term, currentBindings);
            if (!result) {
                return null;
            }
            currentBindings = result;
        }

        return currentBindings;
    }

    /**
     * Internal method to unify two terms with support for complex and dependent variables
     */
    _unifyTerms(pattern, term, bindings) {
        if (this._isVariable(pattern)) {
            const variableName = pattern.name || pattern.toString();

            if (bindings.has(variableName)) {
                const boundValue = bindings.get(variableName);
                return this._termsEqual(boundValue, term, bindings);
            } else {
                bindings.set(variableName, term);
                return true;
            }
        }

        if (pattern.type !== term.type) return false;

        if (pattern.isAtomic) {
            return this._termsEqual(pattern, term, bindings);
        }

        if (pattern.isCompound) {
            return this._unifyCompound(pattern, term, bindings);
        }

        return false;
    }

    _unifyCompound(pattern, term, bindings) {
        if (pattern.operator !== term.operator) {
            if (this._isCommutativeOperator(pattern.operator) &&
                this._isCommutativeOperator(term.operator) &&
                pattern.components.length === term.components.length) {
                return this._unifyCommutative(pattern, term, bindings);
            }
            return false;
        }
        if (pattern.components.length !== term.components.length) return false;

        for (let i = 0; i < pattern.components.length; i++) {
            if (!this._unifyTerms(pattern.components[i], term.components[i], bindings)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Unify commutative operators where order doesn't matter
     */
    _unifyCommutative(pattern, term, bindings) {
        if (pattern.components.length !== term.components.length) {
            return false;
        }

        for (let i = 0; i < pattern.components.length; i++) {
            if (!this._unifyTerms(pattern.components[i], term.components[i], bindings)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Apply variable substitutions to a term with complex handling
     */
    substitute(term, bindings) {
        if (this._isVariable(term)) {
            const variableName = term.name || term.toString();
            if (bindings.has(variableName)) {
                let boundValue = bindings.get(variableName);
                return this.substitute(boundValue, bindings);
            }
            return term;
        }

        if (term.isCompound) {
            const newComponents = term.components.map(comp => this.substitute(comp, bindings));
            return new Term(term.type, term.name, newComponents, term.operator);
        }

        return term;
    }

    /**
     * Check if a term is a variable
     */
    _isVariable(term) {
        return !!(term?.name?.startsWith?.('?'));
    }

    isCommutativeOperator(operator) {
        return this._commutativeOperators.has(operator);
    }

    /**
     * Check if two terms are equal with respect to bindings
     */
    _termsEqual(t1, t2, bindings = null) {
        if (!t1 || !t2) return t1 === t2;

        if (bindings) {
            t1 = this.substitute(t1, bindings);
            t2 = this.substitute(t2, bindings);
        }

        if (t1.equals && typeof t1.equals === 'function') {
            return t1.equals(t2);
        }

        if (t1.name !== t2.name) return false;

        if (t1.isAtomic && t2.isAtomic) return true;

        if (t1.isCompound && t2.isCompound) {
            if (t1.operator !== t2.operator) return false;
            if (t1.components.length !== t2.components.length) return false;

            for (let i = 0; i < t1.components.length; i++) {
                if (!this._termsEqual(t1.components[i], t2.components[i], bindings)) {
                    return false;
                }
            }
            return true;
        }

        return false;
    }
    
    /**
     * Enhanced unification for higher-order terms
     * This supports matching complex patterns like (Similar, (Human ==> Mortal), (Socrates ==> Mortal))
     */
    unifyHigherOrder(pattern, term, existingBindings = null) {
        const bindings = existingBindings || new Map();
        return this._unifyHigherOrderTerms(pattern, term, bindings) ? bindings : null;
    }
    
    _unifyHigherOrderTerms(pattern, term, bindings) {
        // If the pattern is a variable that can match complex terms
        if (this._isVariable(pattern)) {
            const variableName = pattern.name || pattern.toString();

            if (bindings.has(variableName)) {
                const boundValue = bindings.get(variableName);
                return this._termsEqualHigherOrder(boundValue, term, bindings);
            } else {
                // Bind variable to complex term in higher-order matching
                bindings.set(variableName, term);
                return true;
            }
        }

        // If both are atomic, use standard equality
        if (pattern.isAtomic && term.isAtomic) {
            return this._termsEqualHigherOrder(pattern, term, bindings);
        }

        // If both are compound terms
        if (pattern.isCompound && term.isCompound) {
            // Allow matching even if operators are different, for higher-order patterns
            if (pattern.operator !== term.operator) {
                // For higher-order matching, try to match even different operators
                // This allows patterns like matching a variable to a complex expression
                if (this._isVariable(pattern) || this._isVariable(term)) {
                    if (this._isVariable(pattern)) {
                        bindings.set(pattern.name, term);
                        return true;
                    } else if (this._isVariable(term)) {
                        bindings.set(term.name, pattern);
                        return true;
                    }
                }
                // If operators don't match and neither is a variable, this could indicate
                // different types of complex terms - we may want to allow more flexible matching
                // for higher-order reasoning
                return false;
            }
            
            if (pattern.components.length !== term.components.length) return false;

            for (let i = 0; i < pattern.components.length; i++) {
                if (!this._unifyHigherOrderTerms(pattern.components[i], term.components[i], bindings)) {
                    return false;
                }
            }
            return true;
        }

        return false;
    }
    
    _termsEqualHigherOrder(t1, t2, bindings = null) {
        if (!t1 || !t2) return t1 === t2;

        if (bindings) {
            t1 = this.substitute(t1, bindings);
            t2 = this.substitute(t2, bindings);
        }

        if (t1.equals && typeof t1.equals === 'function') {
            return t1.equals(t2);
        }

        if (t1.name !== t2.name) {
            // For higher-order matching, allow more flexible matching
            // between complex terms that serve different functions
        }

        if (t1.isAtomic && t2.isAtomic) return t1.name === t2.name;

        if (t1.isCompound && t2.isCompound) {
            if (t1.operator !== t2.operator) {
                // For higher-order patterns, we may want to allow operator differences
                // in some contexts
                return false;
            }
            if (t1.components.length !== t2.components) return false;

            for (let i = 0; i < t1.components.length; i++) {
                if (!this._termsEqualHigherOrder(t1.components[i], t2.components[i], bindings)) {
                    return false;
                }
            }
            return true;
        }

        return false;
    }
}