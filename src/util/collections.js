export const calculateAverage = values => values.length ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
export const sortByProperty = (items, prop, desc = false) =>
    [...items].sort((a, b) => (desc ? (b[prop] || 0) - (a[prop] || 0) : (a[prop] || 0) - (b[prop] || 0)));
export const filterBy = (items, predicate) => items.filter(predicate);
export const findBy = (items, predicate) => items.find(predicate);
export const groupBy = (items, keyFn) =>
    items.reduce((groups, item) => ((groups[keyFn(item) || 'unknown'] ||= []).push(item), groups), {});
export const applyToAll = (items, fn) => items.forEach(fn);
export const createMap = (items, keyFn, valueFn = x => x) => new Map(items.map(item => [keyFn(item), valueFn(item)]));
export const createSet = (items, keyFn = x => x) => new Set(items.map(keyFn));
