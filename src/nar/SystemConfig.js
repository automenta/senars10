/**
 * SystemConfig - Centralized configuration management for NAR system
 * Implements immutable configuration with validation as specified in DESIGN.md
 */

export class SystemConfig {
    constructor(config = {}) {
        // Default configuration values
        this._config = {
            // Memory settings
            memory: {
                maxConcepts: 1000,
                maxTasksPerConcept: 100,
                consolidationInterval: 100, // cycles
                priorityDecayRate: 0.01,
                ...config.memory
            },

            // Cycle settings
            cycle: {
                delay: 100, // milliseconds between cycles
                maxTasksPerCycle: 10,
                ...config.cycle
            },

            // Task management
            taskManager: {
                defaultPriority: 0.5,
                defaultBudget: 1.0,
                priorityThreshold: 0.1,
                ...config.taskManager
            },

            // Rule engine settings
            rules: {
                enabledRuleTypes: ['NAL'], // NAL, LM
                maxRuleApplicationsPerCycle: 50,
                ...config.rules
            },

            // Focus settings
            focus: {
                maxFocusSets: 5,
                defaultFocusSetSize: 100,
                attentionDecayRate: 0.05,
                ...config.focus
            },

            // Debug and logging
            debug: {
                enabled: false,
                logLevel: 'info', // error, warn, info, debug
                traceCycles: false,
                ...config.debug
            },

            // Language Model settings
            lm: {
                enabled: false,
                defaultProvider: null,
                autoRegister: true, // Auto-register basic providers if available
                ...config.lm
            }
        };

        // Freeze the configuration to ensure immutability
        Object.freeze(this._config);
        Object.freeze(this);
    }

    // Getters for different configuration sections
    get memory() {
        return this._config.memory;
    }

    get cycle() {
        return this._config.cycle;
    }

    get taskManager() {
        return this._config.taskManager;
    }

    get rules() {
        return this._config.rules;
    }

    get focus() {
        return this._config.focus;
    }

    get debug() {
        return this._config.debug;
    }

    get lm() {
        return this._config.lm;
    }

    // Static factory method with validation
    static from(config = {}) {
        const instance = new SystemConfig(config);

        // Validate configuration values
        instance._validate();

        return instance;
    }

    // Configuration validation
    _validate() {
        const errors = [];

        // Memory validation
        if (this._config.memory.maxConcepts < 1) {
            errors.push('maxConcepts must be at least 1');
        }
        if (this._config.memory.maxTasksPerConcept < 1) {
            errors.push('maxTasksPerConcept must be at least 1');
        }
        if (this._config.memory.priorityDecayRate < 0 || this._config.memory.priorityDecayRate > 1) {
            errors.push('priorityDecayRate must be between 0 and 1');
        }

        // Cycle validation
        if (this._config.cycle.delay < 0) {
            errors.push('cycle delay cannot be negative');
        }
        if (this._config.cycle.maxTasksPerCycle < 1) {
            errors.push('maxTasksPerCycle must be at least 1');
        }

        // Task manager validation
        if (this._config.taskManager.defaultPriority < 0 || this._config.taskManager.defaultPriority > 1) {
            errors.push('defaultPriority must be between 0 and 1');
        }
        if (this._config.taskManager.defaultBudget < 0 || this._config.taskManager.defaultBudget > 1) {
            errors.push('defaultBudget must be between 0 and 1');
        }

        // Focus validation
        if (this._config.focus.maxFocusSets < 1) {
            errors.push('maxFocusSets must be at least 1');
        }
        if (this._config.focus.defaultFocusSetSize < 1) {
            errors.push('defaultFocusSetSize must be at least 1');
        }

        // LM validation
        if (typeof this._config.lm.enabled !== 'boolean') {
            errors.push('lm.enabled must be a boolean');
        }
        if (this._config.lm.enabled && this._config.lm.autoRegister !== undefined && typeof this._config.lm.autoRegister !== 'boolean') {
            errors.push('lm.autoRegister must be a boolean');
        }

        if (errors.length > 0) {
            throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
        }
    }

    // Get a flattened configuration object for debugging
    toJSON() {
        return JSON.parse(JSON.stringify(this._config));
    }

    // Create a new config with overrides (immutable update)
    withOverrides(overrides) {
        return new SystemConfig({...this._config, ...overrides});
    }
}