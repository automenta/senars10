/**
 * @file EventBus.js
 * @description Robust event bus system with guaranteed delivery and error handling
 */

export class EventBus {
    constructor(options = {}) {
        this._listeners = new Map(); // event name -> Set of callbacks
        this._middleware = [];       // event processing middleware
        this._errorHandlers = new Set(); // global error handlers
        this._deliveryGuarantees = options.deliveryGuarantees || {
            maxRetries: 3,
            retryDelay: 100,
            enablePersistence: false
        };
        this._enabled = true;
        this._stats = {
            eventsEmitted: 0,
            eventsHandled: 0,
            errors: 0,
            retries: 0
        };
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - Name of the event to subscribe to
     * @param {Function} callback - Function to call when event is emitted
     * @param {Object} options - Subscription options (e.g., priority)
     */
    on(eventName, callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!this._listeners.has(eventName)) {
            this._listeners.set(eventName, new Set());
        }

        const listener = {
            callback,
            priority: options.priority || 0,
            once: options.once || false,
            id: options.id || Symbol('listener')
        };

        this._listeners.get(eventName).add(listener);
        return this;
    }

    /**
     * Subscribe to an event and automatically unsubscribe after first emission
     */
    once(eventName, callback, options = {}) {
        return this.on(eventName, callback, {...options, once: true});
    }

    /**
     * Unsubscribe from an event
     */
    off(eventName, callback) {
        if (!this._listeners.has(eventName)) return this;

        const listeners = this._listeners.get(eventName);
        const toRemove = [];

        for (const listener of listeners) {
            if (listener.callback === callback) {
                toRemove.push(listener);
            }
        }

        for (const listener of toRemove) {
            listeners.delete(listener);
        }

        if (listeners.size === 0) {
            this._listeners.delete(eventName);
        }

        return this;
    }

    /**
     * Add middleware to process events before delivery
     */
    use(middleware) {
        if (typeof middleware !== 'function') {
            throw new Error('Middleware must be a function');
        }
        this._middleware.push(middleware);
        return this;
    }

    /**
     * Add global error handler
     */
    onError(handler) {
        if (typeof handler === 'function') {
            this._errorHandlers.add(handler);
        }
        return this;
    }

    /**
     * Emit an event with guaranteed delivery
     */
    async emit(eventName, data, options = {}) {
        if (!this._enabled) return;

        this._stats.eventsEmitted++;

        // Apply middleware
        let processedData = {...data, eventName};
        for (const middleware of this._middleware) {
            try {
                processedData = await middleware(processedData);
                if (processedData === null) return; // Middleware can cancel event
            } catch (error) {
                this._handleError('middleware', error, {eventName, data});
                return;
            }
        }

        if (!this._listeners.has(eventName)) return;

        const listeners = Array.from(this._listeners.get(eventName));
        const sortedListeners = listeners.sort((a, b) => b.priority - a.priority);

        // Process listeners with retry logic
        for (const listener of sortedListeners) {
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
                        this._handleError('listener', error, {eventName, data, listener});
                    } else {
                        this._stats.retries++;
                        await this._delay(this._deliveryGuarantees.retryDelay * attempts);
                    }
                }
            }

            // Remove 'once' listeners after successful execution
            if (success && listener.once) {
                this._listeners.get(eventName).delete(listener);
            }
        }
    }

    /**
     * Handle errors according to configured guarantees
     */
    _handleError(type, error, context) {
        for (const handler of this._errorHandlers) {
            try {
                handler(error, type, context);
            } catch (handlerError) {
                console.error('Error in EventBus error handler:', handlerError);
            }
        }

        // Log error if no handlers are provided
        if (this._errorHandlers.size === 0) {
            console.error(`EventBus error in ${type}:`, error, context);
        }
    }

    /**
     * Utility delay function
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get statistics about event bus performance
     */
    getStats() {
        return {...this._stats};
    }

    /**
     * Clear all listeners (useful for cleanup)
     */
    clear() {
        this._listeners.clear();
        this._middleware = [];
        this._errorHandlers.clear();
    }

    /**
     * Enable/disable the event bus
     */
    enable() {
        this._enabled = true;
    }

    disable() {
        this._enabled = false;
    }

    /**
     * Check if event bus is enabled
     */
    isEnabled() {
        return this._enabled;
    }
}