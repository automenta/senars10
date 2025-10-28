import { z } from 'zod';
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

const CONFIG_SCHEMA = z.object({
    system: z.object({
        port: z.number().int().positive().default(SYSTEM.DEFAULT_PORT),
        host: z.string().default(SYSTEM.DEFAULT_HOST),
        maxErrorRate: z.number().min(0).max(1).default(SYSTEM.MAX_ERROR_RATE),
        recoveryAttempts: z.number().min(0).default(SYSTEM.RECOVERY_ATTEMPTS),
        gracefulDegradationThreshold: z.number().min(0).max(1).default(SYSTEM.GRACEFUL_DEGRADATION_THRESHOLD),
    }).default(DEFAULT_CONFIG.system),
    memory: z.object({
        capacity: z.number().min(1).default(MEMORY.DEFAULT_CAPACITY),
        focusSetSize: z.number().min(1).default(MEMORY.FOCUS_SET_SIZE),
        forgettingThreshold: z.number().min(0).max(1).default(MEMORY.FORGETTING_THRESHOLD),
        consolidationInterval: z.number().min(1).default(MEMORY.CONSOLIDATION_INTERVAL),
        activationDecay: z.number().min(0).max(1).default(MEMORY.ACTIVATION_DECAY),
    }).default(DEFAULT_CONFIG.memory),
    cycle: z.object({
        delay: z.number().min(1).max(1000).default(CYCLE.DEFAULT_DELAY),
        maxTasksPerCycle: z.number().min(1).default(10),
        ruleApplicationLimit: z.number().min(1).default(50),
    }).default(DEFAULT_CONFIG.cycle),
    performance: z.object({
        enableProfiling: z.boolean().default(false),
        maxExecutionTime: z.number().min(1).default(PERFORMANCE.TIMEOUT_MS),
        cacheSize: z.number().min(1).default(PERFORMANCE.CACHE_SIZE),
        batchSize: z.number().min(1).default(PERFORMANCE.BATCH_SIZE),
    }).default(DEFAULT_CONFIG.performance),
    logging: z.object({
        level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
        enableConsole: z.boolean().default(true),
        enableFile: z.boolean().default(false),
    }).default(DEFAULT_CONFIG.logging),
    errorHandling: z.object({
        enableGracefulDegradation: z.boolean().default(true),
        maxErrorRate: z.number().min(0).max(1).default(SYSTEM.MAX_ERROR_RATE),
        enableRecovery: z.boolean().default(true),
        recoveryAttempts: z.number().min(0).default(SYSTEM.RECOVERY_ATTEMPTS),
    }).default(DEFAULT_CONFIG.errorHandling)
});

export class SystemConfig {
    constructor(userConfig = {}) {
        const validationResult = CONFIG_SCHEMA.safeParse(userConfig);

        if (!validationResult.success) {
            throw new Error(`Configuration validation failed: ${validationResult.error.message}`);
        }

        this._config = this._deepMerge(DEFAULT_CONFIG, validationResult.data);
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
        const validationResult = CONFIG_SCHEMA.safeParse(this._config);

        if (!validationResult.success) {
            throw new Error(`Configuration validation failed after setting value: ${validationResult.error.message}`);
        }
        
        this._config = validationResult.data;

        return this;
    }

    update(updates) {
        const merged = this._deepMerge(this._config, updates);
        const validationResult = CONFIG_SCHEMA.safeParse(merged);

        if (!validationResult.success) {
            throw new Error(`Configuration validation failed after update: ${validationResult.error.message}`);
        }

        this._config = validationResult.data;
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