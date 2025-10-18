/**
 * @file ErrorHandling.js
 * @description Comprehensive error handling with graceful degradation and recovery mechanisms
 */

import { Logger } from './util/Logger.js';
import { SystemConfig } from './nar/SystemConfig.js';

/**
 * Centralized error handling with graceful degradation capabilities
 */
export class ErrorHandling {
    constructor(config = {}) {
        this.config = SystemConfig.from(config);
        this.logger = Logger;
        this.errorRegistry = new Map(); // Track error patterns
        this.degradationLevel = 0; // 0 = no degradation, 1 = full degradation
        this.recoveryAttempts = new Map(); // Track recovery attempts per error type
        
        // Error rate tracking
        this.errorRateWindow = [];
        this.maxErrorRate = this.config.get('errorHandling.maxErrorRate');
        this.enableRecovery = this.config.get('errorHandling.enableRecovery');
        this.recoveryAttemptsLimit = this.config.get('errorHandling.recoveryAttempts');
    }

    /**
     * Handle an error with configurable response strategy
     */
    async handleError(error, context = {}, options = {}) {
        const errorInfo = {
            error: error,
            message: error.message || 'Unknown error',
            stack: error.stack,
            context: context,
            timestamp: Date.now(),
            type: this._classifyError(error),
            severity: this._determineSeverity(error, options.severity)
        };

        // Log the error
        this._logError(errorInfo);

        // Track error rate
        this._trackErrorRate(errorInfo);

        // Register the error pattern
        this._registerError(errorInfo);

        // Determine if system should degrade based on error patterns
        this._assessDegradation();

        // Attempt recovery if enabled
        if (this.enableRecovery && options.attemptRecovery !== false) {
            return await this._attemptRecovery(errorInfo, options);
        }

        // Don't re-throw if graceful degradation is enabled
        if (this.config.get('errorHandling.enableGracefulDegradation')) {
            return { success: false, degraded: true, error: errorInfo };
        }

        // Re-throw if graceful degradation is disabled
        throw error;
    }

    /**
     * Classify error types for appropriate handling
     */
    _classifyError(error) {
        if (error.name === 'TypeError' || error.name === 'ReferenceError') {
            return 'logic';
        } else if (error.message.includes('timeout') || error.message.includes('network')) {
            return 'network';
        } else if (error.message.includes('memory') || error.message.includes('heap')) {
            return 'resource';
        } else if (error.name === 'SyntaxError') {
            return 'syntax';
        } else if (error.message.includes('validation') || error.message.toLowerCase().includes('invalid')) {
            return 'validation';
        }
        return 'unknown';
    }

    /**
     * Determine error severity based on type and context
     */
    _determineSeverity(error, providedSeverity) {
        if (providedSeverity) return providedSeverity;

        const errorType = this._classifyError(error);
        switch (errorType) {
            case 'logic': return 'high';
            case 'network': return 'medium';
            case 'resource': return 'high';
            case 'syntax': return 'high';
            case 'validation': return 'low';
            default: return 'medium';
        }
    }

    /**
     * Log error with appropriate level
     */
    _logError(errorInfo) {
        const level = errorInfo.severity === 'high' ? 'error' : 
                     errorInfo.severity === 'medium' ? 'warn' : 'info';
        
        this.logger[level](`Error [${errorInfo.type}][${errorInfo.severity}]: ${errorInfo.message}`, {
            context: errorInfo.context,
            stack: errorInfo.stack,
            timestamp: errorInfo.timestamp
        });
    }

    /**
     * Track error rate for degradation assessment
     */
    _trackErrorRate(errorInfo) {
        this.errorRateWindow.push({
            timestamp: errorInfo.timestamp,
            severity: errorInfo.severity
        });

        // Keep only recent errors (last 5 minutes)
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        this.errorRateWindow = this.errorRateWindow.filter(err => err.timestamp > fiveMinutesAgo);

        // Log if error rate is high
        if (this._getErrorRate() > this.maxErrorRate) {
            this.logger.warn(`High error rate detected: ${(this._getErrorRate() * 100).toFixed(2)}%`);
        }
    }

    /**
     * Calculate current error rate
     */
    _getErrorRate() {
        if (this.errorRateWindow.length === 0) return 0;
        
        const recentErrors = this.errorRateWindow.filter(err => 
            err.severity === 'high' || err.severity === 'medium'
        );
        
        return recentErrors.length / this.errorRateWindow.length;
    }

    /**
     * Register error pattern for tracking
     */
    _registerError(errorInfo) {
        const key = `${errorInfo.type}:${errorInfo.message.substring(0, 50)}`;
        const entry = this.errorRegistry.get(key) || { count: 0, lastSeen: 0, instances: [] };
        
        entry.count++;
        entry.lastSeen = errorInfo.timestamp;
        entry.instances.push({
            timestamp: errorInfo.timestamp,
            context: errorInfo.context,
            severity: errorInfo.severity
        });
        
        // Keep only recent instances
        entry.instances = entry.instances.slice(-10); // Keep last 10 instances
        
        this.errorRegistry.set(key, entry);
    }

    /**
     * Assess if system should degrade based on error patterns
     */
    _assessDegradation() {
        const currentErrorRate = this._getErrorRate();
        
        if (currentErrorRate > this.maxErrorRate) {
            this.degradationLevel = Math.min(1, this.degradationLevel + 0.1);
            this.logger.warn(`System degrading due to high error rate (${(currentErrorRate * 100).toFixed(2)}%)`, {
                degradationLevel: this.degradationLevel
            });
        } else if (this.degradationLevel > 0 && currentErrorRate < this.maxErrorRate * 0.5) {
            // Gradually recover if error rate improves
            this.degradationLevel = Math.max(0, this.degradationLevel - 0.05);
        }
    }

    /**
     * Attempt to recover from an error
     */
    async _attemptRecovery(errorInfo, options = {}) {
        const errorKey = `${errorInfo.type}:${errorInfo.message.substring(0, 30)}`;
        const attempts = this.recoveryAttempts.get(errorKey) || 0;

        if (attempts >= this.recoveryAttemptsLimit) {
            this.logger.error(`Recovery failed after ${attempts} attempts for error: ${errorInfo.message}`);
            return { success: false, degraded: true, error: errorInfo };
        }

        this.recoveryAttempts.set(errorKey, attempts + 1);

        try {
            // Try different recovery strategies based on error type
            let recoveryResult;
            switch (errorInfo.type) {
                case 'network':
                    recoveryResult = await this._recoverNetworkError(errorInfo, options);
                    break;
                case 'resource':
                    recoveryResult = await this._recoverResourceError(errorInfo, options);
                    break;
                case 'validation':
                    recoveryResult = await this._recoverValidationError(errorInfo, options);
                    break;
                default:
                    recoveryResult = await this._recoverGenericError(errorInfo, options);
            }

            if (recoveryResult.success) {
                this.recoveryAttempts.delete(errorKey); // Reset attempts on success
                this.logger.info(`Recovery successful for error: ${errorInfo.message}`);
                return recoveryResult;
            }
        } catch (recoveryError) {
            this.logger.error(`Recovery process failed:`, recoveryError);
        }

        return { success: false, degraded: true, error: errorInfo };
    }

    /**
     * Recover from network errors
     */
    async _recoverNetworkError(errorInfo, options) {
        // For network errors, we might try alternative services or retry
        await this._delay(1000); // Wait a bit before retrying
        return { success: false, needsRetry: true }; // Indicate need for higher-level retry
    }

    /**
     * Recover from resource errors
     */
    async _recoverResourceError(errorInfo, options) {
        // For resource errors, we might try to free up resources or reduce load
        this.logger.info('Attempting resource recovery - may disable non-critical features');
        return { success: false, degraded: true }; // System is degraded but operational
    }

    /**
     * Recover from validation errors
     */
    async _recoverValidationError(errorInfo, options) {
        // For validation errors, we might use default values or skip invalid data
        if (options.defaultValue !== undefined) {
            return { success: true, value: options.defaultValue };
        }
        return { success: false, skip: true }; // Skip this operation
    }

    /**
     * Generic error recovery
     */
    async _recoverGenericError(errorInfo, options) {
        // Generic recovery might involve resetting component state
        await this._delay(100); // Brief pause
        return { success: false, degraded: true };
    }

    /**
     * Get current degradation level
     */
    getDegradationLevel() {
        return this.degradationLevel;
    }

    /**
     * Check if system is in degraded mode
     */
    isDegraded() {
        return this.degradationLevel > 0.5;
    }

    /**
     * Delay utility function
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get error statistics
     */
    getStats() {
        return {
            degradationLevel: this.degradationLevel,
            errorRate: this._getErrorRate(),
            totalErrors: this.errorRateWindow.length,
            errorRegistrySize: this.errorRegistry.size,
            recoveryAttempts: new Map(this.recoveryAttempts),
            registeredErrors: Array.from(this.errorRegistry.entries()).map(([key, value]) => ({
                key,
                count: value.count,
                lastSeen: value.lastSeen,
                instances: value.instances.length
            }))
        };
    }
}

// Global error handler instance
export const GlobalErrorHandler = new ErrorHandling();