/**
 * @file src/tools/BaseTool.js
 * @description Base class for all tools
 */

/**
 * Base Tool class that all tools should extend
 * Follows patterns from v8/coreagent/tools architecture
 */
export class BaseTool {
    /**
     * @param {object} config - Tool configuration
     */
    constructor(config = {}) {
        this.config = config;
        this.name = this.constructor.name;
        this.createdAt = Date.now();
        this.usageCount = 0;
        this.lastUsed = null;
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
        return {
            type: 'object',
            properties: {},
            required: []
        };
    }

    /**
     * Validate parameters before execution
     * @param {object} params - Tool parameters to validate
     * @returns {object} - Validation result with valid boolean and optional errors array
     */
    validate(params) {
        const schema = this.getParameterSchema();
        if (!schema) return {isValid: true, errors: []};

        const errors = [];

        // Validate required parameters
        if (Array.isArray(schema.required)) {
            for (const requiredParam of schema.required) {
                if (!(requiredParam in params)) {
                    errors.push(`Missing required parameter: ${requiredParam}`);
                }
            }
        }

        // Validate parameter types and enums
        if (schema.properties) {
            for (const [key, propSchema] of Object.entries(schema.properties)) {
                if (!(key in params)) continue;

                const value = params[key];

                if (propSchema.type && typeof value !== propSchema.type) {
                    errors.push(`Parameter '${key}' must be of type ${propSchema.type}`);
                }

                if (Array.isArray(propSchema.enum) && !propSchema.enum.includes(value)) {
                    errors.push(`Parameter '${key}' must be one of: ${propSchema.enum.join(', ')}`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
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

    /**
     * Called before tool execution - can be overridden for setup
     * @param {object} params - Tool parameters
     * @param {object} context - Execution context
     * @returns {Promise<void>} - Async setup
     */
    async beforeExecute(params, context) {
        // Default implementation - override as needed
        this.usageCount++;
        this.lastUsed = Date.now();
    }

    /**
     * Called after tool execution - can be overridden for cleanup
     * @param {any} result - Tool execution result
     * @param {object} params - Tool parameters
     * @param {object} context - Execution context
     * @returns {Promise<any>} - Potentially modified result
     */
    async afterExecute(result, params, context) {
        // Default implementation - return result as-is
        return result;
    }

    /**
     * Get tool statistics
     * @returns {object} - Tool usage statistics
     */
    getStats() {
        return {
            name: this.name,
            usageCount: this.usageCount,
            lastUsed: this.lastUsed,
            createdAt: this.createdAt
        };
    }

    /**
     * Check if the tool is ready to execute
     * @returns {boolean} - Whether the tool is ready
     */
    isReady() {
        return true;
    }

    /**
     * Shutdown the tool and clean up resources
     * @returns {Promise<void>} - Async cleanup
     */
    async shutdown() {
        // Default implementation - override as needed
    }
}