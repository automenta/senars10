/**
 * @file core/lm/LMConfiguration.js
 * @description LM Configuration class to manage provider and model settings
 */

/**
 * Configuration class for LM that manages provider and model settings
 */
class LMConfiguration {
  constructor(config = {}) {
    this.providers = config.providers || [];
    this.models = config.models || [];
    this.defaults = config.defaults || {};
    this.preferences = config.preferences || {};
  }

  // Provider management
  addProvider(provider) {
    if (!provider.name) throw new Error('Provider must have a name');
    if (!provider.url) throw new Error('Provider must have a URL');

    if (this.providers.some(p => p.name === provider.name)) {
      throw new Error(`Provider with name "${provider.name}" already exists`);
    }

    this.providers.push(provider);
    return this;
  }

  removeProvider(name) {
    const index = this.providers.findIndex(p => p.name === name);
    if (index !== -1) this.providers.splice(index, 1);
    return this;
  }

  getProvider(name) {
    return this.providers.find(p => p.name === name);
  }

  // Model management
  addModel(model) {
    if (!model.name) throw new Error('Model must have a name');
    if (!model.provider) throw new Error('Model must have a provider');

    if (this.models.some(m => m.name === model.name)) {
      throw new Error(`Model with name "${model.name}" already exists`);
    }

    this.models.push(model);
    return this;
  }

  removeModel(name) {
    const index = this.models.findIndex(m => m.name === name);
    if (index !== -1) this.models.splice(index, 1);
    return this;
  }

  getModel(name) {
    return this.models.find(m => m.name === name);
  }

  // Default assignments
  setDefault(type, name) {
    const validTypes = new Set(['embedding', 'fast', 'reasoning', 'temporal', 'counterfactual']);
    if (!validTypes.has(type)) throw new Error(`Invalid default type: ${type}`);
    if (!this.getModel(name) && !this.getProvider(name)) throw new Error(`Model or Provider with name "${name}" does not exist`);

    this.defaults[type] = name;
    return this;
  }

  getDefault(type) {
    return this.defaults[type];
  }

  // Preferences
  setPreference(key, value) {
    this.preferences[key] = value;
    return this;
  }

  getPreference(key, defaultValue) {
    return this.preferences[key] ?? defaultValue;
  }

  // Serialization
  toJSON() {
    return {
      providers: this.providers,
      models: this.models,
      defaults: this.defaults,
      preferences: this.preferences
    };
  }

  // Create a new configuration from JSON
  static fromJSON(json) {
    return new LMConfiguration(json);
  }

  // Clone the configuration
  clone() {
    return new LMConfiguration(this.toJSON());
  }

  // Validate the entire configuration
  validate() {
    const errors = [];

    // Validate providers and models
    this._validateCollection(this.providers, ['name', 'url'], 'Provider', errors);
    this._validateCollection(this.models, ['name', 'provider'], 'Model', errors);

    // Validate model providers exist
    for (const model of this.models) {
      if (!this.getProvider(model.provider)) {
        errors.push(`Model "${model.name}" references non-existent provider "${model.provider}"`);
      }
    }

    // Validate defaults
    const validTypes = new Set(['embedding', 'fast', 'reasoning', 'temporal', 'counterfactual']);
    for (const [type, name] of Object.entries(this.defaults)) {
      if (!validTypes.has(type)) {
        errors.push(`Invalid default type: ${type}`);
      } else if (!this.getModel(name) && !this.getProvider(name)) {
        errors.push(`Default ${type} references non-existent model or provider "${name}"`);
      }
    }

    if (errors.length > 0) throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    return true;
  }

  _validateCollection(collection, requiredFields, itemType, errors) {
    for (const item of collection) {
      for (const field of requiredFields) {
        if (!item[field]) errors.push(`${itemType} missing ${field}`);
      }
    }
  }
}

export default LMConfiguration;