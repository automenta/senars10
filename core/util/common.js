// Value utilities
export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
export const normalize = (val, max) => Math.min(val / max, 1);

// Execution utilities
export const safeExecute = (fn, ...args) => {
    try {
        return fn(...args);
    } catch {
        return null;
    }
};

// Object utilities
export const freeze = Object.freeze;
export const deepFreeze = obj => {
    if (obj === null || typeof obj !== 'object') return obj;
    Object.getOwnPropertyNames(obj).forEach(prop => {
        if (obj[prop] !== null && typeof obj[prop] === 'object') deepFreeze(obj[prop]);
    });
    return freeze(obj);
};

// Object transformation utilities
export const clampAndFreeze = (obj, min = 0, max = 1) =>
    typeof obj === 'number' ? freeze(clamp(obj, min, max)) :
        freeze(Object.fromEntries(Object.entries(obj).map(([k, v]) =>
            [k, typeof v === 'number' ? clamp(v, min, max) : v])));

// Configuration utilities
export const mergeConfig = (base, ...overrides) =>
    freeze(overrides.reduce((acc, cfg) => ({...acc, ...cfg}), {...base}));
