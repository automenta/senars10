import Component from '../base/Component.js';
import { Cache, Storage, IndexManager } from '../base/collections.js';
import { Logger, ObjectUtils, ArrayUtils } from '../base/utilities.js';
import { Validation } from '../base/validation.js';
import { DEFAULTS } from '../base/constants.js';

class Focus extends Component {
  constructor() {
    super();
    this.focusSets = new Map();
    this.currentFocus = null;
    this.focusSize = DEFAULTS.FOCUS_SIZE;
  }

  createFocusSet(name, maxSize = this.focusSize) {
    Validation.ensureCondition(!this.focusSets.has(name), `Focus set '${name}' already exists`);
    this.focusSets.set(name, {
      items: new Map(),
      maxSize,
      accessCount: 0,
      lastAccessed: Date.now(),
      createdAt: Date.now(),
      attentionScore: 0,
      decayFactor: DEFAULTS.ATTENTION_DECAY
    });
  }

  setFocus(name) {
    Validation.ensureCondition(this.focusSets.has(name), `Focus set '${name}' does not exist`);
    this.currentFocus = name;
  }

  getCurrentFocus() {
    return this.currentFocus;
  }

  getFocusItems(count = 10) {
    const focusSet = this.focusSets.get(this.currentFocus);
    if (!focusSet) return [];

    focusSet.lastAccessed = Date.now();
    focusSet.accessCount++;

    const sortedEntries = Array.from(focusSet.items.entries())
      .sort(([, dataA], [, dataB]) => {
        const [priorityA, priorityB] = [(dataA.priority || 0), (dataB.priority || 0)];
        if (priorityA !== priorityB) return priorityB - priorityA;

        const [timestampA, timestampB] = [(dataA.timestamp || 0), (dataB.timestamp || 0)];
        if (timestampA !== timestampB) return timestampB - timestampA;

        const [accessCountA, accessCountB] = [(dataA.accessCount || 0), (dataB.accessCount || 0)];
        return accessCountB - accessCountA;
      })
      .slice(0, count)
      .map(([key, value]) => {
        value.accessCount = (value.accessCount || 0) + 1;
        return [key, value];
      });

    return sortedEntries;
  }

  updateFocusAttention(name, delta) {
    const focusSet = this.focusSets.get(name);
    if (focusSet) {
      focusSet.attentionScore = Math.max(0, Math.min(1, (focusSet.attentionScore || 0) + delta));
    }
  }

  getFocusSetStats() {
    const stats = {};
    this.focusSets.forEach((data, name) => {
      stats[name] = {
        size: data.items.size,
        maxSize: data.maxSize,
        accessCount: data.accessCount,
        attentionScore: data.attentionScore,
        utilization: data.items.size / data.maxSize,
        age: Date.now() - data.createdAt
      };
    });
    return stats;
  }

  updateFocusSets(key, options) {
    const { focusSet, priority = 0 } = options;
    if (!focusSet || !this.focusSets.has(focusSet)) return;

    const focusData = this.focusSets.get(focusSet);
    if (focusData.items.has(key)) return;

    focusData.items.set(key, { priority, timestamp: Date.now() });
    if (focusData.items.size > focusData.maxSize) {
      const firstKey = focusData.items.keys().next().value;
      focusData.items.delete(firstKey);
    }
  }

  removeFromFocusSets(key) {
    this.focusSets.forEach(focusData => focusData.items.delete(key));
  }

  clear() {
    this.focusSets.clear();
    this.currentFocus = null;
  }
}

class Memory extends Component {
  constructor(focus = null) {
    super();
    this.storage = new Storage();
    this.cache = new Cache(DEFAULTS.CACHE_SIZE);
    this.focus = focus;
    this.indexes = new IndexManager();
  }

  async _doInitialize(config = {}) {
    this.storage.clear();
    if (config.cacheSize) {
      this.cache = new Cache(config.cacheSize);
    }
    if (this.focus) {
      this.focus.focusSize = config.focusSize || DEFAULTS.FOCUS_SIZE;
      this.focus.currentFocus = config.defaultFocus || null;
      this.focus.focusSets.clear();
    }
    this.indexes.clear();
  }

  get(key) {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    // Get from storage if not in cache
    const value = this.storage.get(key);
    if (value !== undefined) {
      // Add to cache
      this.cache.set(key, value);
    }
    return value;
  }

  set(key, value, options = {}) {
    this.storage.set(key, value);
    this.cache.set(key, value);
    this._updateIndexes(key, options);
    this._updateFocusSets(key, options);
  }

  delete(key) {
    if (!this.storage.has(key)) return false;
    this.cache.delete(key);
    this.storage.delete(key);
    this._removeFromIndexes(key);
    this._removeFromFocusSets(key);
    return true;
  }

  clear() {
    this.storage.clear();
    this.cache.clear();
    this.indexes.clear();
    this.focus?.clear();
  }

  has(key) {
    // Check cache first, then storage
    return this.cache.has(key) || this.storage.has(key);
  }

  createFocusSet(name, maxSize = this.focus?.focusSize) {
    this.focus?.createFocusSet(name, maxSize);
  }

  setFocus(name) {
    this.focus?.setFocus(name);
  }

  getCurrentFocus() {
    return this.focus?.getCurrentFocus();
  }

  getFocusItems(count = 10) {
    return this.focus?.getFocusItems(count) || [];
  }

  query(criteria = {}) {
    const {
      type,
      tags,
      minPriority,
      limit = DEFAULTS.QUERY_LIMIT,
      sortBy,
      sortOrder = 'desc'
    } = criteria;

    // Start with all keys from storage
    let candidates = new Set(this.storage.keys());

    // Apply filters - early return if no candidates remain
    if (type && !(candidates = this._intersectKeys(candidates, this.indexes.get(type))).size) return [];

    if (tags?.length && candidates.size &&
        !(candidates = this._intersectTags(candidates, tags)).size) return [];

    if (minPriority !== undefined && candidates.size &&
        !(candidates = this._intersectPriority(candidates, minPriority)).size) return [];

    // Get the actual data for the candidate keys
    let results = Array.from(candidates)
      .slice(0, limit)
      .map(key => [key, this.get(key)])
      .filter(([, value]) => value !== undefined);

    // Apply sorting if specified
    if (sortBy) {
      results.sort((a, b) => {
        const valA = this._getSortValue(a[1], sortBy);
        const valB = this._getSortValue(b[1], sortBy);
        return sortOrder === 'desc' ? valB - valA : valA - valB;
      });
    }

    return results;
  }

  _intersectKeys(candidates, keys) {
    return this.indexes.intersect(candidates, key => keys.includes(key));
  }

  _intersectTags(candidates, tags) {
    const tagCandidates = new Set(tags.flatMap(tag => this.indexes.get(tag)));
    return this.indexes.intersect(candidates, key => tagCandidates.has(key));
  }

  _intersectPriority(candidates, minPriority) {
    const priorityKeys = new Set();
    for (let priority = minPriority; priority <= DEFAULTS.PRIORITY_LEVELS; priority++) {
      this.indexes.get(`priority_${priority}`).forEach(key => priorityKeys.add(key));
    }
    return this.indexes.intersect(candidates, key => priorityKeys.has(key));
  }

  _getSortValue(item, sortBy) {
    if (!item) return 0;

    switch (sortBy) {
      case 'priority': return item.priority || 0;
      case 'timestamp': return item.timestamp || 0;
      case 'accessCount': return item.accessCount || 0;
      case 'key': return item.key || '';
      default: return 0;
    }
  }

  getQueryStats() {
    return {
      totalKeys: this.storage.size(),
      cachedKeys: this.cache.size,
      focusSets: this.focus?.focusSets.size || 0,
      indexes: this.indexes.indexes.size,
      cacheHitRate: this.cache.hitRate || 0
    };
  }

  optimizeIndexes() {
    const usedTypes = new Set();
    for (const [key, value] of this.storage.entries()) {
      if (value._metadata) {
        const { type, tags } = value._metadata;
        if (type) usedTypes.add(type);
        if (tags) tags.forEach(tag => usedTypes.add(tag));
      }
    }

    for (const type of this.indexes.indexes.keys()) {
      if (!usedTypes.has(type) && !type.startsWith('priority_')) {
        this.indexes.indexes.delete(type);
      }
    }
  }

  getStats() {
    return {
      storageSize: this.storage.size(),
      itemCount: this.storage.size(), // Add itemCount property that matches storageSize
      cacheSize: this.cache.size,
      cacheMaxSize: this.cache.cache.maxSize,
      focusSets: this.focus?.getFocusSetStats() || {},
      indexes: this.indexes.indexes.size
    };
  }

  _updateIndexes(key, options) {
    const { type, tags, priority } = options;

    if (type) this.indexes.add(type, key);
    if (tags && Array.isArray(tags)) {
      tags.forEach(tag => this.indexes.add(tag, key));
    }
    if (priority !== undefined) this.indexes.add(`priority_${priority}`, key);
  }

  _removeFromIndexes(key) {
    // IndexManager handles cleanup automatically in remove method
    for (const [type] of this.indexes.indexes.entries()) {
      this.indexes.remove(type, key);
    }
  }

  _updateFocusSets(key, options) {
    this.focus?.updateFocusSets(key, options);
  }

  _calculateAttentionScore(itemData, focusData) {
    if (!itemData) return 0;

    const now = Date.now();
    const age = now - (itemData.timestamp || 0);
    const recencyScore = Math.exp(-age / (DEFAULTS.DECAY_HOURS * 60 * 60 * 1000));

    const priorityScore = Math.min((itemData.priority || 0) / DEFAULTS.PRIORITY_LEVELS, 1);
    const frequencyScore = Math.min((itemData.accessCount || 0) / DEFAULTS.ACCESS_WEIGHT, 1);
    const focusAttention = focusData?.attentionScore || 0;

    const PRIORITY_WEIGHT = 0.4;
    const RECENCY_WEIGHT = 0.3;
    const FREQUENCY_WEIGHT = 0.2;
    const FOCUS_WEIGHT = 0.1;

    return (priorityScore * PRIORITY_WEIGHT) +
           (recencyScore * RECENCY_WEIGHT) +
           (frequencyScore * FREQUENCY_WEIGHT) +
           (focusAttention * FOCUS_WEIGHT);
  }

  async consolidateKnowledge() {
    // Perform knowledge consolidation operations
    // This could include:
    // - Compacting similar entries
    // - Removing outdated entries
    // - Updating index structures
    // - Optimizing storage

    // For now, we'll just trigger the index optimization
    this.optimizeIndexes();

    // Emit a consolidation event if messaging is available
    if (this.core?.messages) {
      this.core.messages.emit('memory.consolidated', {
        timestamp: Date.now(),
        storageSize: this.storage.size(),
        indexesSize: this.indexes.indexes.size
      });
    }
  }

  updateFocusAttention(name, delta) {
    this.focus?.updateFocusAttention(name, delta);
  }

  getFocusSetStats() {
    return this.focus?.getFocusSetStats() || {};
  }

  _removeFromFocusSets(key) {
    this.focus?.removeFromFocusSets(key);
  }
}

export default Memory;
export { Focus };