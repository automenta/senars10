/**
 * @file SystemConfig.js
 * @description Simple, robust system configuration with validation
 */

import {deepFreeze} from '../util/common.js';
import {validateConfigWithDefaults} from '../config/ConfigValidator.js';

// Simple default configuration
const DEFAULT_CONFIG = deepFreeze({
    memory: {
        capacity: 1000,
        consolidationThreshold: 0.1,
        forgettingThreshold: 0.05,
        conceptActivationDecay: 0.95
    },
    focus: {
        size: 100,
        setCount: 3,
        attentionDecay: 0.98,
        diversityFactor: 0.3
    },
    taskManager: {
        defaultPriority: 0.5,
        priorityThreshold: 0.1, // Added the missing property
        priority: {
            confidenceMultiplier: 0.3,
            goalBoost: 0.2,
            questionBoost: 0.1
        }
    },
    cycle: {
        delay: 50,
        maxTasksPerCycle: 10,
        ruleApplicationLimit: 50
    },
    ruleEngine: {
        enableValidation: true,
        maxRuleApplicationsPerCycle: 20,
        performanceTracking: true
    },
    lm: {
        enabled: false,
        defaultProvider: 'dummy',
        maxConcurrentRequests: 5,
        timeout: 10000,
        retryAttempts: 2,
        cacheEnabled: true,
        cacheSize: 100
    },
    performance: {
        enableProfiling: false,
        maxExecutionTime: 100,
        memoryLimit: 512 * 1024 * 1024,
        gcThreshold: 0.8
    },
    logging: {
        level: 'info',
        enableConsole: true,
        enableFile: false,
        maxFileSize: 10 * 1024 * 1024,
        retentionDays: 7
    },
    errorHandling: {
        enableGracefulDegradation: true,
        maxErrorRate: 0.1,
        enableRecovery: true,
        recoveryAttempts: 3
    }
});

/**
 * Simple configuration class that merges defaults with user overrides
 */
export class SystemConfig {
    constructor(userConfig = {}) {
        // Validate the configuration using Zod
        this._config = validateConfigWithDefaults(userConfig);
    }

    static from(userConfig = {}) {
        return new SystemConfig(userConfig);
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

    toJSON() {
        return {...this._config};
    }
}