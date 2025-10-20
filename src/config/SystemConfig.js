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

const CONFIG_SCHEMA = {
    system: {
        port: 'number',
        host: 'string',
        maxErrorRate: 'number',
        recoveryAttempts: 'number',
        gracefulDegradationThreshold: 'number'
    },
    memory: {
        capacity: 'number',
        focusSetSize: 'number',
        forgettingThreshold: 'number',
        consolidationInterval: 'number',
        activationDecay: 'number'
    },
    cycle: {delay: 'number', maxTasksPerCycle: 'number', ruleApplicationLimit: 'number'},
    performance: {enableProfiling: 'boolean', maxExecutionTime: 'number', cacheSize: 'number', batchSize: 'number'},
    logging: {level: 'string', enableConsole: 'boolean', enableFile: 'boolean'},
    errorHandling: {
        enableGracefulDegradation: 'boolean',
        maxErrorRate: 'number',
        enableRecovery: 'boolean',
        recoveryAttempts: 'number'
    }
};

export class SystemConfig {
    constructor(userConfig = {}) {
        this._config = this._deepMerge(DEFAULT_CONFIG, userConfig);
        this._validateConfig();
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

    _validateConfig() {
        const errors = [];
        for (const [section, schema] of Object.entries(CONFIG_SCHEMA)) {
            for (const [key, type] of Object.entries(schema)) {
                const value = this.get(`${section}.${key}`);
                if (value !== undefined && typeof value !== type) {
                    errors.push(`Invalid type for ${section}.${key}: expected ${type}, got ${typeof value}`);
                }
            }
        }
        if (errors.length > 0) throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
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
        this._validateConfig();
    }

    update(updates) {
        this._config = this._deepMerge(this._config, updates);
        this._validateConfig();
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