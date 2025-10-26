import { TraceId } from './TraceId.js';

export class EventBus {
    constructor(options = {}) {
        this._listeners = new Map();
        this._middleware = [];
        this._errorHandlers = new Set();
        this._deliveryGuarantees = options.deliveryGuarantees || {
            maxRetries: 3,
            retryDelay: 100,
            enablePersistence: false
        };
        this._enabled = true;
        this._stats = {eventsEmitted: 0, eventsHandled: 0, errors: 0, retries: 0};
    }

    on(eventName, callback, options = {}) {
        if (typeof callback !== 'function') throw new Error('Callback must be a function');

        if (!this._listeners.has(eventName)) this._listeners.set(eventName, new Set());

        const listener = {
            callback,
            priority: options.priority || 0,
            once: options.once || false,
            id: options.id || Symbol('listener')
        };

        this._listeners.get(eventName).add(listener);
        return this;
    }

    once(eventName, callback, options = {}) {
        return this.on(eventName, callback, {...options, once: true});
    }

    off(eventName, callback) {
        if (!this._listeners.has(eventName)) return this;

        const listeners = this._listeners.get(eventName);
        for (const listener of listeners) {
            if (listener.callback === callback) {
                listeners.delete(listener);
                break;
            }
        }

        if (listeners.size === 0) this._listeners.delete(eventName);
        return this;
    }

    use(middleware) {
        if (typeof middleware !== 'function') throw new Error('Middleware must be a function');
        this._middleware.push(middleware);
        return this;
    }

    removeMiddleware(middleware) {
        const index = this._middleware.indexOf(middleware);
        if (index !== -1) {
            this._middleware.splice(index, 1);
        }
        return this;
    }

    onError(handler) {
        if (typeof handler === 'function') this._errorHandlers.add(handler);
        return this;
    }

    async emit(eventName, data = {}, options = {}) {
        if (!this._enabled) return;

        this._stats.eventsEmitted++;

        // Ensure traceId exists
        const traceId = options.traceId || TraceId.generate();
        
        let processedData = {
            ...data,
            eventName,
            traceId
        };
        
        for (const middleware of this._middleware) {
            try {
                processedData = await middleware(processedData);
                if (processedData === null) return;
            } catch (error) {
                this._handleError('middleware', error, {eventName, data, traceId});
                return;
            }
        }

        if (!this._listeners.has(eventName)) return;

        const listeners = Array.from(this._listeners.get(eventName))
            .sort((a, b) => b.priority - a.priority);

        for (const listener of listeners) {
            let attempts = 0;
            let success = false;

            while (attempts < this._deliveryGuarantees.maxRetries && !success) {
                try {
                    await listener.callback(processedData);
                    success = true;
                    this._stats.eventsHandled++;
                } catch (error) {
                    attempts++;
                    this._stats.errors++;

                    if (attempts >= this._deliveryGuarantees.maxRetries) {
                        this._handleError('listener', error, {eventName, data, traceId, listener});
                    } else {
                        this._stats.retries++;
                        await this._delay(this._deliveryGuarantees.retryDelay * attempts);
                    }
                }
            }

            if (success && listener.once) {
                this._listeners.get(eventName).delete(listener);
            }
        }
    }

    _handleError(type, error, context) {
        for (const handler of this._errorHandlers) {
            try {
                handler(error, type, context);
            } catch (handlerError) {
                console.error('Error in EventBus error handler:', handlerError);
            }
        }

        if (this._errorHandlers.size === 0) {
            console.error(`EventBus error in ${type}:`, error, context);
        }
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStats() {
        return {...this._stats};
    }

    clear() {
        this._listeners.clear();
        this._middleware = [];
        this._errorHandlers.clear();
    }

    enable() {
        this._enabled = true;
    }

    disable() {
        this._enabled = false;
    }

    isEnabled() {
        return this._enabled;
    }
}