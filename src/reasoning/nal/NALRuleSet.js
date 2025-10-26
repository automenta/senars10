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
 * Collection of all NAL rules
 */
export class NALRuleSet {
    static getAllRules() {
        return [
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
}