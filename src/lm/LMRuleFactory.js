import {LMRule} from '../reasoning/LMRule.js';

/**
 * Factory for creating LM rules with common configurations
 */
export class LMRuleFactory {
    /**
     * Creates an LM rule with the specified parameters
     */
    static create(id, lm, promptTemplate, responseProcessor, priority = 1.0, config = {}) {
        if (!id || !lm || !promptTemplate || !responseProcessor) {
            throw new Error('LMRuleFactory.create: `id`, `lm`, `promptTemplate`, and `responseProcessor` are required.');
        }

        return new LMRule(id, lm, promptTemplate, responseProcessor, priority, config);
    }

    /**
     * Creates a simple LM rule that generates tasks based on a template
     */
    static createSimple(id, lm, promptTemplate, priority = 1.0, config = {}) {
        const responseProcessor = async (lmResponse, task) => {
            // Basic response processing - in a real implementation, this would parse
            // the LM response and convert it to proper NARS tasks
            if (!lmResponse) return [];

            // For now, return a simple placeholder task
            // In a real system, this would parse the response and create proper Task objects
            return [];
        };

        return this.create(id, lm, promptTemplate, responseProcessor, priority, config);
    }

    /**
     * Creates an inference-generating LM rule
     */
    static createInferenceRule(id, lm, priority = 1.0, config = {}) {
        const promptTemplate = `Given the task "{{taskTerm}}" of type "{{taskType}}" with truth value "{{taskTruth}}", please generate a logical inference or conclusion based on this information. Respond with a valid Narsese statement.`;

        const responseProcessor = async (lmResponse, task) => {
            if (!lmResponse) return [];

            // In a real implementation, this would parse the LM response
            // and convert it to proper Task objects
            // For now, return empty array as placeholder
            return [];
        };

        return this.create(id, lm, promptTemplate, responseProcessor, priority, config);
    }

    /**
     * Creates a hypothesis generation LM rule
     */
    static createHypothesisRule(id, lm, priority = 1.0, config = {}) {
        const promptTemplate = `Given the task "{{taskTerm}}" of type "{{taskType}}" with truth value "{{taskTruth}}", please generate a plausible hypothesis that could explain or relate to this information. Respond with a valid Narsese statement.`;

        const responseProcessor = async (lmResponse, task) => {
            if (!lmResponse) return [];

            // In a real implementation, this would parse the LM response
            // and convert it to proper Task objects
            // For now, return empty array as placeholder
            return [];
        };

        return this.create(id, lm, promptTemplate, responseProcessor, priority, config);
    }
}