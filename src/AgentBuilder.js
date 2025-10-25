import { Agent } from './Agent.js';
import { NAR } from './nar/NAR.js';
import { BaseModule } from './module/BaseModule.js';

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
        this.modules.push(module);
        this.config.modules[module.name] = moduleConfig;
        return this;
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
