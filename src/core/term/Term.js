import crypto from 'crypto';
import {freezeObject} from '../../util/common.js';

export const TermType = {
    ATOM: 'atom',
    COMPOUND: 'compound',
};

export class Term {
    constructor(type, name, components = [], operator = null) {
        this._type = type;
        this._name = name;

        // For atomic terms, components should include the name itself
        // For compound terms, use provided components
        const actualComponents = type === TermType.ATOM && components.length === 0
            ? freezeObject([name])
            : freezeObject(components);

        this._operator = operator;
        this._components = actualComponents;
        this._complexity = this._calculateComplexity();
        this._id = this._calculateId();
        this._hash = Term.computeHash(this._id);
        return freezeObject(this);
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

    static computeHash(str) {
        return crypto.createHash('sha256').update(str).digest('hex');
    }

    _calculateId() {
        return this._type === TermType.ATOM ? this._name : `${this._operator}_${this._name}`;
    }

    equals(other) {
        return other instanceof Term && this.id === other.id;
    }

    toString() {
        return this.name;
    }

    visit(visitorFn, order = 'pre-order') {
        order === 'pre-order' && visitorFn(this);
        this._components.forEach(comp =>
            comp instanceof Term && comp.visit(visitorFn, order)
        );
        order === 'post-order' && visitorFn(this);
    }

    reduce(reducerFn, initialValue) {
        let result = reducerFn(initialValue, this);
        for (const comp of this._components) {
            if (comp instanceof Term) {
                result = comp.reduce(reducerFn, result);
            }
        }
        return result;
    }

    _calculateComplexity() {
        return this.type === TermType.ATOM ? 1 : 1 + this._components.reduce((sum, comp) => sum + (comp?.complexity || 0), 0);
    }
}