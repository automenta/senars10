/**
 * @file src/tools/ToolEngine.js
 * @description Core tool execution engine with safety features and orchestration
 */

import {Logger} from '../util/Logger.js';
import {Metrics} from '../util/Metrics.js';

/**
 * Core Tool Engine that manages safe tool execution with comprehensive safety features
 */
export class ToolEngine {
    /**
     * @param {object} config - Tool engine configuration
     * @param {number} config.defaultTimeout - Default timeout for tool execution in ms (default: 5000)
     * @param {object} config.safetyLimits - Safety limits configuration
     * @param {number} config.safetyLimits.maxOutputSize - Maximum output size in characters (default: 10000)
     * @param {number} config.safetyLimits.maxCommandLength - Maximum command length in characters (default: 1000)
     */
    constructor(config = {}) {
        this.config = {
            defaultTimeout: 5000,
            safetyLimits: {
                maxOutputSize: 10000,
                maxCommandLength: 1000
            },
            ...config
        };
        
        this.tools = new Map();
        this.metrics = new Metrics();
        this.logger = Logger;
        
        // Track active executions for safety
        this.activeExecutions = new Set();
        
        // Statistics for monitoring
        this.stats = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            avgExecutionTime: 0,
            totalErrors: 0
        };
    }

    /**
     * Registers a new tool with the engine
     * @param {string} id - Unique tool identifier
     * @param {object} tool - The tool instance to register
     * @param {object} [metadata] - Optional metadata about the tool
     * @returns {ToolEngine} - Returns this instance for chaining
     */
    registerTool(id, tool, metadata = {}) {
        if (this.tools.has(id)) {
            throw new Error(`Tool with ID "${id}" already exists`);
        }
        
        // Validate that the tool has required methods
        if (!tool.execute || typeof tool.execute !== 'function') {
            throw new Error(`Tool "${id}" must have an execute method`);
        }
        
        if (!tool.getDescription || typeof tool.getDescription !== 'function') {
            throw new Error(`Tool "${id}" must have a getDescription method`);
        }
        
        this.tools.set(id, {
            instance: tool,
            metadata: {
                id,
                name: tool.constructor.name,
                ...metadata
            }
        });
        
        this.logger.info(`Tool registered: ${id}`, {
            toolName: tool.constructor.name,
            metadata: metadata
        });
        
        return this;
    }

    /**
     * Unregisters a tool
     * @param {string} id - Tool ID to unregister
     * @returns {boolean} - True if unregistered, false if not found
     */
    unregisterTool(id) {
        if (!this.tools.has(id)) {
            return false;
        }
        
        this.tools.delete(id);
        this.logger.info(`Tool unregistered: ${id}`);
        return true;
    }

    /**
     * Executes a tool with safety validation
     * @param {string} toolId - ID of the tool to execute
     * @param {object} params - Parameters for the tool execution
     * @param {object} [options] - Execution options
     * @param {number} [options.timeout] - Custom timeout for this execution
     * @returns {Promise<object>} - Execution result
     */
    async executeTool(toolId, params = {}, options = {}) {
        const startTime = Date.now();
        const executionId = `${toolId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        this.activeExecutions.add(executionId);
        
        try {
            // Validate tool exists
            if (!this.tools.has(toolId)) {
                throw new Error(`Tool "${toolId}" not found`);
            }
            
            const { instance: tool } = this.tools.get(toolId);
            
            // Validate parameters using the tool's validate method if available
            if (tool.validate && typeof tool.validate === 'function') {
                const validationResult = tool.validate(params);
                if (!validationResult.valid) {
                    throw new Error(`Tool parameters validation failed: ${validationResult.errors?.join(', ') || 'Unknown error'}`);
                }
            }
            
            // Apply safety checks to parameters
            this._validateSafety(params);
            
            // Execute with timeout
            const timeout = options.timeout || this.config.defaultTimeout;
            
            const result = await this._executeWithTimeout(
                tool.execute(params, { engine: this, executionId }),
                timeout,
                `Tool "${toolId}" execution timed out after ${timeout}ms`
            );
            
            // Validate result safety
            const safeResult = this._sanitizeResult(result);
            
            // Update statistics
            this.stats.totalExecutions++;
            this.stats.successfulExecutions++;
            const executionTime = Date.now() - startTime;
            this.stats.avgExecutionTime = 
                (this.stats.avgExecutionTime * (this.stats.successfulExecutions - 1) + executionTime) / this.stats.successfulExecutions;
            
            this.logger.info(`Tool execution completed: ${toolId}`, {
                executionId,
                executionTime,
                resultSize: typeof safeResult === 'string' ? safeResult.length : JSON.stringify(safeResult).length
            });
            
            return {
                success: true,
                result: safeResult,
                executionTime,
                toolId,
                executionId
            };
            
        } catch (error) {
            this.stats.totalExecutions++;
            this.stats.failedExecutions++;
            this.stats.totalErrors++;
            
            this.logger.error(`Tool execution failed: ${toolId}`, {
                executionId,
                error: error.message,
                stack: error.stack
            });
            
            return {
                success: false,
                error: error.message,
                executionTime: Date.now() - startTime,
                toolId,
                executionId
            };
        } finally {
            this.activeExecutions.delete(executionId);
        }
    }

    /**
     * Executes multiple tools in sequence or parallel
     * @param {Array<object>} toolCalls - Array of tool call specifications
     * @param {object} [options] - Options for batch execution
     * @param {boolean} [options.concurrent] - Whether to execute tools concurrently
     * @returns {Promise<Array<object>>} - Array of execution results
     */
    async executeTools(toolCalls, options = {}) {
        if (!Array.isArray(toolCalls)) {
            throw new Error('ToolCalls must be an array');
        }
        
        if (options.concurrent) {
            const promises = toolCalls.map(call => this.executeTool(call.toolId, call.params, call.options));
            return Promise.all(promises);
        } else {
            const results = [];
            for (const call of toolCalls) {
                const result = await this.executeTool(call.toolId, call.params, call.options);
                results.push(result);
                
                // If any tool fails and not continuing on errors, we might want to handle that
                if (!result.success && options.continueOnError !== true) {
                    break;
                }
            }
            return results;
        }
    }

    /**
     * Gets information about available tools
     * @returns {Array<object>} - Array of tool descriptions
     */
    getAvailableTools() {
        return Array.from(this.tools.values()).map(({ instance, metadata }) => ({
            id: metadata.id,
            name: metadata.name || instance.constructor.name,
            description: instance.getDescription(),
            parameters: instance.getParameterSchema ? instance.getParameterSchema() : null,
            ...metadata
        }));
    }

    /**
     * Gets statistics about tool execution
     * @returns {object} - Execution statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Validates parameters for safety
     * @private
     */
    _validateSafety(params) {
        // Check for command injection patterns in string parameters
        const checkParam = (value, path = '') => {
            if (typeof value === 'string') {
                // Check for dangerous patterns
                const dangerousPatterns = [
                    /rm\s+-rf/,                  // File deletion
                    /exec\s*\(/,                 // Execution
                    /eval\s*\(/,                 // Evaluation
                    /import\s+subprocess/,      // Process spawning
                    /import\s+os\.system/,       // System commands
                    /import\s+os\.popen/,        // Process opening
                    /&&/,                       // Command chaining
                    /\|\|/,                     // Command chaining
                    /\|/,                       // Pipe operations
                    />/,                       // Output redirection
                    /</,                       // Input redirection
                    /;/,                       // Command separators
                ];
                
                for (const pattern of dangerousPatterns) {
                    if (pattern.test(value)) {
                        throw new Error(`Potential security risk detected in parameter${path ? ` (${path})` : ''}: ${value.substring(0, 50)}...`);
                    }
                }
                
                // Check length limits
                if (value.length > this.config.safetyLimits.maxCommandLength) {
                    throw new Error(`Parameter${path ? ` (${path})` : ''} exceeds maximum length limit`);
                }
            } else if (Array.isArray(value)) {
                value.forEach((item, index) => checkParam(item, `${path}[${index}]`));
            } else if (value && typeof value === 'object') {
                Object.entries(value).forEach(([key, val]) => checkParam(val, `${path ? `${path}.` : ''}${key}`));
            }
        };
        
        checkParam(params);
    }

    /**
     * Sanitizes result for safety
     * @private
     */
    _sanitizeResult(result) {
        const jsonString = JSON.stringify(result);
        
        if (jsonString.length > this.config.safetyLimits.maxOutputSize) {
            throw new Error(`Tool result exceeds maximum output size limit (${this.config.safetyLimits.maxOutputSize} chars)`);
        }
        
        // Additional sanitization can be added here
        
        return result;
    }

    /**
     * Executes a promise with timeout
     * @private
     */
    _executeWithTimeout(promise, timeout, timeoutMessage) {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error(timeoutMessage)), timeout)
            )
        ]);
    }

    /**
     * Cancels all active executions (emergency stop)
     */
    cancelAllExecutions() {
        // In a real implementation, we might store cancellation tokens
        // For now, we just clear the active executions set
        const count = this.activeExecutions.size;
        this.activeExecutions.clear();
        
        this.logger.warn(`Canceled ${count} active tool executions`);
        
        return count;
    }
}