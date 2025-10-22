/**
 * Unified Configuration Schema for SeNARS v10
 * Implements validation and standardized configuration patterns for all components
 */

// Default configuration values
export const DEFAULT_CONFIG = {
  // Term Factory Configuration
  termFactory: {
    maxCacheSize: 5000,
    canonicalization: {
      enableAdvancedNormalization: true,
      handleCommutativity: true,
      handleAssociativity: true,
    },
  },

  // Memory Configuration
  memory: {
    focusCapacity: 100,
    bagCapacity: 1000,
    forgettingThreshold: 0.1,
    consolidationInterval: 1000, // milliseconds
  },

  // Reasoning Configuration
  reasoning: {
    maxSteps: 1000,
    priorityThreshold: 0.01,
    revisionThreshold: 0.01,
  },

  // System Configuration
  system: {
    enableLogging: true,
    logLevel: 'INFO', // DEBUG, INFO, WARN, ERROR
    enableMetrics: true,
    aiKRCompliance: true, // Ensure AIKR (Artificial Intelligence Knowledge Representation) compliance
  },

  // Layer Configuration
  layers: {
    termLayerCapacity: 1000,
  },

  // Functor Configuration
  functors: {
    maxExecutionTime: 1000, // milliseconds
    enableSafety: true,
  },
};

/**
 * Configuration validator
 */
export class ConfigValidator {
  /**
   * Validates a configuration object against the schema
   * @param {Object} config - Configuration object to validate
   * @returns {Array} - Array of validation errors
   */
  static validate(config) {
    const errors = [];
    
    if (typeof config !== 'object' || config === null) {
      errors.push('Configuration must be an object');
      return errors;
    }

    // Validate term factory config
    if (config.termFactory) {
      if (typeof config.termFactory.maxCacheSize !== 'number' || config.termFactory.maxCacheSize <= 0) {
        errors.push('termFactory.maxCacheSize must be a positive number');
      }
    }

    // Validate memory config
    if (config.memory) {
      if (typeof config.memory.focusCapacity !== 'number' || config.memory.focusCapacity <= 0) {
        errors.push('memory.focusCapacity must be a positive number');
      }
      if (typeof config.memory.bagCapacity !== 'number' || config.memory.bagCapacity <= 0) {
        errors.push('memory.bagCapacity must be a positive number');
      }
      if (typeof config.memory.forgettingThreshold !== 'number' || 
          config.memory.forgettingThreshold < 0 || config.memory.forgettingThreshold > 1) {
        errors.push('memory.forgettingThreshold must be a number between 0 and 1');
      }
    }

    // Validate reasoning config
    if (config.reasoning) {
      if (typeof config.reasoning.maxSteps !== 'number' || config.reasoning.maxSteps <= 0) {
        errors.push('reasoning.maxSteps must be a positive number');
      }
      if (typeof config.reasoning.priorityThreshold !== 'number' || 
          config.reasoning.priorityThreshold < 0 || config.reasoning.priorityThreshold > 1) {
        errors.push('reasoning.priorityThreshold must be a number between 0 and 1');
      }
    }

    // Validate system config
    if (config.system) {
      if (typeof config.system.enableLogging !== 'boolean') {
        errors.push('system.enableLogging must be a boolean');
      }
      if (typeof config.system.enableMetrics !== 'boolean') {
        errors.push('system.enableMetrics must be a boolean');
      }
      if (!['DEBUG', 'INFO', 'WARN', 'ERROR'].includes(config.system.logLevel)) {
        errors.push('system.logLevel must be one of: DEBUG, INFO, WARN, ERROR');
      }
    }

    // Validate functor config
    if (config.functors) {
      if (typeof config.functors.maxExecutionTime !== 'number' || config.functors.maxExecutionTime <= 0) {
        errors.push('functors.maxExecutionTime must be a positive number');
      }
      if (typeof config.functors.enableSafety !== 'boolean') {
        errors.push('functors.enableSafety must be a boolean');
      }
    }

    return errors;
  }

  /**
   * Merges user configuration with default configuration
   * @param {Object} userConfig - User-provided configuration
   * @returns {Object} - Merged configuration
   */
  static mergeWithDefaults(userConfig) {
    return this.deepMerge(DEFAULT_CONFIG, userConfig || {});
  }

  /**
   * Deep merge two objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} - Merged object
   */
  static deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }
}

/**
 * Base class for components with standardized lifecycle management
 */
export class Component {
  /**
   * Constructor for base component
   * @param {Object} config - Component configuration
   */
  constructor(config = {}) {
    this.config = ConfigValidator.mergeWithDefaults(config);
    this.initialized = false;
    this.started = false;
    this.stopped = false;
  }

  /**
   * Initialize the component
   * @returns {Promise<boolean>} - True if initialization was successful
   */
  async initialize() {
    if (this.initialized) {
      console.warn(`${this.constructor.name} is already initialized`);
      return true;
    }

    try {
      const errors = ConfigValidator.validate(this.config);
      if (errors.length > 0) {
        throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
      }

      await this._initialize();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error(`Failed to initialize ${this.constructor.name}:`, error);
      return false;
    }
  }

  /**
   * Start the component
   * @returns {Promise<boolean>} - True if start was successful
   */
  async start() {
    if (!this.initialized) {
      throw new Error(`${this.constructor.name} must be initialized before starting`);
    }

    if (this.started) {
      console.warn(`${this.constructor.name} is already started`);
      return true;
    }

    try {
      await this._start();
      this.started = true;
      return true;
    } catch (error) {
      console.error(`Failed to start ${this.constructor.name}:`, error);
      return false;
    }
  }

  /**
   * Stop the component
   * @returns {Promise<boolean>} - True if stop was successful
   */
  async stop() {
    if (!this.started) {
      console.warn(`${this.constructor.name} is not running`);
      return true;
    }

    try {
      await this._stop();
      this.stopped = true;
      this.started = false;
      return true;
    } catch (error) {
      console.error(`Failed to stop ${this.constructor.name}:`, error);
      return false;
    }
  }

  /**
   * Destroy the component and clean up resources
   * @returns {Promise<void>}
   */
  async destroy() {
    if (this.started) {
      await this.stop();
    }

    try {
      await this._destroy();
    } catch (error) {
      console.error(`Error during destroy of ${this.constructor.name}:`, error);
    }
  }

  /**
   * Internal initialization method - to be implemented by subclasses
   * @protected
   */
  async _initialize() {
    // Default implementation - subclasses should override
  }

  /**
   * Internal start method - to be implemented by subclasses
   * @protected
   */
  async _start() {
    // Default implementation - subclasses should override
  }

  /**
   * Internal stop method - to be implemented by subclasses
   * @protected
   */
  async _stop() {
    // Default implementation - subclasses should override
  }

  /**
   * Internal destroy method - to be implemented by subclasses
   * @protected
   */
  async _destroy() {
    // Default implementation - subclasses should override
  }

  /**
   * Get component status
   * @returns {Object} - Component status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      started: this.started,
      stopped: this.stopped,
      config: this.config,
    };
  }

  /**
   * Update configuration at runtime
   * @param {Object} newConfig - New configuration values
   * @returns {boolean} - True if update was successful
   */
  updateConfig(newConfig) {
    try {
      const errors = ConfigValidator.validate(newConfig);
      if (errors.length > 0) {
        throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
      }

      this.config = ConfigValidator.deepMerge(this.config, newConfig);
      return true;
    } catch (error) {
      console.error(`Failed to update config for ${this.constructor.name}:`, error);
      return false;
    }
  }
}