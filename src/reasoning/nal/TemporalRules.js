import {TemporalDeductionRule} from './TemporalDeductionRule.js';

/**
 * Temporal reasoning rules (for time-based statements)
 */
export class TemporalRules {
    static getRules() {
        return [
            new TemporalDeductionRule()
        ];
    }
}