import crypto from 'crypto';
import {freeze} from '../util/common.js';

export const TermType = Object.freeze({
    ATOM: 'atom',
    COMPOUND: 'compound',
});

export const SemanticType = Object.freeze({
    BOOLEAN: 'boolean',
    NUMERIC: 'numeric',
    VARIABLE: 'variable',
    NAL_CONCEPT: 'nal_concept',
    UNKNOWN: 'unknown'
});

const COMMUTATIVE_OPERATORS = Object.freeze(['&', '|', '+', '*', '<->', '<=>', '=']);

export class Term {
    constructor(type, name, components = [], operator = null) {
        this._type = type;
        this._name = name;
        this._operator = operator;
        this._components = freeze(type === TermType.ATOM && components.length === 0 ? [name] : components);
        this._complexity = this._calculateComplexity();
        this._id = type === TermType.ATOM ? name : `${operator}_${name}`;
        this._hash = Term.hash(this._id);
        this._semanticType = this._determineSemanticType();

        return freeze(this);
    }

    _determineSemanticType() {
        if (this._type === TermType.ATOM) {
            if (['True', 'False', 'Null'].includes(this._name)) {
                return SemanticType.BOOLEAN;
            }
            
            if (this._name?.startsWith('?')) {
                return SemanticType.VARIABLE;
            }
            
            if (!isNaN(Number(this._name))) {
                return SemanticType.NUMERIC;
            }
            
            return SemanticType.NAL_CONCEPT;
        } else {
            return SemanticType.NAL_CONCEPT;
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

    equals(other) {
        if (!(other instanceof Term)) return false;
        if (this._type !== other._type) return false;
        if (this._operator !== other._operator) return false;
        if (this._name !== other._name) return false;

        if (this._type === TermType.COMPOUND) {
            if (this._components.length !== other._components.length) return false;

            if (this._isCommutativeOperator()) {
                return this._componentsMatch(other._components);
            } else {
                for (let i = 0; i < this._components.length; i++) {
                    if (!this._components[i].equals(other._components[i])) return false;
                }
            }
        }

        return true;
    }

    _isCommutativeOperator() {
        return COMMUTATIVE_OPERATORS.includes(this._operator);
    }

    _componentsMatch(otherComponents) {
        if (this._components.length !== otherComponents.length) return false;

        const thisSorted = [...this._components].sort((a, b) => this._compareTerms(a, b));
        const otherSorted = [...otherComponents].sort((a, b) => this._compareTerms(a, b));

        for (let i = 0; i < thisSorted.length; i++) {
            if (!thisSorted[i].equals(otherSorted[i])) return false;
        }

        return true;
    }

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

    static fromJSON(data) {
        if (!data) {
            throw new Error('Term.fromJSON requires valid data object');
        }

        const components = data.components || [];
        return new Term(data.type, data.name, components, data.operator);
    }
}