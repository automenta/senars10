// Bounded value utility
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Normalize value to 0-1 range
export const normalize = (value, max) => Math.min(value / max, 1);

// Execute function safely, returning null on error
export const safeExecute = (fn, ...args) => {
    try {
        return fn(...args);
    } catch (error) {
        return null;
    }
};

// Object freezing utility
export const freezeObject = Object.freeze;

// Deep freeze utility
export const deepFreeze = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;

    Object.getOwnPropertyNames(obj).forEach(prop => {
        if (obj[prop] !== null && typeof obj[prop] === 'object') {
            deepFreeze(obj[prop]);
        }
    });

    return freezeObject(obj);
};

// Clamp and freeze object properties
export const clampAndFreeze = (obj, min = 0, max = 1) => {
    if (typeof obj === 'number') return clamp(obj, min, max);

    const clamped = {...obj};
    for (const [key, value] of Object.entries(clamped)) {
        if (typeof value === 'number') clamped[key] = clamp(value, min, max);
    }
    return freezeObject(clamped);
};
