/**
 * @file core/lm/LM.js
 * @description Main Language Model component that manages LM providers and operations
 */

import Component from '../base/Component.js';
import { Logger } from '../base/utilities.js';

// Import modularized components
import MetricsTracker from './MetricsTracker.js';
import ResourceManager from './ResourceManager.js';
import WorkflowEngine from './WorkflowEngine.js';

import NarseseTranslator from './NarseseTranslator.js';
import JSONSerializer from './JSONSerializer.js';
import StreamingProcessor from './StreamingProcessor.js';
import ProtocolAdapters from './ProtocolAdapters.js';
import ProviderRegistry from './ProviderRegistry.js';
import ModelSelector from './ModelSelector.js';
import { Reasoner } from '../Reasoner.js';



/**
 * Main Language Model component that manages LM providers and operations.
 * Neurosymbolic operations are handled entirely by the rule system.
 */
class LM extends Component {
  /**
   * Creates a new LM component instance
   */
  constructor() {
    super();
    this.providers = new ProviderRegistry();
    this.modelSelector = new ModelSelector(this.providers);
    this.metrics = new MetricsTracker();
    this.resourceManager = new ResourceManager();
    this.workflows = new WorkflowEngine();
    this.ioAdapters = {
      narseseConverter: new NarseseTranslator(),
      jsonSerializer: new JSONSerializer(),
      streamingProcessor: new StreamingProcessor(),
      protocolAdapters: new ProtocolAdapters()
    };
    this.activeWorkflows = new Set();
    // Initialize with a placeholder that will be replaced by system integration
    this.reasoner = new Reasoner();
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.providers.defaultProviderId = config.defaultProvider || null;

    // Initialize metrics tracker with config
    if (this.metrics.initialize) {
      await this.metrics.initialize(config.metrics || {});
    }

    // Initialize resource manager with config
    if (this.resourceManager.initialize) {
      await this.resourceManager.initialize(config.resources || {});
    }

    // Initialize workflow engine with config
    if (this.workflows.initialize) {
      await this.workflows.initialize(config.workflows || {});
    }

    Logger.info('LM component initialized', { config: Object.keys(config) });
  }

  registerProvider(id, provider) {
    this.providers.register(id, provider);

    // Register provider with resource manager
    if (this.resourceManager.registerProvider) {
      this.resourceManager.registerProvider(id, provider);
    }

    Logger.info('Provider registered', { providerId: id, default: id === this.providers.defaultProviderId });
  }

  _getProvider(providerId = null) {
    const id = providerId || this.providers.defaultProviderId || this.defaultProviderId;
    if (!id || !this.providers.has(id)) {
      // In test environments or when no providers are configured, return null
      // to allow graceful fallbacks
      return null;
    }
    return this.providers.get(id);
  }

  async generateText(prompt, options = {}, providerId = null) {
    return this._withMetrics('generateText', { prompt, options }, providerId,
      (provider, args) => provider.generateText(args.prompt, args.options));
  }

  async generateEmbedding(text, providerId = null) {
    return this._withMetrics('generateEmbedding', { text }, providerId,
      (provider, args) => provider.generateEmbedding(args.text));
  }

  async generateHypothesis(observations, options = {}, providerId = null) {
    return this._withMetrics('generateHypothesis', { observations, options }, providerId,
      (provider, args) => {
        if (typeof provider.generateHypothesis !== 'function') {
          throw new Error(`${this.constructor.name}: Provider "${providerId || this.defaultProviderId}" does not support hypothesis generation.`);
        }
        return provider.generateHypothesis(args.observations, args.options);
      });
  }

  async process(prompt, options = {}, providerId = null) {
    return this._withMetrics('process', { prompt, options }, providerId,
      (provider, args) => {
        if (typeof provider.process === 'function') {
          return provider.process(args.prompt, args.options);
        } else {
          // Fallback to generateText if process method is not available
          return provider.generateText ? provider.generateText(args.prompt, args.options) : 
                 provider.generate ? provider.generate(args.prompt, args.options) : prompt;
        }
      });
  }

  // Generic method to handle operations with metrics
  async _withMetrics(operation, args, providerId, operationFn) {
    const startTime = Date.now();
    const actualProviderId = providerId || this.defaultProviderId;

    // Check if provider exists
    const provider = this._getProvider(providerId);
    if (!provider) {
      const error = new Error(`Provider "${actualProviderId}" not found or no default provider is set.`);
      this.metrics.track({
        operation,
        providerId: actualProviderId,
        error: error.message,
        processingTime: Date.now() - startTime,
        timestamp: Date.now()
      });

      throw error;
    }

    try {
      const result = await operationFn(provider, args);

      this.metrics.track({
        operation,
        providerId: actualProviderId,
        inputTokens: operation === 'generateHypothesis'
          ? args.observations.reduce((sum, obs) => sum + this._countTokens(obs), 0)
          : this._countTokens(args.prompt || args.text),
        outputTokens: this._countTokens(result),
        processingTime: Date.now() - startTime,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      this.metrics.track({
        operation,
        providerId: actualProviderId,
        error: error.message,
        processingTime: Date.now() - startTime,
        timestamp: Date.now()
      });

      throw error;
    }
  }
  
  async selectOptimalModel(task, constraints = {}) {
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
      ...super.getMetrics(),
      providerCount: this.providers.size(),
      metrics: this.metrics.getMetrics ? this.metrics.getMetrics() : {},
      resourceUsage: this.resourceManager.getUsage ? this.resourceManager.getUsage() : {}
    };
  }

  async destroy() {
    for (const workflowId of this.activeWorkflows) {
      try {
        await this.workflows?.stop?.(workflowId) ?? Promise.resolve();
      } catch (error) {
        Logger.error('Error stopping workflow during destroy', { workflowId, error: error.message });
      }
    }
    this.activeWorkflows.clear();
    this.modelSelector?.clearCache?.();
    await super.destroy();
  }

  // LM class is now simple - just handles basic LM operations
  // Neurosymbolic operations are handled entirely by the rule system
}

export default LM;