import crypto from 'crypto';
import {freeze} from '../util/common.js';

export const ATOM = 'atom';
export const COMPOUND = 'compound';

export const TermType = {
    ATOM: 'atom',
    COMPOUND: 'compound',
};

export class Term {
    constructor(type, name, components = [], operator = null) {
        const comps = freeze(type === TermType.ATOM && components.length === 0 ? [name] : components);
        const id = type === TermType.ATOM ? name : `${operator}_${name}`;
        const complexity = type === TermType.ATOM ? 1 : 1 + comps.reduce((sum, c) => sum + (c?.complexity || 0), 0);

        Object.assign(this, {
            _type: type,
            _name: name,
            _operator: operator,
            _components: comps,
            _complexity: complexity,
            _id: id,
            _hash: Term.hash(id)
        });

        return freeze(this);
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
        if (order === 'post-order') visitor(this);
    }

    reduce(fn, acc) {
        let result = fn(acc, this);
        for (const c of this._components) {
            if (c instanceof Term) result = c.reduce(fn, result);
        }
        return result;
    }
}