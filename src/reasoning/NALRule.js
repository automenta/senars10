import {Rule} from './Rule.js';
import {Term} from '../term/Term.js';
import {Task} from '../task/Task.js';
import {Stamp} from '../Stamp.js';

/**
 * NALRule is the base class for all logical inference rules in the system.
 * It defines the structure of a rule, including its premises, conclusion, and truth function.
 * The actual application of the rule is handled by a ReasoningStrategy, which decouples
 * the logical definition of the rule from the algorithm used to find and apply it.
 */
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

    /**
     * Applies the rule to a given set of premise tasks.
     * This method is called by a ReasoningStrategy, which is responsible for finding
     * the matching premises in the first place.
     *
     * @param {Task[]} premises - An array of tasks that match the rule's premise patterns.
     * @param {Object} memoryOrContext - Memory object or ReasoningContext
     * @param {Object} termFactory - The term factory for creating new terms (optional if context provided)
     * @returns {Promise<Task[]>} A promise that resolves to an array of derived tasks.
     */
    async _apply(premises, memoryOrContext, termFactory) {
        if (premises.length !== this._premises.length) {
            return [];
        }

        // Handle context vs direct parameters
        let effectiveTermFactory;
        if (memoryOrContext && typeof memoryOrContext === 'object' && memoryOrContext.hasOwnProperty('config')) {
            // It's a ReasoningContext
            effectiveTermFactory = memoryOrContext.termFactory;
        } else {
            // It's memory, use termFactory parameter
            effectiveTermFactory = termFactory;
        }

        const combinedBindings = new Map();
        for (let i = 0; i < this._premises.length; i++) {
            const pattern = this._premises[i];
            const term = premises[i].term;

            if (!this._unifyPatterns(pattern, term, combinedBindings)) {
                return []; // Unification failed
            }
        }

        const derivedTerm = this._substituteVariables(this._conclusion, combinedBindings, effectiveTermFactory);
        if (!derivedTerm) return [];

        const premiseTruths = premises.map(p => p.truth);
        const derivedTruth = this._truthFunction(...premiseTruths);
        if (!derivedTruth) return [];

        const newStamp = Stamp.derive(premises.map(p => p.stamp));
        const newPriority = premises.reduce((prod, p) => prod * p.priority, 1.0) * this.priority;
        const baseBudget = premises[0].budget;

        const derivedTask = new Task({
            term: derivedTerm,
            truth: derivedTruth,
            stamp: newStamp,
            priority: newPriority,
            budget: {...baseBudget, priority: newPriority},
        });

        return [derivedTask];
    }

    /**
     * Applies the rule to a given set of premise tasks (with context)
     */
    async _applyWithContext(premises, context) {
        return await this._apply(premises, context, context.termFactory);
    }

    /**
     * Unifies a pattern with a term, populating a bindings map.
     * This version is recursive and handles shared variables across a pattern.
     *
     * @param {Term} pattern - The pattern term (may contain variables).
     * @param {Term} term - The concrete term.
     * @param {Map<string, Term>} bindings - The map of variable bindings to update.
     * @returns {Map<string, Term>|null} The updated bindings map or null if unification fails.
     */
    _unifyPatterns(pattern, term, bindings) {
        if (!pattern || !term) return null;

        if (pattern.isAtomic) {
            // Convention: Variables start with '?'
            if (pattern.name.startsWith('?')) {
                if (bindings.has(pattern.name)) {
                    // Variable is already bound, check for consistency.
                    return bindings.get(pattern.name).equals(term) ? bindings : null;
                }
                // New binding.
                bindings.set(pattern.name, term);
                return bindings;
            }
            // Constant term.
            return pattern.equals(term) ? bindings : null;
        }

        if (pattern.isCompound) {
            if (!term.isCompound || pattern.operator !== term.operator || pattern.components.length !== term.components.length) {
                return null;
            }

            for (let i = 0; i < pattern.components.length; i++) {
                if (!this._unifyPatterns(pattern.components[i], term.components[i], bindings)) {
                    return null;
                }
            }
            return bindings;
        }

        return null;
    }

    /**
     * Substitutes variables in a term based on a bindings map.
     *
     * @param {Term} term - The term to perform substitutions on.
     * @param {Map<string, Term>} bindings - The map of variable bindings.
     * @param {TermFactory} termFactory - The term factory for creating new compound terms.
     * @returns {Term|null} The new term with variables substituted, or null on failure.
     */
    _substituteVariables(term, bindings, termFactory) {
        if (term.isAtomic) {
            return bindings.get(term.name) || term;
        }

        if (term.isCompound) {
            const substitutedComponents = term.components.map(comp => this._substituteVariables(comp, bindings, termFactory));

            if (substitutedComponents.some(c => !c)) {
                return null;
            }

            return termFactory.create({
                operator: term.operator,
                components: substitutedComponents
            });
        }

        return term;
    }

    _clone(overrides = {}) {
        return new NALRule(this._id, this._premises, this._conclusion, this._truthFunction, this._priority, {
            ...this._config, ...overrides
        });
    }
}
