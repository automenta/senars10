import { Component, ComponentHealth, ComponentMetrics } from './Component.js';
import { Logger } from '../base/utilities.js';

/**
 * Centralized configuration service with validation.
 */
export class ConfigService extends Component {
  constructor() {
    super();
    this.config = new Map(); // namespace -> config object
    this.schema = new Map(); // namespace -> validation schema
    this.defaults = new Map(); // namespace -> default values
  }

  /**
   * Initializes the config service with initial configuration.
   * @param {ComponentConfig} config - The component configuration
   */
  async initialize(config) {
    await super.initialize(config);
    this.config = new Map(); // namespace -> config object
    this.schema = new Map(); // namespace -> validation schema
    this.defaults = new Map(); // namespace -> default values

    // Load any initial configuration from the provided config
    if (config.config && typeof config.config === 'object') {
      for (const [namespace, nsConfig] of Object.entries(config.config)) {
        this.setConfig(namespace, nsConfig);
      }
    }
  }

  /**
   * Sets configuration for a specific namespace.
   * @param {string} namespace - The configuration namespace
   * @param {Object} values - The configuration values
   * @param {Object} [schema] - Optional validation schema
   * @param {Object} [defaults] - Optional default values
   */
  setConfig(namespace, values, schema, defaults) {
    if (schema) {
      this.schema.set(namespace, schema);
    }
    if (defaults) {
      this.defaults.set(namespace, defaults);
    }

    // Apply defaults if they exist
    if (this.defaults.has(namespace)) {
      const defaultValues = this.defaults.get(namespace);
      values = { ...defaultValues, ...values };
    }

    // Validate against schema if present
    if (this.schema.has(namespace)) {
      const schema = this.schema.get(namespace);
      this._validateConfig(namespace, values, schema);
    }

    this.config.set(namespace, values);
  }

  /**
   * Gets configuration for a specific namespace.
   * @param {string} namespace - The configuration namespace
   * @param {string} [key] - Optional specific key within the namespace
   * @param {*} [defaultValue] - Optional default value if key not found
   * @returns {any} The configuration value
   */
  getConfig(namespace, key, defaultValue) {
    const nsConfig = this.config.get(namespace);
    if (!nsConfig) {
      return key ? defaultValue : {};
    }

    if (key) {
      return nsConfig[key] !== undefined ? nsConfig[key] : defaultValue;
    }

    return nsConfig;
  }

  /**
   * Updates specific configuration values.
   * @param {string} namespace - The configuration namespace
   * @param {Object} updates - The updates to apply
   */
  updateConfig(namespace, updates) {
    const current = this.config.get(namespace) || {};
    const newConfig = { ...current, ...updates };

    // Validate against schema if present
    if (this.schema.has(namespace)) {
      const schema = this.schema.get(namespace);
      this._validateConfig(namespace, newConfig, schema);
    }

    this.config.set(namespace, newConfig);
  }

  /**
   * Registers a validation schema for a namespace.
   * @param {string} namespace - The configuration namespace
   * @param {Object} schema - The validation schema
   */
  registerSchema(namespace, schema) {
    this.schema.set(namespace, schema);
  }

  /**
   * Registers default values for a namespace.
   * @param {string} namespace - The configuration namespace
   * @param {Object} defaults - The default values
   */
  registerDefaults(namespace, defaults) {
    this.defaults.set(namespace, defaults);
  }

  /**
   * Validates configuration against a schema.
   * @private
   */
  _validateConfig(namespace, config, schema) {
    if (!schema) return;

    for (const [key, validator] of Object.entries(schema)) {
      const value = config[key];
      if (value !== undefined) {
        let isValid = true;
        let message = '';

        if (typeof validator === 'function') {
          // Custom validation function
          try {
            const result = validator(value);
            isValid = result === true || (typeof result === 'object' && result.valid !== false);
            message = typeof result === 'string' ? result : (result.message || '');
          } catch (e) {
            isValid = false;
            message = e.message;
          }
        } else if (validator instanceof RegExp) {
          // Regular expression validation
          isValid = validator.test(value);
        } else if (typeof validator === 'string') {
          // Type validation
          switch (validator) {
            case 'string':
              isValid = typeof value === 'string';
              break;
            case 'number':
              isValid = typeof value === 'number' && !isNaN(value);
              break;
            case 'boolean':
              isValid = typeof value === 'boolean';
              break;
            case 'object':
              isValid = typeof value === 'object' && value !== null && !Array.isArray(value);
              break;
            case 'array':
              isValid = Array.isArray(value);
              break;
            case 'function':
              isValid = typeof value === 'function';
              break;
            default:
              isValid = typeof value === validator;
          }
        } else if (Array.isArray(validator)) {
          // Enum values
          isValid = validator.includes(value);
        }

        if (!isValid) {
          Logger.warn(`Config validation failed for ${namespace}.${key}: ${message || 'invalid value'}`);
        }
      }
    }
  }

  /**
   * Gets the current health of the component.
   * @returns {ComponentHealth}
   */
  getHealth() {
    const status = this.config.size > 0 ? 'healthy' : 'initialized';
    return new ComponentHealth(status);
  }

  /**
   * Gets performance metrics from the component.
   * @returns {ComponentMetrics}
   */
  getMetrics() {
    return new ComponentMetrics({
      namespaces: this.config.size,
      schemas: this.schema.size,
      defaults: this.defaults.size
    });
  }
}