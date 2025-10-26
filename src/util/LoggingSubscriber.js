export class LoggingSubscriber {
    constructor(eventBus, options = {}) {
        this.eventBus = eventBus;
        this.options = {
            level: options.level || 'info',
            logAllEvents: options.logAllEvents !== false,
            eventFilter: options.eventFilter || null,
            logger: options.logger || console
        };
        
        this.levels = { 'debug': 0, 'info': 1, 'warn': 2, 'error': 3 };
        this.currentLogLevel = this.levels[this.options.level] || this.levels.info;
        this.stopped = false;
        this.boundMiddleware = this._loggingMiddleware.bind(this);
    }

    start() {
        this.eventBus.use(this.boundMiddleware);
    }

    stop() {
        this.eventBus.removeMiddleware(this.boundMiddleware);
        this.stopped = true;
    }

    _loggingMiddleware(eventData) {
        if (!this.stopped && this._shouldLogEvent(eventData)) {
            const logEntry = this._formatLogEntry(eventData);
            this._outputLog(logEntry);
        }
        return eventData;
    }

    _shouldLogEvent(eventData) {
        if (!this.options.logAllEvents) return false;
        if (this.options.eventFilter && typeof this.options.eventFilter === 'function') {
            return this.options.eventFilter(eventData);
        }
        return true;
    }

    _formatLogEntry(eventData) {
        return {
            timestamp: eventData.timestamp || Date.now(),
            level: this._getLogLevel(eventData.eventName),
            event: eventData.eventName,
            traceId: eventData.traceId,
            component: eventData.component,
            data: this._sanitizeEventData(eventData),
            source: 'eventbus'
        };
    }

    _getLogLevel(eventName) {
        if (eventName.includes('error')) return 'error';
        if (eventName.includes('warn') || eventName.includes('warning')) return 'warn';
        if (eventName.includes('debug')) return 'debug';
        return 'info';
    }

    _sanitizeEventData(eventData) {
        const sanitized = { ...eventData };
        delete sanitized.eventName;
        delete sanitized.timestamp;
        delete sanitized.component;
        delete sanitized.traceId;
        return sanitized;
    }

    _outputLog(logEntry) {
        if (this.levels[logEntry.level] >= this.currentLogLevel) {
            this.options.logger.log(JSON.stringify(logEntry));
        }
    }
}