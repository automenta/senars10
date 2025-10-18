// Calculate average of collection
export const calculateAverage = (values) =>
  values.length ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;

// Sort items by a property in ascending or descending order
export const sortByProperty = (items, prop, desc = false) =>
  [...items].sort((a, b) => {
    const valA = a[prop] || 0;
    const valB = b[prop] || 0;
    return desc ? valB - valA : valA - valB;
  });

// Filter items by a predicate function
export const filterBy = (items, predicate) => items.filter(predicate);

// Find an item by a predicate function
export const findBy = (items, predicate) => items.find(predicate);

// Group items by a key function
export const groupBy = (items, keyFn) =>
  items.reduce((groups, item) => {
    const key = keyFn(item) || 'unknown';
    (groups[key] = groups[key] || []).push(item);
    return groups;
  }, {});

// Execute a function for each item in a collection
export const applyToAll = (items, fn) => items.forEach(fn);

// Create a Map from a collection
export const createMap = (items, keyFn, valueFn = (x) => x) =>
  new Map(items.map((item) => [keyFn(item), valueFn(item)]));

// Create a Set from a collection
export const createSet = (items, keyFn = (x) => x) => new Set(items.map(keyFn));
