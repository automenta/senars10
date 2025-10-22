import crypto from 'crypto';
import {freeze} from '../util/common.js';

export const TermType = Object.freeze({
    ATOM: 'atom',
    COMPOUND: 'compound',
});

export class Term {
    constructor(type, name, components = [], operator = null) {
        this._type = type;
        this._name = name;
        this._operator = operator;
        this._components = freeze(type === TermType.ATOM && components.length === 0 ? [name] : components);
        this._complexity = this._calculateComplexity();
        this._id = type === TermType.ATOM ? name : `${operator}_${name}`;
        this._hash = Term.hash(this._id);

        return freeze(this);
    }

    get type() {
        return this._type;
    }

    get name() {
        return this._name;
    }

    get operator() {
        return this._operator;
    }

    get components() {
        return this._components;
    }

    get complexity() {
        return this._complexity;
    }

    get hash() {
        return this._hash;
    }

    get id() {
        return this._id;
    }

    get isAtomic() {
        return this._type === TermType.ATOM;
    }

    get isCompound() {
        return this._type === TermType.COMPOUND;
    }

    static hash(str) {
        return crypto.createHash('sha256').update(str).digest('hex');
    }

    _calculateComplexity() {
        return this._type === TermType.ATOM
            ? 1
            : 1 + this._components.reduce((sum, c) => sum + (c?.complexity || 0), 0);
    }

    /**
     * Structural equality comparison between terms
     * @param {Term} other - Other term to compare with
     * @returns {boolean} - True if terms are structurally equal
     */
    equals(other) {
        if (!(other instanceof Term)) return false;
        if (this._type !== other._type) return false;
        if (this._operator !== other._operator) return false;
        if (this._name !== other._name) return false;

        // For compound terms, recursively compare components
        if (this._type === TermType.COMPOUND) {
            if (this._components.length !== other._components.length) return false;

            // For commutative operators, order doesn't matter
            if (this._isCommutativeOperator()) {
                return this._componentsMatch(other._components);
            } else {
                // For non-commutative operators, order matters
                for (let i = 0; i < this._components.length; i++) {
                    if (!this._components[i].equals(other._components[i])) return false;
                }
            }
        }

        return true;
    }

    /**
     * Check if the operator is commutative
     * @returns {boolean} - True if operator is commutative
     */
    _isCommutativeOperator() {
        const commutativeOps = new Set(['&', '|', '+', '*', '<->', '<=>']);
        return commutativeOps.has(this._operator);
    }

    /**
     * Check if components match, considering commutativity
     * @param {Array} otherComponents - Components to match against
     * @returns {boolean} - True if components match
     */
    _componentsMatch(otherComponents) {
        if (this._components.length !== otherComponents.length) return false;

        const thisSorted = [...this._components].sort((a, b) => this._compareTerms(a, b));
        const otherSorted = [...otherComponents].sort((a, b) => this._compareTerms(a, b));

        for (let i = 0; i < thisSorted.length; i++) {
            if (!thisSorted[i].equals(otherSorted[i])) return false;
        }

        return true;
    }

    /**
     * Compare two terms for sorting purposes
     * @param {Term} a - First term
     * @param {Term} b - Second term
     * @returns {number} - Comparison result (-1, 0, or 1)
     */
    _compareTerms(a, b) {
        if (a._name < b._name) return -1;
        if (a._name > b._name) return 1;
        return 0;
    }

    toString() {
        return this.name;
    }

    visit(visitor, order = 'pre-order') {
        order === 'pre-order' && visitor(this);
        this._components.forEach(c => c instanceof Term && c.visit(visitor, order));
        order === 'post-order' && visitor(this);
    }

    reduce(fn, acc) {
        let result = fn(acc, this);
        for (const c of this._components) {
            if (c instanceof Term) result = c.reduce(fn, result);
        }
        return result;
    }
}