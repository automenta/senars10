import {ConditionalRule} from './ConditionalRule.js';

/**
 * Conditional reasoning rules (for if-then statements)
 */
export class ConditionalRules {
    static getRules() {
        return [
            new ConditionalRule()
        ];
    }
}