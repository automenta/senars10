class IOAdapterManager {
  constructor() {
    this.adapters = new Map();
  }

  register(name, adapter) {
    this.adapters.set(name, adapter);
    return this;
  }

  get(name) {
    return this.adapters.get(name);
  }

  // Convenience method to add all standard adapters
  addStandardAdapters() {
    // These will be added by the LM component
    return this;
  }

  list() {
    return Array.from(this.adapters.keys());
  }
}

export default IOAdapterManager;