import Component from '../base/Component.js';
import { Logger } from '../base/utilities.js';
import { DEFAULTS } from '../base/constants.js';

/**
 * Bag - Priority-based collection with statistical sampling
 * Implements a priority queue with statistical sampling based on priority weights
 */
class Bag extends Component {
  constructor(capacity = DEFAULTS.BAG_CAPACITY || 1000) {
    super();
    this.capacity = capacity;
    this.items = new Map(); // Maps item keys to { item, priority, timestamp }
    this.totalPriority = 0; // Sum of all priorities for sampling
    this.stats = {
      insertions: 0,
      removals: 0,
      samples: 0,
      evictions: 0
    };
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.capacity = config.capacity ?? this.capacity;
    this.items.clear();
    this.totalPriority = 0;
    this.stats = {
      insertions: 0,
      removals: 0,
      samples: 0,
      evictions: 0
    };
  }

  /**
   * Add or update an item in the bag with a priority
   * @param {string} key - Unique key for the item
   * @param {*} item - The item to store
   * @param {number} priority - Priority value (0-1)
   * @param {Object} metadata - Optional metadata
   */
  put(key, item, priority = 0.5, metadata = {}) {
    priority = Math.max(0, Math.min(1, priority)); // Clamp between 0 and 1

    const existing = this.items.get(key);
    if (existing) {
      // Update existing item
      this.totalPriority = this.totalPriority - existing.priority + priority;
      this.items.set(key, {
        item,
        priority,
        timestamp: Date.now(),
        metadata: { ...existing.metadata, ...metadata }
      });
    } else {
      // Add new item
      if (this.items.size >= this.capacity) {
        this._evictLowestPriority();
      }

      this.items.set(key, {
        item,
        priority,
        timestamp: Date.now(),
        metadata
      });
      this.totalPriority += priority;
      this.stats.insertions++;
    }
  }

  /**
   * Get an item by key
   * @param {string} key - Item key
   * @returns {*} The item or undefined
   */
  get(key) {
    const entry = this.items.get(key);
    return entry ? entry.item : undefined;
  }

  /**
   * Get an item with its priority and metadata
   * @param {string} key - Item key
   * @returns {Object} { item, priority, metadata, timestamp } or null
   */
  getWithPriority(key) {
    const entry = this.items.get(key);
    if (!entry) return null;

    return {
      item: entry.item,
      priority: entry.priority,
      metadata: entry.metadata,
      timestamp: entry.timestamp
    };
  }

  /**
   * Statistically sample an item based on priorities
   * @returns {Object|null} { item, key, priority, metadata } or null if empty
   */
  sample() {
    if (this.items.size === 0) {
      return null;
    }

    if (this.items.size === 1) {
      const [key, entry] = this.items.entries().next().value;
      this.stats.samples++;
      return {
        item: entry.item,
        key,
        priority: entry.priority,
        metadata: entry.metadata
      };
    }

    // Use the cumulative priority to select an item
    const random = Math.random() * this.totalPriority;
    let cumulativePriority = 0;

    for (const [key, entry] of this.items.entries()) {
      cumulativePriority += entry.priority;
      if (random <= cumulativePriority) {
        this.stats.samples++;
        return {
          item: entry.item,
          key,
          priority: entry.priority,
          metadata: entry.metadata
        };
      }
    }

    // Fallback (should not happen under normal conditions)
    const [key, entry] = this.items.entries().next().value;
    this.stats.samples++;
    return {
      item: entry.item,
      key,
      priority: entry.priority,
      metadata: entry.metadata
    };
  }

  /**
   * Get multiple samples without replacement
   * @param {number} count - Number of items to sample
   * @returns {Array} Array of sampled items
   */
  sampleMultiple(count) {
    if (count >= this.items.size) {
      return this.getAll();
    }

    const results = [];
    const tempBag = new Bag(this.items.size);

    // Copy items to temporary bag
    for (const [key, entry] of this.items.entries()) {
      tempBag.put(key, entry.item, entry.priority, entry.metadata);
    }

    // Sample without replacement
    for (let i = 0; i < count && tempBag.size() > 0; i++) {
      const sampled = tempBag.sample();
      if (sampled) {
        results.push(sampled);
        tempBag.remove(sampled.key);
      }
    }

    return results;
  }

  /**
   * Get all items sorted by priority
   * @param {number} limit - Maximum number of items to return
   * @returns {Array} Array of { item, key, priority, metadata } sorted by priority
   */
  getAll(limit = Infinity) {
    const items = [];
    for (const [key, entry] of this.items.entries()) {
      items.push({
        item: entry.item,
        key,
        priority: entry.priority,
        metadata: entry.metadata
      });
    }

    items.sort((a, b) => b.priority - a.priority);
    return items.slice(0, limit);
  }

  /**
   * Remove an item by key
   * @param {string} key - Item key
   * @returns {boolean} True if item was removed
   */
  remove(key) {
    const entry = this.items.get(key);
    if (!entry) return false;

    this.totalPriority -= entry.priority;
    this.items.delete(key);
    this.stats.removals++;
    return true;
  }

  /**
   * Get the number of items in the bag
   */
  size() {
    return this.items.size;
  }

  /**
   * Check if the bag is empty
   */
  isEmpty() {
    return this.items.size === 0;
  }

  /**
   * Clear all items from the bag
   */
  clear() {
    this.items.clear();
    this.totalPriority = 0;
  }

  /**
   * Update the priority of an existing item
   * @param {string} key - Item key
   * @param {number} newPriority - New priority value
   */
  updatePriority(key, newPriority) {
    const entry = this.items.get(key);
    if (!entry) return false;

    newPriority = Math.max(0, Math.min(1, newPriority));
    this.totalPriority = this.totalPriority - entry.priority + newPriority;
    entry.priority = newPriority;
    entry.timestamp = Date.now();
    return true;
  }

  /**
   * Get statistics about the bag
   */
  getStats() {
    return {
      size: this.size(),
      capacity: this.capacity,
      utilization: this.size() / this.capacity,
      totalPriority: this.totalPriority,
      insertions: this.stats.insertions,
      removals: this.stats.removals,
      samples: this.stats.samples,
      evictions: this.stats.evictions,
      avgPriority: this.totalPriority / Math.max(1, this.size())
    };
  }

  /**
   * Evict the lowest priority item when capacity is exceeded
   * @private
   */
  _evictLowestPriority() {
    if (this.items.size === 0) return;

    let lowestPriority = Infinity;
    let lowestKey = null;

    for (const [key, entry] of this.items.entries()) {
      if (entry.priority < lowestPriority) {
        lowestPriority = entry.priority;
        lowestKey = key;
      }
    }

    if (lowestKey) {
      const entry = this.items.get(lowestKey);
      this.totalPriority -= entry.priority;
      this.items.delete(lowestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Decay priorities over time to devalue older items
   * @param {number} decayRate - Rate at which priorities decay (0-1)
   */
  decay(decayRate = DEFAULTS.DECAY_RATE || 0.001) {
    const keysToAdjust = [];
    let priorityAdjustment = 0;

    for (const [key, entry] of this.items.entries()) {
      const newPriority = entry.priority * (1 - decayRate);
      keysToAdjust.push({ key, newPriority });
      priorityAdjustment += (entry.priority - newPriority);
    }

    // Apply updates
    for (const { key, newPriority } of keysToAdjust) {
      if (newPriority < 0.001) { // Remove very low priority items
        this.remove(key);
      } else {
        const entry = this.items.get(key);
        this.totalPriority -= entry.priority - newPriority;
        entry.priority = newPriority;
      }
    }
  }
}

export default Bag;