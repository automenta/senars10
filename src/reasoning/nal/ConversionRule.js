import {NALRule} from './NALRule.js';
import {Term} from '../../term/Term.js';

/**
 * Conversion Rule: Reverses inheritance relationships
 */
export class ConversionRule extends NALRule {
    constructor() {
        super('conversion', {
            name: 'Conversion Rule',
            description: 'Reverses inheritance: If <a --> b> then <b --> a>',
            priority: 0.4,
            category: 'syllogistic'
        });
    }

    _matches(task, context) {
        // Apply to inheritance statements <a --> b>
        return task.term?.isCompound &&
            task.term.operator === '-->' &&
            task.term.components?.length === 2;
    }

    async _apply(task, context) {
        const results = [];

        if (!task.term?.isCompound || task.term.operator !== '-->' || task.term.components?.length !== 2) {
            return results;
        }

        const [subject, predicate] = task.term.components;

        // Create a conversion: swap subject and predicate to get <b --> a>
        const convertedTerm = new Term(
            'compound',
            `(${predicate.name} --> ${subject.name})`,
            [predicate, subject],
            '-->'
        );

        // Calculate truth value using conversion logic
        const derivedTruth = this._calculateConversionTruth(task.truth);

        const conversionTask = this._createDerivedTask(task, {
            term: convertedTerm,
            truth: derivedTruth,
            type: task.type, // Preserve the original task type
            priority: task.budget.priority * this.priority
        });

        results.push(conversionTask);

        return results;
    }

    _calculateConversionTruth(truth) {
        if (!truth) return {f: 0.9, c: 0.1}; // Default truth for conversion

        // Conversion: preserve frequency, reduce confidence
        const frequency = truth.f;
        const confidence = truth.c * 0.5; // Conversion reduces confidence

        return {f: frequency, c: confidence};
    }
}