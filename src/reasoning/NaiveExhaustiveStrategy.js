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
        const existingTasks = memory.getAllConcepts().flatMap(c => c.getAllTasks());
        const allDerivedTasks = new Set(); // Use a Set to avoid duplicates

        for (const rule of rules) {
            const numPremises = rule.premises.length;

            if (numPremises === 1) {
                for (const task of existingTasks) {
                    const derived = await rule._apply([task], termFactory);
                    derived.forEach(t => allDerivedTasks.add(t));
                }
            } else if (numPremises === 2) {
                if (existingTasks.length < 2) continue;

                for (let i = 0; i < existingTasks.length; i++) {
                    for (let j = i + 1; j < existingTasks.length; j++) {
                        const task1 = existingTasks[i];
                        const task2 = existingTasks[j];

                        // The order of premises matters, so we must test both permutations.
                        const derived1 = await rule._apply([task1, task2], termFactory);
                        derived1.forEach(t => allDerivedTasks.add(t));

                        const derived2 = await rule._apply([task2, task1], termFactory);
                        derived2.forEach(t => allDerivedTasks.add(t));
                    }
                }
            }
            // Future-proofing: If rules with more premises are added, they can be handled here.
        }

        return Array.from(allDerivedTasks);
    }
}
