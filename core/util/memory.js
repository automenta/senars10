// Collect tasks from all concepts in memory
export const collectTasksFromAllConcepts = (memory, filterFn = null) => {
    const allTasks = [];
    for (const concept of memory.getAllConcepts()) {
        const tasks = filterFn ? concept.getAllTasks().filter(filterFn) : concept.getAllTasks();
        allTasks.push(...tasks);
    }
    return allTasks;
};
