import Component from './base/Component.js';
import { DEFAULTS } from './base/constants.js';
import { Validation } from './base/validation.js';

// Focus class - manages attention focus sets (short-term memory)
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
      tasks: new Map(),  // Store actual task objects in focus (short-term memory)
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

    // Create pairs of [key, taskData] where taskData includes both the task and metadata
    const taskPairs = Array.from(focusSet.tasks.entries()).map(([key, task]) => {
      // Get metadata from items map if it exists (for backward compatibility)
      let taskData = task;
      if (focusSet.items && focusSet.items.has(key)) {
        const itemMetadata = focusSet.items.get(key);
        // Combine task with metadata
        //taskData = { task, ...itemMetadata, priority: itemMetadata.priority };
        taskData = task;
      } else {
        // Create a metadata object based on the task
        const priority = typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || 0);
        //taskData = { ...task, priority: priority, timestamp: task.timestamp || Date.now() };
        taskData = task;
      }

      return [key, taskData];
    });

    // Sort by priority and timestamp
    const sortedEntries = taskPairs.sort(([, dataA], [, dataB]) => {
      const [priorityA, priorityB] = [
        (typeof dataA.getPriority === 'function' ? dataA.getPriority() : (dataA.priority || 0)),
        (typeof dataB.getPriority === 'function' ? dataB.getPriority() : (dataB.priority || 0))
      ];
      if (priorityA !== priorityB) return priorityB - priorityA;

      const [timestampA, timestampB] = [
        (dataA.timestamp || dataA.createdAt || Date.now()),
        (dataB.timestamp || dataB.createdAt || Date.now())
      ];
      if (timestampA !== timestampB) return timestampB - timestampA;

      return 0;
    });

    return sortedEntries.slice(0, count);
  }

  getTasks() {
    const focusSet = this.focusSets.get(this.currentFocus);
    if (!focusSet) return [];
    return Array.from(focusSet.tasks.values());
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
        size: data.tasks.size,
        maxSize: data.maxSize,
        accessCount: data.accessCount,
        attentionScore: data.attentionScore,
        utilization: data.tasks.size / data.maxSize,
        age: Date.now() - data.createdAt
      };
    });
    return stats;
  }

  addTaskToFocus(task, priority) {
    const focusSet = this.focusSets.get(this.currentFocus);
    if (!focusSet) return false;

    const termHash = task.term.hash;
    focusSet.tasks.set(termHash, task);

    // Maintain focus size limit
    if (focusSet.tasks.size > focusSet.maxSize) {
      const firstKey = focusSet.tasks.keys().next().value;
      focusSet.tasks.delete(firstKey);
    }

    return true;
  }

  removeTaskFromFocus(taskHash) {
    let removed = false;
    this.focusSets.forEach(focusSet => {
      if (focusSet.tasks.has(taskHash)) {
        focusSet.tasks.delete(taskHash);
        removed = true;
      }
    });
    return removed;
  }

  // Compatibility method to add items to focus sets (for legacy usage)
  updateFocusSets(key, options) {
    const { focusSet, priority = 0 } = options;
    if (!focusSet || !this.focusSets.has(focusSet)) return;

    // This method is for adding metadata to track items in focus, not the actual tasks
    // In the new architecture where tasks are stored directly in focus, this tracks additional metadata
    const focusData = this.focusSets.get(focusSet);
    if (focusData.items && focusData.items.has(key)) return; // Only create items map if needed for metadata

    // Create items map if it doesn't exist (for backward compatibility)
    if (!focusData.items) {
      focusData.items = new Map();
    }

    focusData.items.set(key, { priority, timestamp: Date.now() });
    if (focusData.items.size > focusData.maxSize) {
      const firstKey = focusData.items.keys().next().value;
      focusData.items.delete(firstKey);
    }
  }

  clear() {
    this.focusSets.forEach(focusSet => {
      focusSet.tasks.clear();
      if (focusSet.items) focusSet.items.clear();
    });
    this.focusSets.clear();
    this.currentFocus = null;
  }
}

export { Focus };
