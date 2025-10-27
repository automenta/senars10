import {BaseComponent} from '../util/BaseComponent.js';
import {Metrics} from '../util/Metrics.js';
import {ProviderRegistry} from './ProviderRegistry.js';
import {ModelSelector} from './ModelSelector.js';
import {NarseseTranslator} from './NarseseTranslator.js';
import {CircuitBreaker} from '../util/CircuitBreaker.js';

/**
 * Main Language Model component that manages LM providers and operations.
 * Implements the comprehensive LM infrastructure specified in DESIGN.md
 */
export class LM extends BaseComponent {
    constructor(config = {}, eventBus = null) {
        super(config, 'LM', eventBus);

        this.providers = new ProviderRegistry();
        this.modelSelector = new ModelSelector(this.providers);
        this.narseseTranslator = new NarseseTranslator();
        this.circuitBreaker = new CircuitBreaker({
            failureThreshold: (this.config.circuitBreaker || {}).failureThreshold || 5,
            timeout: (this.config.circuitBreaker || {}).timeout || 60000,
            resetTimeout: (this.config.circuitBreaker || {}).resetTimeout || 30000
        });

        this.lmMetrics = new Metrics();
        this.activeWorkflows = new Set();
        this.lmStats = {
            totalCalls: 0,
            totalTokens: 0,
            avgResponseTime: 0,
            providerUsage: new Map()
        };

        Object.freeze(this);
    }

    get config() { return {...this._config}; }
    get metrics() { return this.lmMetrics; }

    async _initialize() {
        if (this.lmMetrics.initialize) {
            await this.lmMetrics.initialize(this.config.metrics || {});
        }

        this.logInfo('LM component initialized', {
            config: Object.keys(this.config),
            providerCount: this.providers.size
        });
    }

    registerProvider(id, provider) {
        this.providers.register(id, provider);
        this.logInfo('Provider registered', {
            providerId: id,
            default: id === this.providers.defaultProviderId
        });

        return this;
    }

    _getProvider(providerId = null) {
        const id = providerId || this.providers.defaultProviderId;
        return id && this.providers.has(id) ? this.providers.get(id) : null;
    }

    async generateText(prompt, options = {}, providerId = null) {
        const provider = this._getProvider(providerId);
        if (!provider) {
            throw new Error(`Provider "${providerId || this.providers.defaultProviderId}" not found.`);
        }

        const startTime = Date.now();
        try {
            const result = await this.circuitBreaker.execute(() => provider.generateText(prompt, options));

            this.lmStats.totalCalls++;
            this.lmStats.totalTokens += this._countTokens(prompt) + this._countTokens(result);
            const responseTime = Date.now() - startTime;
            this.lmStats.avgResponseTime = (this.lmStats.avgResponseTime * (this.lmStats.totalCalls - 1) + responseTime) / this.lmStats.totalCalls;

            const usage = this.lmStats.providerUsage.get(providerId) || {calls: 0, tokens: 0};
            usage.calls++;
            usage.tokens += this._countTokens(result);
            this.lmStats.providerUsage.set(providerId, usage);

            this.updateMetric('totalCalls', this.lmStats.totalCalls);
            this.updateMetric('totalTokens', this.lmStats.totalTokens);
            this.updateMetric('avgResponseTime', this.lmStats.avgResponseTime);

            return result;
        } catch (error) {
            this.logError(`LM generateText failed for provider ${providerId}:`, error);
            
            if (error.message && error.message.includes('Circuit breaker is OPEN')) {
                this.logInfo(`Circuit breaker is OPEN for provider ${providerId}, using fallback...`);
                return this._handleFallback(prompt, options);
            }
            
            throw error;
        }
    }

    async generateEmbedding(text, providerId = null) {
        const provider = this._getProvider(providerId);
        if (!provider) {
            throw new Error(`Provider "${providerId || this.providers.defaultProviderId}" not found.`);
        }

        try {
            return await this.circuitBreaker.execute(() => provider.generateEmbedding(text));
        } catch (error) {
            this.logError(`LM generateEmbedding failed for provider ${providerId}:`, error);
            
            if (error.message && error.message.includes('Circuit breaker is OPEN')) {
                this.logInfo(`Circuit breaker is OPEN for provider ${providerId}, using fallback...`);
                return this._handleEmbeddingFallback(text);
            }
            
            throw error;
        }
    }

    async process(prompt, options = {}, providerId = null) {
        const provider = this._getProvider(providerId);
        if (!provider) {
            throw new Error(`Provider "${providerId || this.providers.defaultProviderId}" not found.`);
        }

        try {
            if (typeof provider.process === 'function') {
                return await this.circuitBreaker.execute(() => provider.process(prompt, options));
            } else {
                return provider.generateText ? await this.generateText(prompt, options, providerId) :
                    provider.generate ? await provider.generate(prompt, options) : prompt;
            }
        } catch (error) {
            this.logError(`LM process failed for provider ${providerId}:`, error);
            
            if (error.message && error.message.includes('Circuit breaker is OPEN')) {
                this.logInfo(`Circuit breaker is OPEN for provider ${providerId}, using fallback...`);
                return this._handleFallback(prompt, options);
            }
            
            throw error;
        }
    }

    selectOptimalModel(task, constraints = {}) { return this.modelSelector.select(task, constraints); }
    getAvailableModels() { return this.modelSelector.getAvailableModels(); }

    _countTokens = text => typeof text === 'string' ? text.split(/\s+/).filter(token => token.length > 0).length : 0;

    _handleFallback(prompt, options = {}) {
        this.logInfo('Using fallback strategy - LM unavailable, degrading to pure NAL reasoning');
        return `FALLBACK: Processed with pure NAL reasoning - ${prompt}`;
    }

    _handleEmbeddingFallback(text) {
        this.logInfo('Using fallback strategy - Generate embedding unavailable');
        const textLength = text ? text.length : 0;
        return Array(8).fill(0).map((_, i) => Math.sin(textLength * (i + 1) * 0.1));
    }

    getMetrics() {
        return {
            providerCount: this.providers.size,
            lmStats: {...this.lmStats},
            providerUsage: new Map(this.lmStats.providerUsage)
        };
    }

    getCircuitBreakerState() { return this.circuitBreaker.getState(); }
    resetCircuitBreaker() { this.circuitBreaker.reset(); this.logInfo('Circuit breaker reset'); }
    translateToNarsese(text) { return this.narseseTranslator.toNarsese(text); }
    translateFromNarsese(narsese) { return this.narseseTranslator.fromNarsese(narsese); }
}