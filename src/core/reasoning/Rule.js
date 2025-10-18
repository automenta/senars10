import {Metrics} from '../util/Metrics.js';
import {TRUTH} from '../config/constants.js';
import {clamp} from '../../util/common.js';

export class Rule {
    constructor(id, type, priority = 1.0, config = {}) {
        if (!id || typeof id !== 'string') {
            throw new Error('Rule ID must be a non-empty string');
        }

        this._id = id;
        this._type = type;
        this._priority = clamp(priority, TRUTH.MIN_PRIORITY, TRUTH.MAX_PRIORITY);
        this._config = Object.freeze({...config});
        this._enabled = config.enabled !== false;
        this._metrics = Object.freeze({
            applications: 0, successes: 0, failures: 0, totalTime: 0, createdAt: Date.now()
        });
    }

    get id() {
        return this._id;
    }

    get type() {
        return this._type;
    }

    get priority() {
        return this._priority;
    }

    get enabled() {
        return this._enabled;
    }

    get config() {
        return this._config;
    }

    get metrics() {
        return this._metrics;
    }

    // Immutable state modifiers
    enable() {
        return this._updateIfChanged('_enabled', true);
    }

    disable() {
        return this._updateIfChanged('_enabled', false);
    }

    withPriority(priority) {
        return this._updateIfChanged('_priority', clamp(priority, TRUTH.MIN_PRIORITY, TRUTH.MAX_PRIORITY));
    }

    withConfig(config) {
        return this._updateIfChanged('_config', {...this._config, ...config});
    }

    // Helper methods for common operations
    _updateIfChanged(propName, newValue) {
        if (propName === '_enabled') {
            // Special handling: _enabled maps to 'enabled' in config
            const newConfig = {...this._config, enabled: newValue};
            return this._enabled === newValue ? this : this._clone({}, newConfig);
        }
        return this[propName] === newValue ? this : this._clone({[propName]: newValue});
    }

    canApply(task) {
        return this._enabled && this._matches(task);
    }

    apply(task) {
        if (!this.canApply(task)) return {results: [], rule: this};

        const start = performance.now();
        try {
            const results = this._apply(task);
            return {results, rule: this._updateMetrics(true, performance.now() - start)};
        } catch (error) {
            throw {error, rule: this._updateMetrics(false, performance.now() - start)};
        }
    }

    // Template methods - to be overridden by subclasses
    _matches(task) {
        return this._enabled;
    }

    _apply(task) {
        return [];
    }

    // Internal utilities
    _clone(overrides = {}, newConfig = null) {
        const Constructor = this.constructor;
        const configArg = newConfig || {...this._config, ...overrides};

        // Handle different constructor signatures for subclasses  
        const newRule = new Constructor(this._id, this._type, this._priority, configArg);
        Object.freeze(newRule);
        return newRule;
    }

    _updateMetrics(success, time) {
        const metrics = Metrics.update(this._metrics, success, time);
        const newRule = this._clone({metrics});
        return newRule;
    }

    // Freeze the rule instance - should be called at the end of subclass constructors
    _freeze() {
        Object.freeze(this);
        return this;
    }
}