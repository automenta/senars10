import {Metrics} from '../util/Metrics.js';
import {TRUTH} from '../config/constants.js';
import {clamp} from '../util/common.js';

export class Rule {
    constructor(id, type, priority = 1.0, config = {}) {
        if (!id || typeof id !== 'string') throw new Error('Rule ID must be a non-empty string');

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

    _updateIfChanged(prop, val) {
        if (prop === '_enabled') {
            const newConfig = {...this._config, enabled: val};
            return this._enabled === val ? this : this._clone({}, newConfig);
        }
        return this[prop] === val ? this : this._clone({[prop]: val});
    }

    canApply(task) {
        return this._enabled && this._matches(task);
    }

    async apply(task, memoryOrContext, termFactory) {
        const {
            effectiveContext,
            effectiveMemory,
            effectiveTermFactory
        } = this._resolveContext(memoryOrContext, termFactory);

        if (!this.canApply(task)) return {results: [], rule: this};

        const start = performance.now();
        try {
            const results = effectiveContext
                ? await this._applyWithContext(task, effectiveContext)
                : await this._apply(task, effectiveMemory, effectiveTermFactory);

            if (effectiveContext) {
                effectiveContext.incrementMetric('rulesApplied');
                Array.isArray(results) && effectiveContext.incrementMetric('inferencesMade', results.length);
            }

            return {results, rule: this._updateMetrics(true, performance.now() - start)};
        } catch (error) {
            throw {error, rule: this._updateMetrics(false, performance.now() - start)};
        }
    }

    _resolveContext(memoryOrContext, termFactory) {
        const isContext = memoryOrContext?.hasOwnProperty('config');

        return isContext
            ? {
                effectiveContext: memoryOrContext,
                effectiveMemory: memoryOrContext.memory,
                effectiveTermFactory: memoryOrContext.termFactory || termFactory
            }
            : {effectiveMemory: memoryOrContext, effectiveTermFactory: termFactory, effectiveContext: null};
    }

    async _applyWithContext(task, context) {
        return await this._apply(task, context.memory, context.termFactory);
    }

    _matches(task) {
        return this._enabled;
    }

    _apply(task, memory, termFactory) {
        return [];
    }

    _clone(overrides = {}, newConfig = null) {
        const configArg = newConfig || {...this._config, ...overrides};
        const newRule = new this.constructor(this._id, this._type, this._priority, configArg);
        return Object.freeze(newRule);
    }

    _updateMetrics(success, time) {
        const metrics = Metrics.update(this._metrics, success, time);
        return this._clone({metrics});
    }

    _freeze() {
        Object.freeze(this);
        return this;
    }
}