import { ReasoningStrategy } from './ReasoningStrategy.js';

/**
 * A naive and exhaustive reasoning strategy.
 * This strategy iterates through every possible combination of tasks to find
 * premises that match the rules. It is computationally expensive but useful for
 * debugging and ensuring correctness.
 */
export class NaiveExhaustiveStrategy extends ReasoningStrategy {
    /**
     * Executes the strategy by finding all possible rule applications.
     * @param {Memory} memory - The knowledge base.
     * @param {NALRule[]} rules - The set of inference rules.
     * @param {TermFactory} termFactory - The factory for creating terms.
     * @returns {Promise<Task[]>} A promise that resolves to an array of new tasks.
     */
    async execute(memory, rules, termFactory) {
        const allTasks = memory.getAllConcepts().flatMap(c => c.getAllTasks());
        const allDerivedTasks = [];

        for (const rule of rules) {
            const numPremises = rule.premises.length;

            if (numPremises === 1) {
                // For unary rules, apply to each task individually.
                for (const task of allTasks) {
                    const derived = await rule._apply([task], termFactory);
                    allDerivedTasks.push(...derived);
                }
            } else if (numPremises === 2) {
                // For binary rules, try every permutation of two distinct tasks.
                if (allTasks.length < 2) continue;

                for (let i = 0; i < allTasks.length; i++) {
                    for (let j = 0; j < allTasks.length; j++) {
                        if (i === j) continue;

                        const task1 = allTasks[i];
                        const task2 = allTasks[j];

                        // The rule's _apply method will check if the terms unify correctly
                        // with the premises in this order.
                        const derived = await rule._apply([task1, task2], termFactory);
                        allDerivedTasks.push(...derived);
                    }
                }
            }
            // Note: This strategy currently only supports rules with 1 or 2 premises.
            // A more general implementation would handle n-ary rules.
        }

        return allDerivedTasks;
    }
}
