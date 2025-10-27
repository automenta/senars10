import crypto from 'crypto';
import {freeze} from '../util/common.js';

export const TermType = Object.freeze({
    ATOM: 'atom',
    COMPOUND: 'compound',
});

// Semantic types for evaluation
export const SemanticType = Object.freeze({
    BOOLEAN: 'boolean',
    NUMERIC: 'numeric',
    VARIABLE: 'variable',
    NAL_CONCEPT: 'nal_concept',
    UNKNOWN: 'unknown'
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
        this._semanticType = this._determineSemanticType();  // Determine semantic type once at construction

        return freeze(this);
    }

    _determineSemanticType() {
        // Determine semantic type based on the term structure and name
        if (this._type === TermType.ATOM) {
            // Check for boolean values
            if (this._name === 'True' || this._name === 'False' || this._name === 'Null') {
                return SemanticType.BOOLEAN;
            }
            
            // Check for variables (start with ?)
            if (this._name?.startsWith('?')) {
                return SemanticType.VARIABLE;
            }
            
            // Check for numeric values
            if (!isNaN(Number(this._name))) {
                return SemanticType.NUMERIC;
            }
            
            // Everything else is a NAL concept
            return SemanticType.NAL_CONCEPT;
        } else {
            // For compound terms, the semantic type depends on the operator and components
            // If it's an operation like ^, it might be numeric/function evaluation
            // If it's a logical operator with boolean components, it's boolean
            // Otherwise it's typically a NAL concept
            return SemanticType.NAL_CONCEPT; // Default for compound terms
        }
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

    get semanticType() {
        return this._semanticType;
    }

    get isAtomic() {
        return this._type === TermType.ATOM;
    }

    get isCompound() {
        return this._type === TermType.COMPOUND;
    }

    get isBoolean() {
        return this._semanticType === SemanticType.BOOLEAN;
    }

    get isNumeric() {
        return this._semanticType === SemanticType.NUMERIC;
    }

    get isVariable() {
        return this._semanticType === SemanticType.VARIABLE;
    }

    get isNALConcept() {
        return this._semanticType === SemanticType.NAL_CONCEPT;
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
        const commutativeOps = new Set(['&', '|', '+', '*', '<->', '<=>', '=']);
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

    /**
     * Serialize the term to an object
     * @returns {Object} Serializable term representation
     */
    serialize() {
        return {
            type: this._type,
            name: this._name,
            operator: this._operator,
            components: this._components.map(c => c.serialize ? c.serialize() : c.toString()),
            complexity: this._complexity,
            id: this._id,
            hash: this._hash,
            semanticType: this._semanticType,
            version: '1.0.0'
        };
    }

    /**
     * Create a term from serialized data
     * @param {Object} data - Serialized term data
     * @returns {Term} New Term instance
     */
    static fromJSON(data) {
        if (!data) {
            throw new Error('Term.fromJSON requires valid data object');
        }

        // In a complete implementation, we would need to properly reconstruct
        // child terms from the serialized components
        const components = data.components || [];
        return new Term(data.type, data.name, components, data.operator);
    }
}