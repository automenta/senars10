/**
 * @file src/tools/BaseTool.js
 * @description Base class for all tools
 */

/**
 * Base Tool class that all tools should extend
 */
export class BaseTool {
    /**
     * @param {object} config - Tool configuration
     */
    constructor(config = {}) {
        this.config = config;
        this.name = this.constructor.name;
    }

    /**
     * Execute the tool with given parameters
     * @param {object} params - Tool parameters
     * @param {object} context - Execution context
     * @returns {Promise<any>} - Tool execution result
     */
    async execute(params, context) {
        throw new Error('Tool must implement execute method');
    }

    /**
     * Get tool description for discovery and documentation
     * @returns {string} - Tool description
     */
    getDescription() {
        throw new Error('Tool must implement getDescription method');
    }

    /**
     * Get parameter schema for the tool
     * @returns {object|null} - Parameter schema or null if not defined
     */
    getParameterSchema() {
        return null;
    }

    /**
     * Validate parameters before execution
     * @param {object} params - Tool parameters to validate
     * @returns {object} - Validation result with valid boolean and optional errors array
     */
    validate(params) {
        return { valid: true };
    }

    /**
     * Get tool capabilities
     * @returns {Array<string>} - List of tool capabilities
     */
    getCapabilities() {
        return [];
    }

    /**
     * Get tool category
     * @returns {string} - Tool category
     */
    getCategory() {
        return 'general';
    }
}