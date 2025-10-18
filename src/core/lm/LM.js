import {Logger} from '../../util/Logger.js';
import {Metrics} from '../util/Metrics.js';
import {ProviderRegistry} from './ProviderRegistry.js';
import {ModelSelector} from './ModelSelector.js';
import {NarseseTranslator} from './NarseseTranslator.js';

/**
 * Main Language Model component that manages LM providers and operations.
 * Implements the comprehensive LM infrastructure specified in DESIGN.md
 */
export class LM {
    constructor(config = {}) {
        this._config = {...config};
        this.providers = new ProviderRegistry();
        this.modelSelector = new ModelSelector(this.providers);
        this.narseseTranslator = new NarseseTranslator();
        this.metrics = new Metrics();
        this.activeWorkflows = new Set();

        // Track LM usage metrics
        this.lmStats = {
            totalCalls: 0,
            totalTokens: 0,
            avgResponseTime: 0,
            providerUsage: new Map()
        };

        Object.freeze(this);
    }

    get config() {
        return {...this._config};
    }

    async initialize(config = {}) {
        // Create a new instance with updated config to maintain immutability
        const newLM = new LM({...this._config, ...config});

        // Initialize metrics tracker with config
        if (newLM.metrics.initialize) {
            await newLM.metrics.initialize(config.metrics || {});
        }

        Logger.info('LM component initialized', {
            config: Object.keys(config),
            providerCount: newLM.providers.size
        });

        return newLM;
    }

    registerProvider(id, provider) {
        this.providers.register(id, provider);

        Logger.info('Provider registered', {
            providerId: id,
            default: id === this.providers.defaultProviderId
        });

        return this;
    }

    _getProvider(providerId = null) {
        const id = providerId || this.providers.defaultProviderId;
        if (!id || !this.providers.has(id)) {
            return null;
        }
        return this.providers.get(id);
    }

    async generateText(prompt, options = {}, providerId = null) {
        const provider = this._getProvider(providerId);
        if (!provider) {
            throw new Error(`Provider "${providerId || this.providers.defaultProviderId}" not found.`);
        }

        const startTime = Date.now();
        try {
            const result = await provider.generateText(prompt, options);

            // Update metrics
            this.lmStats.totalCalls++;
            this.lmStats.totalTokens += this._countTokens(prompt) + this._countTokens(result);
            const responseTime = Date.now() - startTime;
            this.lmStats.avgResponseTime = (this.lmStats.avgResponseTime * (this.lmStats.totalCalls - 1) + responseTime) / this.lmStats.totalCalls;

            // Track provider usage
            const usage = this.lmStats.providerUsage.get(providerId) || {calls: 0, tokens: 0};
            usage.calls++;
            usage.tokens += this._countTokens(result);
            this.lmStats.providerUsage.set(providerId, usage);

            return result;
        } catch (error) {
            Logger.error(`LM generateText failed for provider ${providerId}:`, error);
            throw error;
        }
    }

    async generateEmbedding(text, providerId = null) {
        const provider = this._getProvider(providerId);
        if (!provider) {
            throw new Error(`Provider "${providerId || this.providers.defaultProviderId}" not found.`);
        }

        return provider.generateEmbedding(text);
    }

    async process(prompt, options = {}, providerId = null) {
        const provider = this._getProvider(providerId);
        if (!provider) {
            throw new Error(`Provider "${providerId || this.providers.defaultProviderId}" not found.`);
        }

        if (typeof provider.process === 'function') {
            return provider.process(prompt, options);
        } else {
            // Fallback to generateText if process method is not available
            return provider.generateText ? provider.generateText(prompt, options) :
                provider.generate ? provider.generate(prompt, options) : prompt;
        }
    }

    selectOptimalModel(task, constraints = {}) {
        return this.modelSelector.select(task, constraints);
    }

    getAvailableModels() {
        return this.modelSelector.getAvailableModels();
    }

    _countTokens = text => {
        if (typeof text !== 'string') return 0;
        return text.split(/\s+/).filter(token => token.length > 0).length;
    };

    getMetrics() {
        return {
            providerCount: this.providers.size,
            lmStats: {...this.lmStats},
            providerUsage: new Map(this.lmStats.providerUsage)
        };
    }

    translateToNarsese(text) {
        return this.narseseTranslator.toNarsese(text);
    }

    translateFromNarsese(narsese) {
        return this.narseseTranslator.fromNarsese(narsese);
    }
}