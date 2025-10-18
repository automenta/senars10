import {DeductionRule} from './DeductionRule.js';
import {InductionRule} from './InductionRule.js';
import {AbductionRule} from './AbductionRule.js';

/**
 * Syllogistic reasoning rules collection
 */
export class SyllogisticRules {
    static getRules() {
        return [
            new DeductionRule(),
            new InductionRule(),
            new AbductionRule()
        ];
    }

    static getDeductionRule() {
        return new DeductionRule();
    }

    static getInductionRule() {
        return new InductionRule();
    }

    static getAbductionRule() {
        return new AbductionRule();
    }
}