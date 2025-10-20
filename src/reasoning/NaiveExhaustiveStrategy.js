import { ReasoningStrategy } from './ReasoningStrategy.js';

/**
 * A naive, exhaustive reasoning strategy that iterates through all task combinations.
 * Computationally expensive, but useful for ensuring correctness.
 */
export class NaiveExhaustiveStrategy extends ReasoningStrategy {
    async execute(memory, rules, termFactory) {
        const tasks = memory.getAllConcepts().flatMap(c => c.getAllTasks());
        const derivedTasks = new Set();

        const addDerived = (newTasks) => newTasks.forEach(t => derivedTasks.add(t));

        for (const rule of rules) {
            switch (rule.premises.length) {
                case 1:
                    for (const task of tasks) {
                        addDerived(await rule._apply([task], termFactory));
                    }
                    break;

                case 2:
                    if (tasks.length < 2) continue;
                    for (let i = 0; i < tasks.length; i++) {
                        for (let j = i + 1; j < tasks.length; j++) {
                            const task1 = tasks[i];
                            const task2 = tasks[j];

                            // Test both premise permutations
                            addDerived(await rule._apply([task1, task2], termFactory));
                            addDerived(await rule._apply([task2, task1], termFactory));
                        }
                    }
                    break;
            }
        }

        return Array.from(derivedTasks);
    }
}
