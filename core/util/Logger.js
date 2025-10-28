class Logger {
    constructor() {
        this.isTestEnv = this._detectTestEnvironment();
        this.silent = this.isTestEnv;
    }

    _detectTestEnvironment() {
        if (typeof process !== 'undefined') {
            if (process.env.NODE_ENV === 'test') return true;
            if (process.env.JEST_WORKER_ID !== undefined) return true;
        }

        if (typeof window !== 'undefined' && window.__JEST__) return true;

        if (typeof jest !== 'undefined' && jest.version) return true;

        return false;
    }

    log(level, message, data = {}) {
        if (this.silent) return;

        if (this.isTestEnv) {
            const consoleMethod = console[level] || console.log;
            const hasMock = consoleMethod._isMockFunction ||
                (consoleMethod.mock && Array.isArray(consoleMethod.mock.calls));

            if (hasMock) consoleMethod(`[${level.toUpperCase()}]`, message, data);
            return;
        }

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
            const logData = this.isTestEnv ? {message: data?.message || msg} : data;
            this.log('error', msg, logData);
        }
    }

    setSilent(silent) {
        this.silent = silent;
    }

    getIsTestEnv() {
        return this.isTestEnv;
    }
}

const logger = new Logger();
export {logger as Logger};