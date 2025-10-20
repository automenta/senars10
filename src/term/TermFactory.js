import {Term, TermType} from './Term.js';

export {Term};

const COMMUTATIVE_OPERATORS = new Set(['&', '|', '+', '*', '<->']);
const ASSOCIATIVE_OPERATORS = new Set(['&', '|']);

export class TermFactory {
    constructor() {
        this._cache = new Map();
    }

    create(data) {
        if (!data) throw new Error('TermFactory.create: data is required');

        if (typeof data === 'string') return this._getOrCreateAtomic(data);

        if (data.name && !data.components && data.operator === undefined) {
            return this._getOrCreateAtomic(data.name);
        }

        const {operator, components} = this._normalizeTermData(data);
        const name = this._buildCanonicalName(operator, components);
        return this._cache.get(name) || this._createAndCache(operator, components, name);
    }

    _getOrCreateAtomic(name) {
        return this._cache.get(name) || this._createAndCache(null, [], name);
    }

    _createAndCache(operator, components, name) {
        const existing = this._cache.get(name);
        if (existing) return existing;

        const term = new Term(
            operator ? TermType.COMPOUND : TermType.ATOM,
            name,
            components,
            operator
        );
        this._cache.set(name, term);
        return term;
    }

    _normalizeTermData({operator, components}) {
        if (!Array.isArray(components)) {
            throw new Error('TermFactory._normalizeTermData: components must be an array');
        }

        let normalizedComponents = components.map(comp =>
            (typeof comp === 'string' || comp instanceof Term) ?
                (typeof comp === 'string' ? this.create(comp) : comp) :
                this.create(comp)
        );

        if (operator) {
            this._validateOperator(operator);

            if (ASSOCIATIVE_OPERATORS.has(operator)) {
                normalizedComponents = this._flatten(operator, normalizedComponents);
            }

            if (COMMUTATIVE_OPERATORS.has(operator)) {
                normalizedComponents = this._normalizeCommutative(normalizedComponents);
            }
        }

        return {operator, components: normalizedComponents};
    }

    _validateOperator(op) {
        if (typeof op !== 'string') throw new Error('TermFactory._validateOperator: operator must be a string');
    }

    _flatten(op, comps) {
        if (!Array.isArray(comps)) throw new Error('TermFactory._flatten: components must be an array');
        return comps.flatMap(c => c?.operator === op ? c.components : [c]);
    }

    _normalizeCommutative(comps) {
        return this._removeRedundancy(comps.sort((a, b) => a.name.localeCompare(b.name)));
    }

    _removeRedundancy(comps) {
        if (!Array.isArray(comps)) throw new Error('TermFactory._removeRedundancy: components must be an array');
        const seen = new Set();
        return comps.filter(c => {
            if (!c || typeof c.name !== 'string') {
                throw new Error('TermFactory._removeRedundancy: component must have a name property');
            }
            return seen.has(c.name) ? false : !!(seen.add(c.name));
        });
    }

    _buildCanonicalName(op, comps) {
        if (!op) return comps[0].toString();

        const names = comps.map(c => c.name);
        const patterns = {
            '--': `(--, ${names[0]})`,
            '&': `(&, ${names.join(', ')})`,
            '|': `(|, ${names.join(', ')})`,
            '&/': `(&/, ${names.slice(0, 2).join(', ')})`,
            '-->': `(-->, ${names[0]}, ${names[1]})`,
            '<->': `(<->, ${names[0]}, ${names[1]})`,
            '==>': `(==>, ${names[0]}, ${names[1]})`,
            '<=>': `(<=>, ${names[0]}, ${names[1]})`,
            '^': `(^, ${names[0]}, ${names[1]})`,
            '{{--': `({{--, ${names[0]}, ${names[1]})`,
            '--}}': `(--}}, ${names[0]}, ${names[1]})`,
            '{}': `{${names.join(', ')}}`,
            '[]': `[${names.join(', ')}]`,
            ',': `(${names.join(', ')})`
        };

        return patterns[op] || `(${op}, ${names.join(', ')})`;
    }
}
