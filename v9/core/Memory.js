import Component from './base/Component.js';
import { Logger } from './base/utilities.js';
import { Concept } from './Concept.js';
import { DEFAULTS } from './base/constants.js';
import { Validation } from './base/validation.js';


class IndexManager {
  constructor() {
    this.implicationIndex = new Map();
    this.inheritanceIndexBySubject = new Map();
    this.inheritanceIndexByPredicate = new Map();
    this.similarityIndex = new Map();
    this.operationIndex = new Map();
    this.timeIndex = new Map();
  }

  addTask(task) {
    const {term} = task, taskHash = term.hash, timeKey = Math.floor(task.occurrenceTime / 1000);
    this._ensureTimeIndex(timeKey).add(taskHash);

    const indexOperations = {
      implication: () => term.subject && this._addIndex(this.implicationIndex, term.subject.hash, taskHash),
      inheritance: () => {
        this._addIndexByTerm(this.inheritanceIndexBySubject, term.subject, taskHash);
        this._addIndexByTerm(this.inheritanceIndexByPredicate, term.predicate, taskHash);
      },
      similarity: () => {
        this._addIndexByTerm(this.similarityIndex, term.subject, taskHash);
        this._addIndexByTerm(this.similarityIndex, term.predicate, taskHash);
      },
      operation: () => this._addIndexByTerm(this.operationIndex, term.subject, taskHash)
    };
    indexOperations[term.termType]?.();
  }

  removeTask(task) {
    const {term} = task, taskHash = term.hash, timeKey = Math.floor(task.occurrenceTime / 1000);
    this.timeIndex.get(timeKey)?.delete(taskHash);

    const indexOperations = {
      implication: () => term.subject && this._removeIndex(this.implicationIndex, term.subject.hash, taskHash),
      inheritance: () => {
        this._removeIndexByTerm(this.inheritanceIndexBySubject, term.subject, taskHash);
        this._removeIndexByTerm(this.inheritanceIndexByPredicate, term.predicate, taskHash);
      },
      similarity: () => {
        this._removeIndexByTerm(this.similarityIndex, term.subject, taskHash);
        this._removeIndexByTerm(this.similarityIndex, term.predicate, taskHash);
      },
      operation: () => this._removeIndexByTerm(this.operationIndex, term.subject, taskHash)
    };
    indexOperations[term.termType]?.();
  }

  _ensureTimeIndex(timeKey) {
    return this.timeIndex.has(timeKey) ? this.timeIndex.get(timeKey) : this.timeIndex.set(timeKey, new Set()).get(timeKey);
  }

  _addIndex(index, key, value) {
    this._ensureIndexSet(index, key).add(value);
  }

  _removeIndex(index, key, value) {
    const indexSet = index.get(key);
    if (indexSet) {
      indexSet.delete(value);
      indexSet.size === 0 && index.delete(key);
    }
  }

  _ensureIndexSet(index, key) {
    return index.has(key) ? index.get(key) : index.set(key, new Set()).get(key);
  }

  _addIndexByTerm(index, term, value) {
    term && this._addIndex(index, term.hash, value);
  }

  _removeIndexByTerm(index, term, value) {
    term && this._removeIndex(index, term.hash, value);
  }

  getImplicationHashesByPremise(premiseHash) { return this.implicationIndex.get(premiseHash) || null; }
  getInheritanceHashesByPredicate(predicateHash) { return this.inheritanceIndexByPredicate.get(predicateHash) || null; }
  getInheritanceHashesBySubject(subjectHash) { return this.inheritanceIndexBySubject.get(subjectHash) || null; }
  getSimilarityHashes(termHash) { return this.similarityIndex.get(termHash) || null; }

  getTaskHashesByTimeRange(startTime, endTime) {
    const result = new Set(), startKey = Math.floor(startTime / 1000), endKey = Math.floor(endTime / 1000);
    for (let key = startKey; key <= endKey; key++) {
      const hashes = this.timeIndex.get(key);
      if (hashes) for (const hash of hashes) result.add(hash);
    }
    return Array.from(result);
  }
}

class Memory extends Component {
  constructor(focus = null) {
    super();
    this.conceptStorage = new Map();
    this.longTermTasks = new Map();     // Consolidated tasks in long-term memory
    this.indexManager = new IndexManager();
    this.focus = focus;                 // Reference to focus component (short-term memory)
    this.storage = new Map();           // General storage
    this.cache = new Map();             // Caching layer
    this.indexes = new Map();           // Indexing
    
    // Stats
    this.totalTasks = 0;
    this.consolidationCount = 0;
    this.lastConsolidation = 0;
    
    // Component-specific
    this.isInitialized = false;
  }

  async _doInitialize(config = {}) {
    // Initialize NARS-specific data
    this.conceptStorage.clear();
    this.longTermTasks.clear();
    this.totalTasks = 0;
    
    // Initialize component-specific data
    this.storage.clear();
    this.cache.clear();
    this.indexes.clear();
    
    this.isInitialized = true;
  }

  // NARS-specific methods
  addTask(task, currentTime) {
    this._ensureConceptExistsRecursive(task.term, currentTime);
    const termHash = task.term.hash;
    
    // Add to focus (short-term memory) if we have focus component
    if (this.focus) {
      try {
        // Add to focus - this is now the short-term memory
        this.focus.addTaskToFocus(task, task.getPriority?.() || task.priority || 0.5);
        this.totalTasks++;
      } catch (e) {
        // If focus update fails, continue anyway
        console.warn('Could not add task to focus:', e.message);
      }
    } else {
      // Fallback: add to long-term tasks if no focus available
      if (!this.longTermTasks.has(termHash)) {
        this.longTermTasks.set(termHash, task);
        this.totalTasks++;
      }
    }
    
    const concept = this.conceptStorage.get(termHash);
    concept?.addTask(task);
    this.indexManager.addTask(task);
  }

  getTask(termHash) { 
    // First check focus (short-term memory), then long-term memory
    let task = null;
    if (this.focus) {
      // Look for task in focus
      const focusTasks = this.focus.getTasks();
      task = focusTasks.find(t => t.term && t.term.hash === termHash) || null;
    }
    return task || this.longTermTasks.get(termHash) || null; 
  }

  getImplicationsByPremise(premise) {
    const hashes = this.indexManager.getImplicationHashesByPremise(premise.hash);
    return hashes ? this._getTasksFromHashes(hashes) : null;
  }

  getInheritanceByPredicate(predicate) {
    const hashes = this.indexManager.getInheritanceHashesByPredicate(predicate.hash);
    return hashes ? this._getTasksFromHashes(hashes) : null;
  }

  getInheritanceBySubject(subject) {
    const hashes = this.indexManager.getInheritanceHashesBySubject(subject.hash);
    return hashes ? this._getTasksFromHashes(hashes) : null;
  }

  getSimilarities(term) {
    const hashes = this.indexManager.getSimilarityHashes(term.hash);
    return hashes ? this._getTasksFromHashes(hashes) : null;
  }

  getAllTasks() { 
    const focusTasks = this.focus ? this.focus.getTasks() : [];
    return [...focusTasks, ...this.longTermTasks.values()]; 
  }

  getTasksByTimeRange(startTime, endTime) {
    const hashes = this.indexManager.getTaskHashesByTimeRange(startTime, endTime);
    return this._getTasksFromHashes(hashes);
  }

  createOrGetAtomConcept(name, createdAt) {
    const tempHash = this._simpleHash(name + '_atom');
    if (this.conceptStorage.has(tempHash)) return this.conceptStorage.get(tempHash);
    const newTerm = { name, termType: 'atom', complexity: 1, hash: tempHash };
    const newConcept = new Concept(newTerm, createdAt);
    this.conceptStorage.set(tempHash, newConcept);
    return newConcept;
  }

  removeTask(termHash) {
    let taskToRemove = null;
    let removed = false;
    
    // Try to remove from focus first (short-term memory)
    if (this.focus) {
      removed = this.focus.removeTaskFromFocus(termHash);
      if (removed) {
        // Find the task that was removed from focus
        const focusTasks = this.focus.getTasks();
        taskToRemove = focusTasks.find(t => t.term && t.term.hash === termHash);
      }
    }
    
    // If not in focus, try long-term memory
    if (!removed) {
      taskToRemove = this.longTermTasks.get(termHash);
      if (taskToRemove) {
        this.longTermTasks.delete(termHash);
        removed = true;
      }
    }
    
    if (removed && taskToRemove) {
      this.totalTasks = Math.max(0, this.totalTasks - 1);
      this.indexManager.removeTask(taskToRemove);
    }
    
    return removed;
  }

  consolidate(currentTime) {
    // Handle tasks in focus (short-term memory)
    if (this.focus) {
      const focusTasks = this.focus.getTasks();
      for (const task of focusTasks) {
        if (task.isExpired && task.isExpired(currentTime)) {
          this.removeTask(task.term.hash);
        }
      }
    }
    
    const priorityDecayFactor = 0.001;
    this.getAllTasks().forEach(task => {
      if (task.getAccessedAt && task.getAccessedAt() < currentTime) {
        const currentPriority = typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || 0);
        if (typeof task.setPriority === 'function') {
          task.setPriority(Math.max(0.0, currentPriority - priorityDecayFactor));
        } else {
          task.priority = Math.max(0.0, currentPriority - priorityDecayFactor);
        }
      }
    });
    
    // Move high-priority tasks from focus to long-term memory
    if (this.focus) {
      const tasksToPromote = [];
      const focusTasks = this.focus.getTasks();
      for (const task of focusTasks) {
        const currentPriority = typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || 0);
        if (currentPriority >= 0.7) {
          tasksToPromote.push(task);
        }
      }
      
      for (const task of tasksToPromote) {
        const termHash = task.term.hash;
        // Remove from focus and add to long-term memory
        this.focus.removeTaskFromFocus(termHash);
        this.longTermTasks.set(termHash, task);
      }
    }
    
    this.consolidationCount++;
    this.lastConsolidation = currentTime;
  }

  _getTasksFromHashes(taskHashes) {
    return Array.from(taskHashes).map(hash => this.getTask(hash)).filter(task => task !== null);
  }

  _ensureConceptExistsRecursive(term, currentTime) {
    if (term.components?.length) term.components.forEach(component => this._ensureConceptExistsRecursive(component, currentTime));
    !this.conceptStorage.has(term.hash) && this.conceptStorage.set(term.hash, new Concept(term, currentTime));
  }

  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  getTopConcepts(n = 10) {
    if (this.conceptStorage.size === 0) return [];
    return this._getTopItems(n, (hash, concept) => ({
      id: hash,
      concept,
      term: concept.term,
      taskCount: concept.taskTable?.size || 0,
      priority: concept.taskTable?.size || 0,
      createdAt: concept.createdAt || Date.now()
    }), 'taskCount');
  }

  getTopTasks(n = 10) {
    const allTasks = this.getAllTasks();
    if (allTasks.length === 0) return [];
    return this._getTopItems(n, task => task, this._getTaskPriority);
  }

  _getTopItems(n, mapper, sortKeyOrFn) {
    const items = Array.from(this.conceptStorage.entries()).map(([hash, concept]) => mapper(hash, concept));
    return items.sort((a, b) => {
      const aVal = typeof sortKeyOrFn === 'function' ? sortKeyOrFn(a) : a[sortKeyOrFn];
      const bVal = typeof sortKeyOrFn === 'function' ? sortKeyOrFn(b) : b[sortKeyOrFn];
      return bVal - aVal;
    }).slice(0, n);
  }

  _getTaskPriority(task) {
    return task.getPriority?.() || task.priority || 0.5;
  }
  
  // Component interface methods for general storage functionality
  get(key) {
    // Check cache first
    if (this.cache.has(key)) return this.cache.get(key);
    
    // Check storage
    if (this.storage.has(key)) {
      const value = this.storage.get(key);
      // Add to cache
      this.cache.set(key, value);
      return value;
    }
    
    return undefined;
  }

  set(key, value, options = {}) {
    this.storage.set(key, value);
    this.cache.set(key, value);
    
    // Update indexes if provided
    const { type, tags, priority } = options;
    if (type) this._updateIndex(type, key);
    if (tags && Array.isArray(tags)) {
      tags.forEach(tag => this._updateIndex(tag, key));
    }
    if (priority !== undefined) this._updateIndex(`priority_${priority}`, key);
  }

  has(key) {
    return this.cache.has(key) || this.storage.has(key);
  }

  delete(key) {
    const existed = this.storage.has(key);
    this.cache.delete(key);
    this.storage.delete(key);
    
    // Remove from all indexes
    for (const indexSet of this.indexes.values()) {
      indexSet.delete(key);
    }
    
    return existed;
  }

  clear() {
    this.storage.clear();
    this.cache.clear();
    this.indexes.clear();
    this.longTermTasks.clear();
    this.conceptStorage.clear();
    if (this.focus) {
      this.focus.clear();
    }
  }

  clear() {
    this.storage.clear();
    this.cache.clear();
    this.indexes.clear();
    this.longTermTasks.clear();
    this.conceptStorage.clear();
    if (this.focus) {
      this.focus.clear();
    }
  }

  // Helper for indexing
  _updateIndex(indexName, key) {
    if (!this.indexes.has(indexName)) {
      this.indexes.set(indexName, new Set());
    }
    this.indexes.get(indexName).add(key);
  }

  query(criteria = {}) {
    const { type, tags, minPriority, limit = DEFAULTS.QUERY_LIMIT } = criteria;
    
    let candidates = new Set(this.storage.keys());
    
    // Apply filters
    if (type) {
      const typeKeys = this.indexes.get(type) || new Set();
      candidates = new Set([...candidates].filter(key => typeKeys.has(key)));
    }
    
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        const tagKeys = this.indexes.get(tag) || new Set();
        candidates = new Set([...candidates].filter(key => tagKeys.has(key)));
      }
    }
    
    if (minPriority !== undefined) {
      const priorityKeys = new Set();
      for (const [indexName, keys] of this.indexes.entries()) {
        if (indexName.startsWith('priority_')) {
          const priority = parseFloat(indexName.split('_')[1]);
          if (priority >= minPriority) {
            for (const key of keys) {
              priorityKeys.add(key);
            }
          }
        }
      }
      candidates = new Set([...candidates].filter(key => priorityKeys.has(key)));
    }
    
    // Get values and limit results
    const results = [...candidates].slice(0, limit).map(key => ({ key, value: this.get(key) }));
    
    return results;
  }

  getStats() {
    return {
      storageSize: this.storage.size,
      cacheSize: this.cache.size,
      indexesSize: this.indexes.size,
      ...super.getStats(), // Include base component stats
      // NARS-specific stats
      totalTasks: this.totalTasks,
      shortTermTasks: this.focus ? this.focus.getTasks().length : 0,  // Focus represents short-term memory
      longTermTasks: this.longTermTasks.size,
      concepts: this.conceptStorage.size,
      consolidationCount: this.consolidationCount,
      focusSets: this.focus ? this.focus.getFocusSetStats() : {}
    };
  }
}

export default Memory;