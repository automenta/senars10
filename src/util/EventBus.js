import {Logger} from './Logger.js';

export class EventBus {
    constructor() {
        this._events = new Map();
        this.logger = Logger;
    }

    on(eventName, listener) {
        if (typeof listener !== 'function') {
            throw new Error('Event listener must be a function');
        }
        this._events.has(eventName) || this._events.set(eventName, new Set());
        this._events.get(eventName).add(listener);
    }

    off(eventName, listener) {
        return this._events.get(eventName)?.delete(listener) || false;
    }

    emit(eventName, data) {
        const listeners = this._events.get(eventName);
        if (!listeners) return;
        listeners.forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                this.logger.error(`Error in event listener for '${eventName}':`, error);
            }
        });
    }

    removeAllListeners(eventName) {
        this._events.delete(eventName);
    }

    removeAllListenersForAllEvents() {
        this._events.clear();
    }

    eventNames() {
        return Array.from(this._events.keys());
    }

    listenerCount(eventName) {
        return this._events.get(eventName)?.size || 0;
    }

    hasListeners(eventName) {
        return this.listenerCount(eventName) > 0;
    }

    once(eventName, listener) {
        const onceListener = (data) => {
            this.off(eventName, onceListener);
            listener(data);
        };
        this.on(eventName, onceListener);
    }

    waitFor(eventName) {
        return new Promise(resolve => this.once(eventName, resolve));
    }
}