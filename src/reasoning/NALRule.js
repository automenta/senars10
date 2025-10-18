import {Rule} from './Rule.js';
import {Term} from '../term/Term.js';

export class NALRule extends Rule {
    constructor(id, premises, conclusion, truthFunction, priority = 1.0, config = {}) {
        super(id, 'nal', priority, config);
        this._premises = Object.freeze(premises || []);
        this._conclusion = conclusion;
        this._truthFunction = truthFunction;
        Object.freeze(this);
    }

    get premises() {
        return this._premises;
    }

    get conclusion() {
        return this._conclusion;
    }

    get truthFunction() {
        return this._truthFunction;
    }

    _matches(task) {
        return this._premises.length > 0 && this._premises.some(premise => this._matchesPattern(premise, task.term));
    }

    _matchesPattern(pattern, term) {
        if (!pattern || !term || pattern.type !== term.type) return false;

        return this._matchesAtomic(pattern, term) ||
            this._matchesCompound(pattern, term) ||
            false;
    }

    _matchesAtomic(pattern, term) {
        if (pattern.isAtomic && term.isAtomic) {
            return pattern.name === term.name || pattern.name === '?';
        }
        return false;
    }

    _matchesCompound(pattern, term) {
        if (pattern.isCompound && term.isCompound) {
            if (pattern.operator !== term.operator || pattern.components.length !== term.components.length) return false;
            return pattern.components.every((comp, i) => this._matchesPattern(comp, term.components[i]));
        }
        return false;
    }

    async _apply(task) {
        const results = [];
        for (const premise of this._premises) {
            if (this._matchesPattern(premise, task.term)) {
                results.push(...await this._deriveFromPremise(premise, task));
            }
        }
        return results;
    }

    async _deriveFromPremise(premise, task) {
        const bindings = this._unifyPatterns(premise, task.term);
        if (!bindings) return [];

        const derivedTerm = this._substituteVariables(this._conclusion, bindings);
        const derivedTruth = this._computeDerivedTruth(task.truth);

        if (!derivedTerm || !derivedTruth) return [];

        return [{
            term: derivedTerm,
            truth: derivedTruth,
            type: task.type,
            stamp: task.stamp,
            priority: task.priority * this.priority
        }];
    }

    _unifyPatterns(pattern, term) {
        const bindings = new Map();

        if (pattern.isAtomic && term.isAtomic) {
            if (pattern.name === '?') {
                bindings.set(pattern.name, term);
            } else if (pattern.name !== term.name) {
                return null;
            }
            return bindings;
        }

        if (pattern.isCompound && term.isCompound) {
            if (pattern.components.length !== term.components.length) return null;

            for (let i = 0; i < pattern.components.length; i++) {
                const patternBindings = this._unifyPatterns(pattern.components[i], term.components[i]);
                if (!patternBindings) return null;
                for (const [key, value] of patternBindings) bindings.set(key, value);
            }
            return bindings;
        }

        return null;
    }

    _substituteVariables(term, bindings) {
        if (term.isAtomic) return bindings.has(term.name) ? bindings.get(term.name) : term;

        if (term.isCompound) {
            const substitutedComponents = term.components.map(comp => this._substituteVariables(comp, bindings));
            return new Term(term.type, term.name, substitutedComponents, term.operator);
        }

        return term;
    }

    _computeDerivedTruth(taskTruth) {
        return this._truthFunction ? this._truthFunction(taskTruth, taskTruth) : taskTruth;
    }

    // Override _clone to handle NALRule-specific constructor signature
    _clone(overrides = {}) {
        return new NALRule(this._id, this._premises, this._conclusion, this._truthFunction, this._priority, {
            ...this._config, ...overrides
        });
    }
}