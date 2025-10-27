import fs from 'fs/promises';
import path from 'path';

/**
 * Interface for persistence adapters
 */
class PersistenceAdapter {
  /**
   * Save agent state
   * @param {Object} state - Agent state to save
   * @param {string} filePath - Target file path
   */
  async save(state, filePath) {
    throw new Error('save method must be implemented by subclass');
  }

  /**
   * Load agent state
   * @param {string} filePath - Source file path
   * @returns {Object} Loaded state
   */
  async load(filePath) {
    throw new Error('load method must be implemented by subclass');
  }
}

/**
 * File system adapter for persistence
 */
class FileSystemAdapter extends PersistenceAdapter {
  async save(state, filePath) {
    const serializedState = JSON.stringify(state, null, 2);
    await fs.writeFile(filePath, serializedState);
    return { success: true, filePath, size: serializedState.length };
  }

  async load(filePath) {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  }
}

/**
 * Memory adapter for testing
 */
class MemoryAdapter extends PersistenceAdapter {
  constructor() {
    super();
    this.storage = new Map();
  }

  async save(state, key = 'default') {
    this.storage.set(key, JSON.parse(JSON.stringify(state))); // Deep clone
    return { success: true, key };
  }

  async load(key = 'default') {
    return this.storage.get(key);
  }
}

/**
 * Manages persistence operations with pluggable adapters
 */
class PersistenceManager {
  constructor(options = {}) {
    this.adapters = new Map();
    this.defaultAdapter = options.defaultAdapter || 'file';
    this._defaultPath = options.defaultPath || './agent.json';
    
    // Register built-in adapters
    this.registerAdapter('file', new FileSystemAdapter());
    this.registerAdapter('memory', new MemoryAdapter());
  }

  get defaultPath() {
    return this._defaultPath;
  }

  set defaultPath(path) {
    this._defaultPath = path;
  }

  /**
   * Register a new persistence adapter
   * @param {string} name - Adapter name
   * @param {PersistenceAdapter} adapter - Adapter instance
   */
  registerAdapter(name, adapter) {
    if (!(adapter instanceof PersistenceAdapter)) {
      throw new Error('Adapter must be an instance of PersistenceAdapter');
    }
    this.adapters.set(name, adapter);
  }

  /**
   * Get a registered adapter by name
   * @param {string} name - Adapter name
   * @returns {PersistenceAdapter}
   */
  getAdapter(name) {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Adapter '${name}' not found`);
    }
    return adapter;
  }

  /**
   * Save agent state using the specified adapter
   * @param {Object} state - Agent state to save
   * @param {string} adapterName - Adapter to use (defaults to default adapter)
   * @param {string} filePath - File path to save to (defaults to default path)
   * @returns {Object} Result of the save operation
   */
  async save(state, adapterName = this.defaultAdapter, filePath = this.defaultPath) {
    const adapter = this.getAdapter(adapterName);
    return await adapter.save(state, filePath);
  }

  /**
   * Load agent state using the specified adapter
   * @param {string} adapterName - Adapter to use (defaults to default adapter)
   * @param {string} filePath - File path to load from (defaults to default path)
   * @returns {Object} Loaded agent state
   */
  async load(adapterName = this.defaultAdapter, filePath = this.defaultPath) {
    const adapter = this.getAdapter(adapterName);
    return await adapter.load(filePath);
  }

  /**
   * Save to default location using default adapter
   * @param {Object} state - Agent state to save
   * @returns {Object} Result of the save operation
   */
  async saveToDefault(state) {
    return this.save(state, this.defaultAdapter, this.defaultPath);
  }

  /**
   * Load from default location using default adapter
   * @returns {Object} Loaded agent state
   */
  async loadFromDefault() {
    return this.load(this.defaultAdapter, this.defaultPath);
  }

  /**
   * Check if a save file exists
   * @param {string} filePath - File path to check (defaults to default path)
   * @returns {boolean} True if file exists
   */
  async exists(filePath = this.defaultPath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export { PersistenceManager, PersistenceAdapter, FileSystemAdapter, MemoryAdapter };