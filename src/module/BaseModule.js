/**
 * @file src/module/BaseModule.js
 * @description Base class for all pluggable modules in the SeNARS system.
 *
 * This class defines a consistent interface for modules to be registered and initialized
 * within the agent architecture. By conforming to this interface, different subsystems
 * can be developed independently and plugged into the system in a configurable manner.
 */

export class BaseModule {
    /**
     * @param {string} name - The unique name of the module.
     */
    constructor(name) {
        if (!name) {
            throw new Error('Module must have a name.');
        }
        this.name = name;
    }

    /**
     * Registers the module with the agent's core components.
     * This method is where the module can interact with the NAR, event bus, or other
     * core services to hook its functionality into the system.
     *
     * @param {object} agent - The main agent instance.
     * @param {object} config - The module-specific configuration.
     */
    register(agent, config) {
        // To be implemented by subclasses.
        // This is where the module would register listeners, add routes, etc.
    }

    /**
     * Initializes the module.
     * This method is called after all modules have been registered. It is the place for
     * any setup that might depend on other modules being in place, such as fetching
     * data, establishing connections, or starting timers.
     *
     * @param {object} agent - The main agent instance.
     * @param {object} config - The module-specific configuration.
     * @returns {Promise<void>}
     */
    async initialize(agent, config) {
        // To be implemented by subclasses.
    }
}
