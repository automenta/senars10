class Logger {
    constructor() {
        // Detect test environment in multiple ways to be robust
        this.isTestEnv = this._detectTestEnvironment();
        // In test environment, set logging to silent by default
        this.silent = this.isTestEnv;
    }

    _detectTestEnvironment() {
        // Check multiple indicators for test environment
        if (typeof process !== 'undefined') {
            if (process.env.NODE_ENV === 'test') return true;
            if (process.env.JEST_WORKER_ID !== undefined) return true;
        }

        // Check if running in a browser test environment
        if (typeof window !== 'undefined' && window.__JEST__) return true;

        // Check for Jest globals
        if (typeof jest !== 'undefined' && jest.version) return true;

        return false;
    }

    log(level, message, data = {}) {
        // If silent mode is enabled (especially for tests), don't log anything
        if (this.silent) return;

        // In test environment, only log if there's a mock in place to keep output clean
        if (this.isTestEnv) {
            const consoleMethod = console[level] || console.log;
            const hasMock = consoleMethod._isMockFunction ||
                (consoleMethod.mock && Array.isArray(consoleMethod.mock.calls));

            if (hasMock) consoleMethod(`[${level.toUpperCase()}]`, message, data);
            return;
        }

        // In non-test environment, log normally
        (console[level] || console.log)(`[${level.toUpperCase()}]`, message, data);
    }

    debug(msg, data) {
        if ((process.env.NODE_ENV === 'development' || process.env.DEBUG) && !this.isTestEnv && !this.silent) {
            this.log('debug', msg, data);
        }
    }

    info(msg, data) {
        if (!this.isTestEnv && !this.silent) {
            this.log('info', msg, data);
        }
    }

    warn(msg, data) {
        if (!this.silent) {
            this.log('warn', msg, data);
        }
    }

    error(msg, data) {
        if (!this.silent) {
            // Log errors but avoid stack traces in tests to keep output clean
            const logData = this.isTestEnv ? {message: data?.message || msg} : data;
            this.log('error', msg, logData);
        }
    }

    // Method to control whether logging is silent or not
    setSilent(silent) {
        this.silent = silent;
    }

    // Method to check if logger is in test environment
    getIsTestEnv() {
        return this.isTestEnv;
    }
}

// Export a singleton instance
const logger = new Logger();
export {logger as Logger};