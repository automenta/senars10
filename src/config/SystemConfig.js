import Joi from 'joi';
import {CYCLE, MEMORY, PERFORMANCE, SYSTEM} from './constants.js';

const DEFAULT_CONFIG = {
    system: {
        port: SYSTEM.DEFAULT_PORT,
        host: SYSTEM.DEFAULT_HOST,
        maxErrorRate: SYSTEM.MAX_ERROR_RATE,
        recoveryAttempts: SYSTEM.RECOVERY_ATTEMPTS,
        gracefulDegradationThreshold: SYSTEM.GRACEFUL_DEGRADATION_THRESHOLD,
    },
    memory: {
        capacity: MEMORY.DEFAULT_CAPACITY,
        focusSetSize: MEMORY.FOCUS_SET_SIZE,
        forgettingThreshold: MEMORY.FORGETTING_THRESHOLD,
        consolidationInterval: MEMORY.CONSOLIDATION_INTERVAL,
        activationDecay: MEMORY.ACTIVATION_DECAY,
    },
    cycle: {
        delay: CYCLE.DEFAULT_DELAY,
        maxTasksPerCycle: 10,
        ruleApplicationLimit: 50,
    },
    performance: {
        enableProfiling: false,
        maxExecutionTime: PERFORMANCE.TIMEOUT_MS,
        cacheSize: PERFORMANCE.CACHE_SIZE,
        batchSize: PERFORMANCE.BATCH_SIZE,
    },
    logging: {
        level: 'info',
        enableConsole: true,
        enableFile: false,
    },
    errorHandling: {
        enableGracefulDegradation: true,
        maxErrorRate: SYSTEM.MAX_ERROR_RATE,
        enableRecovery: true,
        recoveryAttempts: SYSTEM.RECOVERY_ATTEMPTS,
    }
};

const CONFIG_SCHEMA = Joi.object({
    system: Joi.object({
        port: Joi.number().port().default(SYSTEM.DEFAULT_PORT),
        host: Joi.string().hostname().default(SYSTEM.DEFAULT_HOST),
        maxErrorRate: Joi.number().min(0).max(1).default(SYSTEM.MAX_ERROR_RATE),
        recoveryAttempts: Joi.number().min(0).default(SYSTEM.RECOVERY_ATTEMPTS),
        gracefulDegradationThreshold: Joi.number().min(0).max(1).default(SYSTEM.GRACEFUL_DEGRADATION_THRESHOLD),
    }).default(),
    memory: Joi.object({
        capacity: Joi.number().min(1).default(MEMORY.DEFAULT_CAPACITY),
        focusSetSize: Joi.number().min(1).default(MEMORY.FOCUS_SET_SIZE),
        forgettingThreshold: Joi.number().min(0).max(1).default(MEMORY.FORGETTING_THRESHOLD),
        consolidationInterval: Joi.number().min(1).default(MEMORY.CONSOLIDATION_INTERVAL),
        activationDecay: Joi.number().min(0).max(1).default(MEMORY.ACTIVATION_DECAY),
    }).default(),
    cycle: Joi.object({
        delay: Joi.number().min(1).max(1000).default(CYCLE.DEFAULT_DELAY),
        maxTasksPerCycle: Joi.number().min(1).default(10),
        ruleApplicationLimit: Joi.number().min(1).default(50),
    }).default(),
    performance: Joi.object({
        enableProfiling: Joi.boolean().default(false),
        maxExecutionTime: Joi.number().min(1).default(PERFORMANCE.TIMEOUT_MS),
        cacheSize: Joi.number().min(1).default(PERFORMANCE.CACHE_SIZE),
        batchSize: Joi.number().min(1).default(PERFORMANCE.BATCH_SIZE),
    }).default(),
    logging: Joi.object({
        level: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
        enableConsole: Joi.boolean().default(true),
        enableFile: Joi.boolean().default(false),
    }).default(),
    errorHandling: Joi.object({
        enableGracefulDegradation: Joi.boolean().default(true),
        maxErrorRate: Joi.number().min(0).max(1).default(SYSTEM.MAX_ERROR_RATE),
        enableRecovery: Joi.boolean().default(true),
        recoveryAttempts: Joi.number().min(0).default(SYSTEM.RECOVERY_ATTEMPTS),
    }).default()
});

export class SystemConfig {
    constructor(userConfig = {}) {
        const validationResult = CONFIG_SCHEMA.validate(userConfig, {
            stripUnknown: true,
            allowUnknown: false,
            convert: true
        });

        if (validationResult.error) {
            throw new Error(`Configuration validation failed: ${validationResult.error.message}`);
        }

        this._config = this._deepMerge(DEFAULT_CONFIG, validationResult.value);
        this._frozen = false;
    }

    static from(userConfig = {}) {
        return new SystemConfig(userConfig);
    }

    _deepMerge(target, source) {
        const result = {...target};
        for (const [key, value] of Object.entries(source)) {
            if (value && typeof value === 'object' && !Array.isArray(value) &&
                result[key] && typeof result[key] === 'object') {
                result[key] = this._deepMerge(result[key], value);
            } else {
                result[key] = value;
            }
        }
        return result;
    }

    get(path) {
        const pathParts = path.split('.');
        let current = this._config;
        for (const part of pathParts) {
            if (current === null || current === undefined) return undefined;
            current = current[part];
        }
        return current;
    }

    set(path, value) {
        if (this._frozen) throw new Error('Configuration is frozen and cannot be modified');

        const pathParts = path.split('.');
        const lastKey = pathParts.pop();
        let current = this._config;

        for (const part of pathParts) {
            if (current[part] === undefined) current[part] = {};
            current = current[part];
        }

        current[lastKey] = value;

        // Validate the entire config after setting a value
        const validationResult = CONFIG_SCHEMA.validate(this._config, {
            stripUnknown: true,
            allowUnknown: false,
            convert: true
        });

        if (validationResult.error) {
            throw new Error(`Configuration validation failed after setting value: ${validationResult.error.message}`);
        }

        return this;
    }

    update(updates) {
        const merged = this._deepMerge(this._config, updates);
        const validationResult = CONFIG_SCHEMA.validate(merged, {
            stripUnknown: true,
            allowUnknown: false,
            convert: true
        });

        if (validationResult.error) {
            throw new Error(`Configuration validation failed after update: ${validationResult.error.message}`);
        }

        this._config = validationResult.value;
        return this;
    }

    freeze() {
        this._frozen = true;
        return this;
    }

    isFrozen() {
        return this._frozen;
    }

    toJSON() {
        return JSON.parse(JSON.stringify(this._config));
    }

    getAll() {
        return this.toJSON();
    }

    reset() {
        this._config = this._deepMerge(DEFAULT_CONFIG, {});
        this._frozen = false;
    }
}