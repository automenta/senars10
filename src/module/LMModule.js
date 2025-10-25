import { BaseModule } from './BaseModule.js';
import { ProviderRegistry } from '../lm/ProviderRegistry.js';
import { ModelSelector } from '../lm/ModelSelector.js';
import { NarseseTranslator } from '../lm/NarseseTranslator.js';

/**
 * @file src/module/LMModule.js
 * @description The semantic reasoning and LM-interaction module.
 *
 * This module encapsulates the functionality for interacting with large language models,
 * including provider management, model selection, and Narsese translation. It provides
 * a unified interface for the reasoning core to leverage semantic capabilities.
 */
export class LMModule extends BaseModule {
    constructor() {
        super('lm');
        this.providers = new ProviderRegistry();
        this.modelSelector = new ModelSelector(this.providers);
        this.narseseTranslator = new NarseseTranslator();
        this.lmStats = {
            totalCalls: 0,
            totalTokens: 0,
            avgResponseTime: 0,
            providerUsage: new Map()
        };
    }

    /**
     * Registers the LM capabilities with the agent.
     * @param {object} agent - The main agent instance.
     * @param {object} config - The module-specific configuration.
     */
    register(agent, config) {
        this.agent = agent;
        this.config = config;

        // Make the LM capabilities available on the agent
        agent.lm = this;
    }

    /**
     * Initializes the LM providers.
     * @returns {Promise<void>}
     */
    async initialize() {
        // In the future, this is where we would dynamically load and
        // initialize providers based on the configuration.
    }

    registerProvider(id, provider) {
        this.providers.register(id, provider);
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
            const responseTime = Date.now() - startTime;
            this._updateStats(prompt, result, responseTime, providerId);
            return result;
        } catch (error) {
            console.error(`LM generateText failed for provider ${providerId}:`, error);
            throw error;
        }
    }

    _updateStats(prompt, result, responseTime, providerId) {
        this.lmStats.totalCalls++;
        const promptTokens = this._countTokens(prompt);
        const resultTokens = this._countTokens(result);
        this.lmStats.totalTokens += promptTokens + resultTokens;
        this.lmStats.avgResponseTime =
            (this.lmStats.avgResponseTime * (this.lmStats.totalCalls - 1) + responseTime) / this.lmStats.totalCalls;

        const usage = this.lmStats.providerUsage.get(providerId) || { calls: 0, tokens: 0 };
        usage.calls++;
        usage.tokens += resultTokens;
        this.lmStats.providerUsage.set(providerId, usage);
    }

    _countTokens(text) {
        if (typeof text !== 'string') return 0;
        return text.split(/\s+/).filter(Boolean).length;
    }

    getMetrics() {
        return {
            providerCount: this.providers.size,
            ...this.lmStats
        };
    }
}
