import {DeductionRule} from './DeductionRule.js';
import {InductionRule} from './InductionRule.js';
import {AbductionRule} from './AbductionRule.js';
import {ComparisonRule} from './ComparisonRule.js';
import {TemporalRules} from './TemporalRules.js';
import {ConditionalRules} from './ConditionalRules.js';
import {HigherOrderRule} from './HigherOrderRule.js';
import {SyllogisticRules} from './SyllogisticRules.js';
import {
    ConversionRule,
    EquivalenceRule,
    NegationRule,
    ConjunctionRule,
    DisjunctionRule
} from './ExtendedNALRules.js';

/**
 * Collection of all NAL rules with extensible architecture
 */
export class NALRuleSet {
    // Registry for dynamically registered rules
    static _ruleRegistry = new Map();
    
    static _defaultRules = [
        ...SyllogisticRules.getRules(),
        ...ConditionalRules.getRules(),
        ...TemporalRules.getRules(),
        new HigherOrderRule(),
        new ConversionRule(),
        new EquivalenceRule(),
        new NegationRule(),
        new ConjunctionRule(),
        new DisjunctionRule()
    ];
    
    static getAllRules() {
        // Combine default rules with any dynamically registered rules
        return [...this._defaultRules, ...this._ruleRegistry.values()];
    }

    static getSyllogisticRules() {
        return SyllogisticRules.getRules();
    }
    
    static getConditionalRules() {
        return ConditionalRules.getRules();
    }
    
    static getTemporalRules() {
        return TemporalRules.getRules();
    }
    
    static getHigherOrderRules() {
        return [new HigherOrderRule()];
    }
    
    static getExtendedRules() {
        return [
            new ConversionRule(),
            new EquivalenceRule(),
            new NegationRule(),
            new ConjunctionRule(),
            new DisjunctionRule()
        ];
    }
    
    /**
     * Register a new rule type for dynamic inclusion
     * Allows for extensibility without modifying core code
     */
    static registerRule(name, ruleInstance) {
        this._ruleRegistry.set(name, ruleInstance);
    }
    
    /**
     * Unregister a rule by name
     */
    static unregisterRule(name) {
        return this._ruleRegistry.delete(name);
    }
    
    /**
     * Get a specific registered rule by name
     */
    static getRuleByName(name) {
        return this._ruleRegistry.get(name);
    }
    
    /**
     * Get rules by category
     */
    static getRulesByCategory(category) {
        return this.getAllRules().filter(rule => rule.category === category);
    }
}