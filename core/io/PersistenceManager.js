import fs from 'fs/promises';

class PersistenceAdapter {
  async save(state, filePath) {
    throw new Error('save method must be implemented by subclass');
  }

  async load(filePath) {
    throw new Error('load method must be implemented by subclass');
  }
}

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

class MemoryAdapter extends PersistenceAdapter {
  constructor() {
    super();
    this.storage = new Map();
  }

  async save(state, key = 'default') {
    this.storage.set(key, JSON.parse(JSON.stringify(state)));
    return { success: true, key };
  }

  async load(key = 'default') {
    return this.storage.get(key);
  }
}

class PersistenceManager {
  constructor(options = {}) {
    const defaults = Object.freeze({
      defaultAdapter: 'file',
      defaultPath: './agent.json'
    });
    
    this.adapters = new Map();
    this.defaultAdapter = options.defaultAdapter || defaults.defaultAdapter;
    this._defaultPath = options.defaultPath || defaults.defaultPath;
    
    this._registerDefaultAdapters();
  }

  get defaultPath() {
    return this._defaultPath;
  }

  set defaultPath(path) {
    this._defaultPath = path;
  }

  _registerDefaultAdapters() {
    this.registerAdapter('file', new FileSystemAdapter());
    this.registerAdapter('memory', new MemoryAdapter());
  }

  registerAdapter(name, adapter) {
    if (!(adapter instanceof PersistenceAdapter)) {
      throw new Error('Adapter must be an instance of PersistenceAdapter');
    }
    this.adapters.set(name, adapter);
  }

  getAdapter(name) {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Adapter '${name}' not found`);
    }
    return adapter;
  }

  async save(state, adapterName = this.defaultAdapter, filePath = this.defaultPath) {
    return await this.getAdapter(adapterName).save(state, filePath);
  }

  async load(adapterName = this.defaultAdapter, filePath = this.defaultPath) {
    return await this.getAdapter(adapterName).load(filePath);
  }

  async saveToDefault(state) {
    return this.save(state, this.defaultAdapter, this.defaultPath);
  }

  async loadFromDefault() {
    return this.load(this.defaultAdapter, this.defaultPath);
  }

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