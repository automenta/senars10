import { Agent } from './Agent.js';
import { NAR } from './nar/NAR.js';
import { BaseModule } from './module/BaseModule.js';
import { MetricsMonitor } from './module/MetricsMonitor.js';
import { EmbeddingLayer } from './module/EmbeddingLayer.js';
import { ToolEngine } from './module/ToolEngine.js';
import { CoreFunctorModule } from './module/CoreFunctorModule.js';
import { CoreRuleModule } from './module/CoreRuleModule.js';

/**
 * @file src/AgentBuilder.js
 * @description A fluent builder for constructing and configuring a SeNARS Agent.
 *
 * This builder allows for a declarative and modular setup of the agent,
 * enabling flexible configurations by attaching different modules. It orchestrates
 * the construction of the agent's core components and manages the lifecycle
 * (registration, initialization) of all attached modules.
 */
export class AgentBuilder {
    constructor() {
        this.config = {
            narConfig: {},
            modules: {},
            metrics: false,
            embeddingLayer: false,
            toolEngine: false,
            coreFunctors: true, // Core functors are enabled by default
            coreRules: true, // Core rules are enabled by default
        };
        this.modules = [];
    }

    /**
     * Sets the configuration for the NAR (cognitive core).
     * @param {object} narConfig - The configuration object for the NAR.
     * @returns {AgentBuilder} The builder instance for chaining.
     */
    withNARConfig(narConfig) {
        this.config.narConfig = { ...this.config.narConfig, ...narConfig };
        return this;
    }

    /**
     * Enables the MetricsMonitor module.
     * @param {object} [metricsConfig={}] - Configuration for the MetricsMonitor.
     * @returns {AgentBuilder} The builder instance for chaining.
     */
    withMetrics(metricsConfig = {}) {
        this.config.metrics = true;
        this.config.modules['MetricsMonitor'] = metricsConfig;
        return this;
    }

    /**
     * Enables the EmbeddingLayer module.
     * @param {object} [embeddingConfig={}] - Configuration for the EmbeddingLayer.
     * @returns {AgentBuilder} The builder instance for chaining.
     */
    withEmbeddingLayer(embeddingConfig = {}) {
        this.config.embeddingLayer = true;
        this.config.modules['EmbeddingLayer'] = embeddingConfig;
        return this;
    }

    /**
     * Enables the ToolEngine module.
     * @param {object} [toolEngineConfig={}] - Configuration for the ToolEngine.
     * @returns {AgentBuilder} The builder instance for chaining.
     */
    withToolEngine(toolEngineConfig = {}) {
        this.config.toolEngine = true;
        this.config.modules['ToolEngine'] = toolEngineConfig;
        return this;
    }

    /**
     * Configures the CoreFunctorModule.
     * @param {boolean} enabled - Whether to enable the core functors.
     * @returns {AgentBuilder} The builder instance for chaining.
     */
    withCoreFunctors(enabled = true) {
        this.config.coreFunctors = enabled;
        return this;
    }

    /**
     * Configures the CoreRuleModule.
     * @param {boolean} enabled - Whether to enable the core rules.
     * @returns {AgentBuilder} The builder instance for chaining.
     */
    withCoreRules(enabled = true) {
        this.config.coreRules = enabled;
        return this;
    }

    /**
     * Adds a module to be included in the agent.
     * The module instance is stored and its configuration can be provided separately.
     *
     * @param {BaseModule} module - The module instance to add.
     * @param {object} [moduleConfig={}] - Configuration for this specific module.
     * @returns {AgentBuilder} The builder instance for chaining.
     */
    withModule(module, moduleConfig = {}) {
        if (!(module instanceof BaseModule)) {
            throw new Error('Module must be an instance of BaseModule.');
        }
        // Avoid duplicating modules if they are added both explicitly and via a helper method
        if (!this.modules.some(m => m.name === module.name)) {
            this.modules.push(module);
        }
        this.config.modules[module.name] = { ...this.config.modules[module.name], ...moduleConfig };
        return this;
    }

    /**
     * Prepares built-in modules based on the configuration.
     * This method is called internally by `build()`.
     */
    _prepareBuiltInModules() {
        if (this.config.metrics) {
            const metricsConfig = this.config.modules['MetricsMonitor'] || {};
            this.withModule(new MetricsMonitor(), metricsConfig);
        }
        if (this.config.embeddingLayer) {
            const embeddingConfig = this.config.modules['EmbeddingLayer'] || {};
            this.withModule(new EmbeddingLayer(), embeddingConfig);
        }
        if (this.config.toolEngine) {
            const toolEngineConfig = this.config.modules['ToolEngine'] || {};
            this.withModule(new ToolEngine(), toolEngineConfig);
        }
        if (this.config.coreFunctors) {
            this.withModule(new CoreFunctorModule());
        }
        if (this.config.coreRules) {
            this.withModule(new CoreRuleModule());
        }
    }


    /**
     * Constructs the Agent instance with the specified configuration and modules.
     * The process is as follows:
     * 1. A core Agent instance with its NAR is created.
     * 2. All attached modules are registered, allowing them to hook into the agent.
     * 3. All attached modules are initialized asynchronously.
     *
     * @returns {Promise<Agent>} A promise that resolves to the fully constructed and initialized Agent.
     */
    async build() {
        this._prepareBuiltInModules(); // Prepare built-in modules before building

        // Create the core NAR and Agent. Later, this will be refactored to
        // inject dependencies into the NAR constructor.
        const nar = new NAR(this.config.narConfig);
        const agent = new Agent({ nar });

        // Attach modules to the agent for its reference
        agent.modules = this.modules;

        // Register all modules, allowing them to set up their connections
        // within the agent's ecosystem.
        for (const module of this.modules) {
            const moduleConfig = this.config.modules[module.name] || {};
            module.register(agent, moduleConfig);
        }

        // Initialize all modules, performing any necessary async setup.
        for (const module of this.modules) {
            const moduleConfig = this.config.modules[module.name] || {};
            await module.initialize(agent, moduleConfig);
        }

        return agent;
    }
}
