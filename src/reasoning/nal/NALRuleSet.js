import {DeductionRule} from './DeductionRule.js';
import {InductionRule} from './InductionRule.js';
import {AbductionRule} from './AbductionRule.js';

/**
 * Collection of all NAL rules
 */
export class NALRuleSet {
    static getAllRules() {
        return [
            new DeductionRule(),
            new InductionRule(),
            new AbductionRule()
        ];
    }

    static getSyllogisticRules() {
        return this.getAllRules();
    }
}