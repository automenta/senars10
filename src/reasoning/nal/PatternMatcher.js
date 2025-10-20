import {Term} from '../../term/Term.js';

/**
 * Pattern matcher class for handling variable bindings and substitutions
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

        if (!this._unifyTerms(pattern, term, bindings)) {
            return null; // Unification failed
        }

        return bindings;
    }

    /**
     * Unify multiple pattern-term pairs, accumulating bindings
     * @param {Array<{pattern: Term, term: Term}>} patternTermPairs - Array of pattern-term pairs to unify
     * @param {Map} initialBindings - Initial bindings to start with (optional)
     * @returns {Map|null} - Final bindings map or null if unification fails
     */
    unifyMultiple(patternTermPairs, initialBindings = new Map()) {
        let currentBindings = new Map(initialBindings);

        for (const { pattern, term } of patternTermPairs) {
            const result = this.unify(pattern, term, currentBindings);
            if (!result) {
                return null; // Unification failed for this pair
            }
            currentBindings = result;
        }

        return currentBindings;
    }

    /**
     * Internal method to unify two terms
     * @private
     */
    _unifyTerms(pattern, term, bindings) {
        // Check if pattern is a variable (starts with ?)
        if (this._isVariable(pattern)) {
            const variableName = pattern.name || pattern.toString();
            if (bindings.has(variableName)) {
                // Variable already bound, check consistency
                const boundValue = bindings.get(variableName);
                return this._termsEqual(boundValue, term);
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
            return this._termsEqual(pattern, term);
        }

        // Check compound terms
        if (pattern.isCompound) {
            if (pattern.operator !== term.operator) return false;
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
     * Apply variable substitutions to a term
     * @param {Term} term - The term to substitute
     * @param {Map} bindings - The variable bindings
     * @returns {Term} - The substituted term
     */
    substitute(term, bindings) {
        if (this._isVariable(term)) {
            const variableName = term.name || term.toString();
            return bindings.has(variableName) ? bindings.get(variableName) : term;
        }

        if (term.isCompound) {
            const newComponents = term.components.map(comp => this.substitute(comp, bindings));
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
     * Check if two terms are equal
     * @param {Term} t1 - First term
     * @param {Term} t2 - Second term
     * @returns {boolean} - Whether the terms are equal
     */
    _termsEqual(t1, t2) {
        if (!t1 || !t2) return t1 === t2;
        return t1.toString() === t2.toString(); // Simplified for now
    }
}