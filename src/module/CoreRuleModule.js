import { BaseModule } from './BaseModule.js';
import { SyllogisticRule } from '../reasoning/rules/syllogism.js';
import { ImplicationSyllogisticRule } from '../reasoning/rules/implicationSyllogism.js';
import { ModusPonensRule } from '../reasoning/rules/modusponens.js';
import { SimilaritySyllogism } from '../reasoning/rules/similaritySyllogism.js';

/**
 * @file src/module/CoreRuleModule.js
 * @description A module to register the core set of NAL rules.
 */
export class CoreRuleModule extends BaseModule {
    constructor() {
        super('CoreRuleModule');
    }

    /**
     * Registers the core NAL rules with the RuleEngine.
     * @param {object} agent - The main agent instance.
     * @param {object} config - The module-specific configuration.
     */
    register(agent, config) {
        const ruleEngine = agent.nar._ruleEngine;
        const termFactory = agent.nar._termFactory;

        try {
            ruleEngine.register(SyllogisticRule.create(termFactory));
            ruleEngine.register(ImplicationSyllogisticRule.create(termFactory));
            ruleEngine.register(ModusPonensRule.create(termFactory));
            ruleEngine.register(SimilaritySyllogism.create(termFactory));
        } catch (error) {
            console.error('Error setting up default rules:', error);
        }
    }
}
