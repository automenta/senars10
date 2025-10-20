/**
 * @file src/tools/ToolRegistry.js
 * @description Automatic tool discovery and registration system
 */

import {Logger} from '../util/Logger.js';
import {ToolEngine} from './ToolEngine.js';

/**
 * Tool Registry that provides automatic tool discovery and registration
 */
export class ToolRegistry {
    /**
     * @param {ToolEngine} toolEngine - The tool engine instance to register tools with
     */
    constructor(toolEngine) {
        if (!toolEngine || !(toolEngine instanceof ToolEngine)) {
            throw new Error('ToolRegistry requires a valid ToolEngine instance');
        }
        
        this.engine = toolEngine;
        this.logger = Logger;
        this.discoveredTools = new Map();
        this.registrationHistory = [];
    }

    /**
     * Discovers tools in a given directory or set of modules
     * @param {Array<Function|Object>} toolClasses - Array of tool classes or objects to discover
     * @returns {Array<object>} - Discovered tool metadata
     */
    discoverTools(toolClasses) {
        const discovered = [];
        
        for (const toolClass of toolClasses) {
            try {
                const toolMetadata = this._analyzeTool(toolClass);
                
                if (toolMetadata) {
                    this.discoveredTools.set(toolMetadata.id, {
                        class: toolClass,
                        metadata: toolMetadata
                    });
                    
                    discovered.push(toolMetadata);
                    
                    this.logger.info(`Discovered tool: ${toolMetadata.id}`, {
                        name: toolMetadata.name,
                        description: toolMetadata.description
                    });
                }
            } catch (error) {
                this.logger.warn(`Failed to discover tool from class:`, {
                    class: toolClass.name || 'anonymous',
                    error: error.message
                });
            }
        }
        
        return discovered;
    }

    /**
     * Registers all discovered tools with the engine
     * @param {Array<string>} [includeOnly] - Optional list of tool IDs to register (if not provided, registers all)
     * @param {object} [defaultConfig] - Default configuration to apply to tools
     * @returns {Array<string>} - IDs of successfully registered tools
     */
    registerAll(includeOnly = null, defaultConfig = {}) {
        const toRegister = includeOnly || Array.from(this.discoveredTools.keys());
        const registered = [];
        
        for (const toolId of toRegister) {
            if (this.discoveredTools.has(toolId)) {
                const { class: ToolClass, metadata } = this.discoveredTools.get(toolId);
                
                try {
                    // Create an instance of the tool
                    const toolInstance = typeof ToolClass === 'function' 
                        ? new ToolClass(defaultConfig) 
                        : ToolClass;
                    
                    // Register the tool with the engine
                    this.engine.registerTool(toolId, toolInstance, metadata);
                    
                    registered.push(toolId);
                    
                    // Log registration in history
                    this.registrationHistory.push({
                        toolId,
                        timestamp: Date.now(),
                        action: 'register',
                        metadata
                    });
                    
                    this.logger.info(`Registered tool: ${toolId}`);
                } catch (error) {
                    this.logger.error(`Failed to register tool ${toolId}:`, {
                        error: error.message
                    });
                }
            }
        }
        
        return registered;
    }

    /**
     * Registers a single tool
     * @param {string} id - Tool ID
     * @param {object} tool - Tool instance
     * @param {object} [metadata] - Tool metadata
     * @returns {ToolRegistry} - Returns this instance for chaining
     */
    registerTool(id, tool, metadata = {}) {
        try {
            this.engine.registerTool(id, tool, metadata);
            
            this.registrationHistory.push({
                toolId: id,
                timestamp: Date.now(),
                action: 'register',
                metadata: metadata
            });
            
            this.logger.info(`Manually registered tool: ${id}`);
            return this;
        } catch (error) {
            this.logger.error(`Failed to manually register tool ${id}:`, {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Auto-registers tools from a directory or module
     * @param {object} toolModule - Module containing tool classes
     * @param {object} [options] - Registration options
     * @param {Array<string>} [options.include] - Only register tools with these IDs
     * @param {Array<string>} [options.exclude] - Don't register tools with these IDs
     * @param {object} [options.config] - Default configuration for tools
     * @returns {Array<string>} - Registered tool IDs
     */
    autoRegisterFromModule(toolModule, options = {}) {
        const { include, exclude, config = {} } = options;
        const toolClasses = [];
        
        // Extract classes/objects that look like tools
        for (const [key, value] of Object.entries(toolModule)) {
            if (this._isToolLike(value)) {
                // Generate a tool ID based on the key or class name
                const toolId = key.toLowerCase().replace(/tool$/, '') || 
                              (value.name ? value.name.toLowerCase().replace(/tool$/, '') : key);
                
                // Skip if excluded or not included (if include list is provided)
                if ((exclude && exclude.includes(toolId)) || 
                    (include && !include.includes(toolId))) {
                    continue;
                }
                
                // Add to discovery list with default metadata
                this.discoveredTools.set(toolId, {
                    class: value,
                    metadata: {
                        id: toolId,
                        name: value.name || key,
                        description: value.description || `Auto-registered tool: ${key}`
                    }
                });
                
                toolClasses.push(value);
            }
        }
        
        return this.registerAll(include, config);
    }

    /**
     * Gets all discovered tools
     * @returns {Array<object>} - Array of discovered tool metadata
     */
    getDiscoveredTools() {
        return Array.from(this.discoveredTools.values()).map(({ metadata }) => metadata);
    }

    /**
     * Gets registration history
     * @returns {Array<object>} - Registration history
     */
    getRegistrationHistory() {
        return [...this.registrationHistory];
    }

    /**
     * Analyzes a potential tool class/object for registration
     * @private
     */
    _analyzeTool(toolClass) {
        try {
            // Check if it's a class (function) or object
            let toolInstance;
            
            if (typeof toolClass === 'function') {
                // Try to instantiate it to test it
                toolInstance = new toolClass();
            } else {
                toolInstance = toolClass;
            }
            
            // Check required methods
            const hasRequiredMethods = [
                'execute',
                'getDescription'
            ].every(method => typeof toolInstance[method] === 'function');
            
            if (!hasRequiredMethods) {
                return null;
            }
            
            // Generate metadata
            const className = toolClass.name || 'AnonymousTool';
            const toolId = className
                .replace(/tool$/i, '')
                .replace(/([a-z])([A-Z])/g, '$1-$2')
                .toLowerCase();
            
            return {
                id: toolId,
                name: className,
                description: toolInstance.getDescription(),
                parameterSchema: toolInstance.getParameterSchema ? toolInstance.getParameterSchema() : null,
                supportsStreaming: typeof toolInstance.stream === 'function',
                supportsValidation: typeof toolInstance.validate === 'function'
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Checks if an object looks like a tool
     * @private
     */
    _isToolLike(obj) {
        // Check if it has the required methods
        const hasExecute = typeof obj.prototype?.execute === 'function' || 
                          typeof obj.execute === 'function';
        const hasGetDescription = typeof obj.prototype?.getDescription === 'function' || 
                                 typeof obj.getDescription === 'function';
        
        return hasExecute && hasGetDescription;
    }

    /**
     * Validates a tool instance
     * @param {object} tool - Tool instance to validate
     * @returns {object} - Validation result
     */
    validateTool(tool) {
        const errors = [];
        
        if (!tool.execute || typeof tool.execute !== 'function') {
            errors.push('Missing execute method');
        }
        
        if (!tool.getDescription || typeof tool.getDescription !== 'function') {
            errors.push('Missing getDescription method');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Gets tools that match certain criteria
     * @param {object} criteria - Selection criteria
     * @param {string} [criteria.category] - Tool category
     * @param {boolean} [criteria.supportsStreaming] - Whether to require streaming support
     * @param {Array<string>} [criteria.requiredCapabilities] - Required capabilities
     * @returns {Array<object>} - Matching tools
     */
    findTools(criteria = {}) {
        const matching = [];
        
        for (const [id, { class: ToolClass, metadata }] of this.discoveredTools.entries()) {
            let matches = true;
            
            if (criteria.category && metadata.category !== criteria.category) {
                matches = false;
            }
            
            if (criteria.supportsStreaming !== undefined && 
                metadata.supportsStreaming !== criteria.supportsStreaming) {
                matches = false;
            }
            
            if (criteria.requiredCapabilities && Array.isArray(criteria.requiredCapabilities)) {
                for (const cap of criteria.requiredCapabilities) {
                    if (!metadata.capabilities || !metadata.capabilities.includes(cap)) {
                        matches = false;
                        break;
                    }
                }
            }
            
            if (matches) {
                matching.push({
                    id,
                    class: ToolClass,
                    metadata
                });
            }
        }
        
        return matching;
    }
}