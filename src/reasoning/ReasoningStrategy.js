export class ReasoningStrategy {
    async execute(memory, rules, termFactory) {
        throw new Error('ReasoningStrategy.execute must be implemented by subclasses');
    }
}
