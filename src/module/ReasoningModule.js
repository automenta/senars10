import { BaseModule } from './BaseModule.js';
import { SyllogisticRule } from '../reasoning/rules/syllogism.js';
import { ImplicationSyllogisticRule } from '../reasoning/rules/implicationSyllogism.js';
import { ModusPonensRule } from '../reasoning/rules/modusponens.js';

/**
 * @file src/module/ReasoningModule.js
 * @description Manages the registration of NAL rule sets and functor collections.
 *
 * This module provides a centralized and configurable way to manage the reasoning
 * capabilities of the system. It allows different sets of inference rules and
 * procedural functions (functors) to be registered with the NAR's rule engine
 * and evaluator, enabling tailored reasoning systems for different applications.
 */
export class ReasoningModule extends BaseModule {
    constructor() {
        super('reasoning');
        this.ruleSets = new Map();
        this.functorCollections = new Map();
        this._registerDefaultRuleSets();
    }

    _registerDefaultRuleSets() {
        this.ruleSets.set('syllogistic-core', [
            SyllogisticRule,
            ImplicationSyllogisticRule,
            ModusPonensRule,
        ]);
    }

    /**
     * Registers the configured rule sets and functor collections with the NAR.
     * @param {object} agent - The main agent instance.
     * @param {object} config - The module-specific configuration.
     */
    register(agent, config) {
        const { nar } = agent;
        const { _ruleEngine, _evaluator, _termFactory } = nar;

        // Register enabled rule sets
        const enabledRuleSets = config.rules || ['syllogistic-core'];
        for (const setName of enabledRuleSets) {
            if (this.ruleSets.has(setName)) {
                const rules = this.ruleSets.get(setName);
                for (const Rule of rules) {
                    _ruleEngine.register(Rule.create(_termFactory));
                }
            }
        }

        // Register functor collections (logic to be added)
        const enabledFunctors = config.functors || [];
        // In the future, we would iterate through enabledFunctors and register them
        // with the evaluator.
    }

    /**
     * Allows for dynamic registration of new rule sets.
     * @param {string} name - The name of the rule set.
     * @param {Array<NALRule>} rules - An array of NAL rule classes.
     */
    addRuleSet(name, rules) {
        this.ruleSets.set(name, rules);
    }
}
