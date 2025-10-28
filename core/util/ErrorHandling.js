import {Logger} from './util/Logger.js';
import {SystemConfig} from './nar/SystemConfig.js';

const ERROR_TYPES = {
    LOGIC: 'logic',
    NETWORK: 'network',
    RESOURCE: 'resource',
    SYNTAX: 'syntax',
    VALIDATION: 'validation',
    UNKNOWN: 'unknown'
};
const SEVERITY_LEVELS = {HIGH: 'high', MEDIUM: 'medium', LOW: 'low'};

class ErrorClassifier {
    static classify = error => {
        const logicErrors = ['TypeError', 'ReferenceError'];
        if (logicErrors.includes(error.name)) return ERROR_TYPES.LOGIC;
        if (/(timeout|network)/.test(error.message)) return ERROR_TYPES.NETWORK;
        if (/(memory|heap)/.test(error.message)) return ERROR_TYPES.RESOURCE;
        if (error.name === 'SyntaxError') return ERROR_TYPES.SYNTAX;
        if (/(validation|invalid)/.test(error.message.toLowerCase())) return ERROR_TYPES.VALIDATION;
        return ERROR_TYPES.UNKNOWN;
    };

    static determineSeverity = (error, provided) => provided || {
        [ERROR_TYPES.LOGIC]: SEVERITY_LEVELS.HIGH,
        [ERROR_TYPES.NETWORK]: SEVERITY_LEVELS.MEDIUM,
        [ERROR_TYPES.RESOURCE]: SEVERITY_LEVELS.HIGH,
        [ERROR_TYPES.SYNTAX]: SEVERITY_LEVELS.HIGH,
        [ERROR_TYPES.VALIDATION]: SEVERITY_LEVELS.LOW,
        [ERROR_TYPES.UNKNOWN]: SEVERITY_LEVELS.MEDIUM,
    }[ErrorClassifier.classify(error)];
}

class ErrorTracker {
    constructor(maxErrorRate) {
        this.errorRateWindow = [];
        this.maxErrorRate = maxErrorRate;
        this.logger = Logger;
    }

    track = errorInfo => {
        this.errorRateWindow.push({timestamp: errorInfo.timestamp, severity: errorInfo.severity});
        this._cleanup();
        if (this.getErrorRate() > this.maxErrorRate) {
            this.logger.warn(`High error rate: ${(this.getErrorRate() * 100).toFixed(2)}%`);
        }
    };

    getErrorRate = () => {
        if (this.errorRateWindow.length === 0) return 0;
        const recentErrors = this.errorRateWindow.filter(err =>
            [SEVERITY_LEVELS.HIGH, SEVERITY_LEVELS.MEDIUM].includes(err.severity));
        return recentErrors.length / this.errorRateWindow.length;
    };

    _cleanup = () => {
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        this.errorRateWindow = this.errorRateWindow.filter(err => err.timestamp > fiveMinutesAgo);
    };
}

class ErrorRecovery {
    constructor(recoveryAttemptsLimit, logger) {
        this.recoveryAttempts = new Map();
        this.recoveryAttemptsLimit = recoveryAttemptsLimit;
        this.logger = logger;
    }

    attemptRecovery = async (errorInfo, options) => {
        const errorKey = `${errorInfo.type}:${errorInfo.message.substring(0, 30)}`;
        const attempts = this.recoveryAttempts.get(errorKey) || 0;

        if (attempts >= this.recoveryAttemptsLimit) {
            this.logger.error(`Recovery failed after ${attempts} attempts: ${errorInfo.message}`);
            return {success: false, degraded: true, error: errorInfo};
        }

        this.recoveryAttempts.set(errorKey, attempts + 1);

        try {
            const recoveryResult = await this._executeRecovery(errorInfo, options);
            if (recoveryResult.success) {
                this.recoveryAttempts.delete(errorKey);
                this.logger.info(`Recovery successful: ${errorInfo.message}`);
                return recoveryResult;
            }
        } catch (recoveryError) {
            this.logger.error('Recovery process failed:', recoveryError);
        }

        return {success: false, degraded: true, error: errorInfo};
    };

    _executeRecovery = async (errorInfo, options) => {
        const strategies = {
            [ERROR_TYPES.NETWORK]: this._recoverNetwork,
            [ERROR_TYPES.RESOURCE]: this._recoverResource,
            [ERROR_TYPES.VALIDATION]: this._recoverValidation,
        };

        const strategy = strategies[errorInfo.type] || this._recoverGeneric;
        return await strategy.call(this, errorInfo, options);
    };

    _recoverNetwork = async () => ({success: false, needsRetry: true});
    _recoverResource = async () => ({success: false, degraded: true});
    _recoverValidation = async (errorInfo, options) =>
        options.defaultValue !== undefined ? {success: true, value: options.defaultValue} : {
            success: false,
            skip: true
        };
    _recoverGeneric = async () => ({success: false, degraded: true});

    _delay = ms => new Promise(resolve => setTimeout(resolve, ms));
}

export class ErrorHandling {
    constructor(config = {}) {
        this.config = SystemConfig.from(config);
        this.logger = Logger;
        this.errorRegistry = new Map();
        this.degradationLevel = 0;

        const errorConfig = this.config.get('errorHandling');
        this.tracker = new ErrorTracker(errorConfig.maxErrorRate);
        this.recovery = new ErrorRecovery(errorConfig.recoveryAttempts, this.logger);
        this.enableRecovery = errorConfig.enableRecovery;
    }

    handleError = async (error, context = {}, options = {}) => {
        const errorInfo = this._createErrorInfo(error, context, options);

        this._logError(errorInfo);
        this.tracker.track(errorInfo);
        this._registerError(errorInfo);
        this._assessDegradation();

        if (this.enableRecovery && options.attemptRecovery !== false) {
            return await this.recovery.attemptRecovery(errorInfo, options);
        }

        if (this.config.get('errorHandling.enableGracefulDegradation')) {
            return {success: false, degraded: true, error: errorInfo};
        }

        throw error;
    };

    _createErrorInfo = (error, context, options) => ({
        error, message: error.message || 'Unknown error', stack: error.stack,
        context, timestamp: Date.now(), type: ErrorClassifier.classify(error),
        severity: ErrorClassifier.determineSeverity(error, options.severity)
    });

    _logError = errorInfo => {
        const level = {high: 'error', medium: 'warn', low: 'info'}[errorInfo.severity];
        this.logger[level](`Error [${errorInfo.type}][${errorInfo.severity}]: ${errorInfo.message}`, {
            context: errorInfo.context, stack: errorInfo.stack, timestamp: errorInfo.timestamp
        });
    };

    _registerError = errorInfo => {
        const key = `${errorInfo.type}:${errorInfo.message.substring(0, 50)}`;
        const entry = this.errorRegistry.get(key) || {count: 0, lastSeen: 0, instances: []};

        Object.assign(entry, {
            count: entry.count + 1,
            lastSeen: errorInfo.timestamp,
            instances: [...entry.instances.slice(-9), {
                timestamp: errorInfo.timestamp,
                context: errorInfo.context,
                severity: errorInfo.severity
            }]
        });

        this.errorRegistry.set(key, entry);
    };

    _assessDegradation = () => {
        const currentErrorRate = this.tracker.getErrorRate();
        const maxErrorRate = this.config.get('errorHandling.maxErrorRate');

        if (currentErrorRate > maxErrorRate) {
            this.degradationLevel = Math.min(1, this.degradationLevel + 0.1);
            this.logger.warn(`System degrading: ${(currentErrorRate * 100).toFixed(2)}%`, {degradationLevel: this.degradationLevel});
        } else if (this.degradationLevel > 0 && currentErrorRate < maxErrorRate * 0.5) {
            this.degradationLevel = Math.max(0, this.degradationLevel - 0.05);
        }
    };

    getDegradationLevel = () => this.degradationLevel;
    isDegraded = () => this.degradationLevel > 0.5;

    getStats = () => ({
        degradationLevel: this.degradationLevel,
        errorRate: this.tracker.getErrorRate(),
        totalErrors: this.tracker.errorRateWindow.length,
        errorRegistrySize: this.errorRegistry.size,
        recoveryAttempts: new Map(this.recovery.recoveryAttempts),
        registeredErrors: Array.from(this.errorRegistry.entries()).map(([key, value]) => ({
            key, count: value.count, lastSeen: value.lastSeen, instances: value.instances.length
        }))
    });
}

export const GlobalErrorHandler = new ErrorHandling();