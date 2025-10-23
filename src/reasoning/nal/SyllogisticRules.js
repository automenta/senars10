import {DeductionRule} from './DeductionRule.js';
import {InductionRule} from './InductionRule.js';
import {AbductionRule} from './AbductionRule.js';
import {ComparisonRule} from './ComparisonRule.js';

/**
 * Syllogistic reasoning rules collection
 */
export class SyllogisticRules {
    static getRules() {
        return [
            new DeductionRule(),
            new InductionRule(),
            new AbductionRule(),
            new ComparisonRule()
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

    static getComparisonRule() {
        return new ComparisonRule();
    }
}