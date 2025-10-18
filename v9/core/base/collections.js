import { DEFAULTS } from './constants.js';

class LRUMap extends Map {
  constructor(maxSize = DEFAULTS.CACHE_SIZE) {
    super();
    this.maxSize = maxSize;
  }

  _touch(key, value) {
    super.delete(key);
    super.set(key, value);
  }

  _evict() {
    if (this.size > this.maxSize) {
      const firstKey = this.keys().next().value;
      super.delete(firstKey);
    }
  }
}

class Cache {
  constructor(maxSize = DEFAULTS.CACHE_SIZE) {
    this.cache = new LRUMap(maxSize);
  }

  get(key) {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.cache._touch(key, value);
      return value;
    }
    return value;
  }

  set(key, value) {
    this.cache._touch(key, value);
    this.cache._evict();
  }

  has(key) {
    return this.cache.has(key);
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }
}

class Storage {
  constructor(options = {}) {
    this.data = new LRUMap(options.maxSize || DEFAULTS.CACHE_SIZE);
    this.enableEvents = options.enableEvents !== false;
    this.eventTarget = options.eventTarget || null;
    this.namespace = options.namespace || 'storage';
  }

  get(key) {
    const value = this.data.get(key);
    if (this.enableEvents && this.eventTarget) {
      this.eventTarget.emit(`${this.namespace}:accessed`, { key, value, action: 'get' });
    }
    return value;
  }

  set(key, value) {
    const previousValue = this.data.get(key);
    this.data._touch(key, value);
    this.data._evict();

    if (this.enableEvents && this.eventTarget) {
      this.eventTarget.emit(`${this.namespace}:changed`, {
        key,
        value,
        previousValue,
        action: 'set'
      });
    }
  }

  delete(key) {
    const deleted = this.data.delete(key);
    if (deleted && this.enableEvents && this.eventTarget) {
      this.eventTarget.emit(`${this.namespace}:changed`, {
        key,
        action: 'delete'
      });
    }
    return deleted;
  }

  has(key) {
    return this.data.has(key);
  }

  clear() {
    this.data.clear();
    if (this.enableEvents && this.eventTarget) {
      this.eventTarget.emit(`${this.namespace}:cleared`, {});
    }
  }

  size() {
    return this.data.size;
  }

  keys() {
    return this.data.keys();
  }

  values() {
    return this.data.values();
  }

  entries() {
    return this.data.entries();
  }

  getOrDefault(key, defaultValue) {
    return this.has(key) ? this.get(key) : defaultValue;
  }

  update(key, updateFn) {
    const currentValue = this.get(key);
    const newValue = updateFn(currentValue);
    this.set(key, newValue);
    return newValue;
  }

  setMany(entries) {
    for (const [key, value] of entries) {
      this.set(key, value);
    }
  }

  deleteMany(keys) {
    for (const key of keys) {
      this.delete(key);
    }
  }

  find(predicate) {
    const results = [];
    for (const [key, value] of this.entries()) {
      if (predicate(value, key)) {
        results.push({ key, value });
      }
    }
    return results;
  }

  filter(predicate) {
    const results = new Map();
    for (const [key, value] of this.entries()) {
      if (predicate(value, key)) {
        results.set(key, value);
      }
    }
    return results;
  }

  getStats() {
    return {
      size: this.size(),
      maxSize: this.data.maxSize,
      utilization: this.size() / this.data.maxSize,
      namespace: this.namespace
    };
  }
}

class IndexManager {
  constructor() {
    this.indexes = new Map();
  }

  add(type, key) {
    if (!this.indexes.has(type)) {
      this.indexes.set(type, new Set());
    }
    this.indexes.get(type).add(key);
  }

  remove(type, key) {
    if (!this.indexes.has(type)) return;
    const keys = this.indexes.get(type);
    keys.delete(key);
    if (keys.size === 0) {
      this.indexes.delete(type);
    }
  }

  get(type) {
    return this.indexes.has(type) ? Array.from(this.indexes.get(type)) : [];
  }

  has(type, key) {
    return this.indexes.has(type) && this.indexes.get(type).has(key);
  }

  clear() {
    this.indexes.clear();
  }

  intersect(candidates, filterFn) {
    return new Set([...candidates].filter(filterFn));
  }

  union(...sets) {
    return new Set(sets.flatMap(set => [...set]));
  }

  difference(setA, setB) {
    return new Set([...setA].filter(item => !setB.has(item)));
  }
}

export { LRUMap, Cache, Storage, IndexManager };