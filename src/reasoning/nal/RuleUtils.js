/**
 * Utility functions for NAL rules to centralize common operations
 */
export class RuleUtils {
    /**
     * Collect tasks from memory and focus
     * @param {Object} context - Context containing memory and focus
     * @returns {Array} - Array of tasks from memory and focus
     */
    static collectTasks(context) {
        const {memory, focus} = context || {};
        const tasks = [];

        if (memory?.getAllTasks) tasks.push(...memory.getAllTasks());
        if (focus?.getCurrentTasks) tasks.push(...focus.getCurrentTasks());

        return tasks;
    }

    /**
     * Filter tasks by matching a specific term
     * @param {Array} tasks - Array of tasks to filter
     * @param {Term} term - The term to match against
     * @param {Function} unifyFn - The unification function to use
     * @returns {Array} - Filtered array of matching tasks
     */
    static filterByTerm(tasks, term, unifyFn) {
        return tasks.filter(task => {
            if (!task?.term) return false;
            const bindings = unifyFn(term, task.term);
            return bindings !== null;
        });
    }

    /**
     * Filter tasks by inheritance pattern
     * @param {Array} tasks - Array of tasks to filter
     * @param {string} operator - The operator to match (e.g., '-->')
     * @returns {Array} - Filtered array of inheritance tasks
     */
    static filterByInheritance(tasks, operator = '-->') {
        return tasks.filter(task =>
            task?.term?.isCompound &&
            task.term.operator === operator &&
            task.term.components?.length === 2
        );
    }

    /**
     * Find tasks matching a specific term from context
     * @param {Term} term - The term to match
     * @param {Object} context - Context containing memory and focus
     * @param {Function} unifyFn - The unification function to use
     * @returns {Array} - Array of matching tasks
     */
    static findTasksByTerm(term, context, unifyFn) {
        const allTasks = RuleUtils.collectTasks(context);
        return RuleUtils.filterByTerm(allTasks, term, unifyFn);
    }

    /**
     * Apply truth value operation
     * @param {Function} operation - The truth operation function
     * @param {Object} t1 - First truth value
     * @param {Object} t2 - Second truth value
     * @returns {Object} - Result of the truth operation
     */
    static applyTruthOperation(operation, t1, t2) {
        return operation(t1, t2);
    }
}