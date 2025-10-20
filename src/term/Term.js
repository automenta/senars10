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

    _calculateComplexity() {
        return this._type === TermType.ATOM 
            ? 1 
            : 1 + this._components.reduce((sum, c) => sum + (c?.complexity || 0), 0);
    }

    get type() { return this._type; }
    get name() { return this._name; }
    get operator() { return this._operator; }
    get components() { return this._components; }
    get complexity() { return this._complexity; }
    get hash() { return this._hash; }
    get id() { return this._id; }
    get isAtomic() { return this._type === TermType.ATOM; }
    get isCompound() { return this._type === TermType.COMPOUND; }

    static hash(str) {
        return crypto.createHash('sha256').update(str).digest('hex');
    }

    equals(other) {
        return other instanceof Term && this.id === other.id;
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