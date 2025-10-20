import { ReasoningContext } from './ReasoningContext.js';

export class ReasoningStrategy {
    async execute(memory, rules, termFactory) {
        throw new Error('ReasoningStrategy.execute must be implemented by subclasses');
    }

    /**
     * Create a reasoning context from the traditional parameters
     */
    createContext(memory, rules, termFactory) {
        return new ReasoningContext({
            memory,
            termFactory,
            // Note: rules are typically used by the strategy directly
            // rather than stored in the context
        });
    }
}
