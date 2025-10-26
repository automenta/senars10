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
import { validateConfigWithDefaults } from './ConfigValidator.js';

export class ConfigValidator {
    /**
     * Validates a configuration object against the schema
     * @param {Object} config - Configuration object to validate
     * @returns {Array} - Array of validation errors
     */
    static validate(config) {
        try {
            validateConfigWithDefaults(config);
            return [];
        } catch (error) {
            return [error.message];
        }
    }

    /**
     * Merges user configuration with default configuration
     * @param {Object} userConfig - User-provided configuration
     * @returns {Object} - Merged configuration
     */
    static mergeWithDefaults(userConfig) {
        try {
            return validateConfigWithDefaults(userConfig || {});
        } catch (error) {
            // If validation fails, return defaults merged with user config
            return {...DEFAULT_CONFIG, ...userConfig};
        }
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