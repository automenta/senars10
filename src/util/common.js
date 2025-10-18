// Bounded value utility
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Normalize value to 0-1 range
export const normalize = (value, max) => Math.min(value / max, 1);

// Calculate average of collection
export const calculateAverage = (values) => values.length ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;

// Sort items by priority in descending order
export const sortByPriority = (items) => [...items].sort((a, b) => (b.priority || 0) - (a.priority || 0));

// Filter items by minimum value
export const filterByMinValue = (items, minValue, valueFn) => items.filter(item => valueFn(item) >= minValue);

// Find item matching specific term
export const findByTerm = (items, term) => items.find(item => item.term?.equals(term));

// Group items by type
export const groupByType = (items) => items.reduce((groups, item) => {
    const type = item.type || 'unknown';
    const group = groups[type] || [];
    return {...groups, [type]: [...group, item]};
}, {});

// Execute function for each item in collection
export const applyToAll = (items, fn) => items.forEach(fn);

// Execute function safely, returning null on error
export const safeExecute = (fn, ...args) => {
    try {
        return fn(...args);
    } catch (error) {
        return null;
    }
};

// Create a Map from collection
export const createMap = (items, keyFn, valueFn = x => x) =>
    items.reduce((map, item) => map.set(keyFn(item), valueFn(item)) || map, new Map());

// Create a Set from collection
export const createSet = (items, keyFn = x => x) => new Set(items.map(keyFn));

// Debounce function execution
export const debounce = (func, wait) => {
    let timeoutId = null;

    const debouncedFunc = (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), wait);
    };

    debouncedFunc.cancel = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    return debouncedFunc;
};

// Throttle function execution
export const throttle = (fn, delay) => {
    let lastCall = 0;
    return (...args) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            fn(...args);
        }
    };
};

// Collect tasks from all concepts in memory
export const collectTasksFromAllConcepts = (memory, filterFn = null) => {
    const allTasks = [];
    for (const concept of memory.getAllConcepts()) {
        const tasks = filterFn ? concept.getAllTasks().filter(filterFn) : concept.getAllTasks();
        allTasks.push(...tasks);
    }
    return allTasks;
};

// Object freezing utility
export const freezeObject = Object.freeze;

// Clamp and freeze object properties
export const clampAndFreeze = (obj, min = 0, max = 1) => {
    if (typeof obj === 'number') return clamp(obj, min, max);

    const clamped = {...obj};
    for (const [key, value] of Object.entries(clamped)) {
        if (typeof value === 'number') clamped[key] = clamp(value, min, max);
    }
    return freezeObject(clamped);
};