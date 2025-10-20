/**
 * @file src/tools/ToolEngine.js
 * @description Core tool execution engine with safety features and orchestration
 */

import {Logger} from '../util/Logger.js';

/**
 * Core Tool Engine that manages safe tool execution with comprehensive safety features
 * Inspired by v8/coreagent/tools architecture
 */
export class ToolEngine {
    /**
     * @param {object} config - Tool engine configuration
     * @param {number} config.defaultTimeout - Default timeout for tool execution in ms (default: 5000)
     * @param {object} config.safetyLimits - Safety limits configuration
     * @param {number} config.safetyLimits.maxOutputSize - Maximum output size in characters (default: 10000)
     * @param {number} config.safetyLimits.maxCommandLength - Maximum command length in characters (default: 1000)
     * @param {number} config.maxHistorySize - Maximum number of execution records to retain (default: 1000)
     */
    constructor(config = {}) {
        this.config = {
            defaultTimeout: 5000,
            safetyLimits: {
                maxOutputSize: 10000,
                maxCommandLength: 1000
            },
            maxHistorySize: 1000,
            enableSandboxing: true,
            ...config
        };

        this.tools = new Map();
        this.logger = Logger;

        // Track active executions for safety
        this.activeExecutions = new Map();
        this.executionHistory = [];

        // Statistics for monitoring
        this.performanceTracker = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            averageExecutionTime: 0,
            totalErrors: 0,
            toolUsageStats: new Map(),
            categoryPerformance: new Map(),
            performanceHistory: [],
            peakUsageTimes: new Map(),
            errorPatterns: new Map()
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

        const toolData = {
            id,
            instance: tool,
            name: tool.constructor.name,
            description: tool.getDescription(),
            parameters: tool.getParameterSchema?.() || {type: 'object', properties: {}},
            category: tool.getCategory?.() || 'general',
            capabilities: tool.getCapabilities?.() || [],
            createdAt: Date.now(),
            usageCount: 0,
            lastUsed: null,
            ...metadata
        };

        this.tools.set(id, toolData);

        this.logger.info(`Registered tool: ${id} (${toolData.category})`, {
            name: tool.constructor.name,
            description: toolData.description,
            capabilities: toolData.capabilities
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

        const tool = this.tools.get(id);
        this.tools.delete(id);
        this.logger.info(`Unregistered tool: ${id} (${tool.category})`);
        return true;
    }

    /**
     * Executes a tool with safety validation and enhanced tracking
     * @param {string} toolId - ID of the tool to execute
     * @param {object} params - Parameters for the tool execution
     * @param {object} [context] - Execution context with additional info
     * @param {number} [context.timeout] - Custom timeout for this execution
     * @param {string} [context.user] - User executing the tool
     * @param {string} [context.session] - Session ID
     * @returns {Promise<object>} - Execution result with enhanced metadata
     */
    async executeTool(toolId, params = {}, context = {}) {
        const startTime = Date.now();
        const executionId = this._generateExecutionId();

        // Validate tool exists (fast-fail check)
        const tool = this.tools.get(toolId);
        if (!tool) {
            throw new Error(`Tool "${toolId}" not found`);
        }

        const executionContext = this._createExecutionContext(executionId, toolId, params, context, startTime);
        this.activeExecutions.set(executionId, executionContext);

        try {
            // Apply safety checks to parameters first for early fail
            this._validateSafety(params);

            // Validate parameters using the tool's validate method if available
            if (tool.instance.validate && typeof tool.instance.validate === 'function') {
                const validationResult = tool.instance.validate(params);
                if (!validationResult.isValid) {  // Use isValid instead of valid for consistency
                    throw new Error(`Tool parameters validation failed: ${validationResult.errors?.join(', ') || 'Unknown error'}`);
                }
            }

            // Execute with timeout
            const timeout = context.timeout || this.config.defaultTimeout;

            const result = await this._executeWithTimeout(
                tool.instance.execute(params, {engine: this, executionId, context}),
                timeout,
                `Tool "${toolId}" execution timed out after ${timeout}ms`
            );

            // Validate result safety
            const safeResult = this._sanitizeResult(result);

            return this._handleExecutionSuccess(executionContext, safeResult, startTime, tool);

        } catch (error) {
            return this._handleExecutionError(executionContext, error, startTime, tool);
        } finally {
            this.activeExecutions.delete(executionId);
        }
    }

    /**
     * Creates execution context for tracking
     * @private
     */
    _createExecutionContext(executionId, toolId, params, context, startTime) {
        return {
            executionId,
            toolId,
            parameters: params,
            context: {
                user: context.user || 'system',
                session: context.session || null,
                timestamp: Date.now(),
                ...context
            },
            startTime,
            status: 'executing'
        };
    }

    /**
     * Handles successful execution
     * @private
     */
    _handleExecutionSuccess(executionContext, result, startTime, tool) {
        const {executionId, toolId} = executionContext;
        executionContext.endTime = Date.now();
        executionContext.duration = executionContext.endTime - startTime;
        executionContext.result = result;
        executionContext.status = 'completed';

        // Update tool statistics
        tool.usageCount++;
        tool.lastUsed = Date.now();

        // Track performance metrics
        this._trackExecutionSuccess(executionId, toolId, startTime, result);

        // Add to history
        this._addToHistory(executionContext);

        this.logger.info(`Tool execution completed: ${toolId} (${executionId}) in ${executionContext.duration}ms`);

        return {
            success: true,
            executionId,
            result,
            duration: executionContext.duration,
            toolId
        };
    }

    /**
     * Handles execution error
     * @private
     */
    _handleExecutionError(executionContext, error, startTime, tool) {
        const {executionId, toolId, parameters} = executionContext;
        const endTime = Date.now();
        const duration = endTime - startTime;

        const errorContext = {
            executionId,
            toolId,
            parameters,
            error: error.message,
            stack: error.stack,
            duration,
            status: 'failed',
            context: executionContext.context
        };

        // Track error metrics
        this._trackExecutionFailure(executionId, toolId, startTime, error);

        // Add to history
        this._addToHistory(errorContext);

        this.logger.error(`Tool execution failed: ${toolId} (${executionId})`, error);

        return {
            success: false,
            executionId,
            error: error.message,
            duration,
            toolId
        };
    }

    /**
     * Executes multiple tools in sequence or parallel
     * @param {Array<object>} toolCalls - Array of tool call specifications
     * @param {object} [context] - Context for all executions
     * @param {boolean} [context.concurrent] - Whether to execute tools concurrently
     * @returns {Promise<Array<object>>} - Array of execution results
     */
    async executeTools(toolCalls, context = {}) {
        if (!Array.isArray(toolCalls)) {
            throw new Error('ToolCalls must be an array');
        }

        if (context.concurrent) {
            const promises = toolCalls.map(call =>
                this.executeTool(call.toolId, call.params, {...context, ...call.context})
            );
            return Promise.all(promises);
        } else {
            const results = [];
            for (const call of toolCalls) {
                const result = await this.executeTool(call.toolId, call.params, {...context, ...call.context});
                results.push(result);

                // If any tool fails and not continuing on errors, we might want to handle that
                if (!result.success && context.continueOnError !== true) {
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
        return Array.from(this.tools.values()).map(tool => ({
            id: tool.id,
            name: tool.name,
            description: tool.description,
            category: tool.category,
            parameters: tool.parameters,
            capabilities: tool.capabilities,
            createdAt: tool.createdAt,
            usageCount: tool.usageCount,
            lastUsed: tool.lastUsed
        }));
    }

    /**
     * Gets a specific tool by ID
     * @param {string} toolId - ID of the tool to retrieve
     * @returns {object|null} - Tool data or null if not found
     */
    getTool(toolId) {
        return this.tools.get(toolId) || null;
    }

    /**
     * Gets tools filtered by category
     * @param {string} category - Category to filter by
     * @returns {Array<object>} - Array of tools in the specified category
     */
    getToolsByCategory(category) {
        return Array.from(this.tools.values()).filter(tool => tool.category === category);
    }

    /**
     * Gets execution history with optional filtering
     * @param {object} [options] - Filtering options
     * @param {string} [options.toolName] - Filter by specific tool name
     * @param {string} [options.category] - Filter by category
     * @param {number} [options.limit] - Limit number of results
     * @returns {Array<object>} - Execution history
     */
    getExecutionHistory(options = {}) {
        let history = [...this.executionHistory];

        if (options.toolName) {
            history = history.filter(exec => exec.toolId === options.toolName);
        }
        if (options.category) {
            history = history.filter(exec => {
                const tool = this.tools.get(exec.toolId);
                return tool?.category === options.category;
            });
        }
        if (options.limit) {
            history = history.slice(-options.limit);
        }

        return history;
    }

    /**
     * Gets comprehensive statistics about tool execution
     * @returns {object} - Execution statistics
     */
    getStats() {
        const stats = {
            totalTools: this.tools.size,
            toolsByCategory: {},
            totalExecutions: this.executionHistory.length,
            successfulExecutions: this.performanceTracker.successfulExecutions,
            failedExecutions: this.performanceTracker.failedExecutions,
            averageExecutionTime: this.performanceTracker.averageExecutionTime,
            mostUsedTools: []
        };

        // Categorize tools
        for (const tool of this.tools.values()) {
            const category = tool.category;
            stats.toolsByCategory[category] = (stats.toolsByCategory[category] || 0) + 1;
        }

        // Find most used tools
        const toolUsage = new Map();
        for (const tool of this.tools.values()) {
            toolUsage.set(tool.id, tool.usageCount);
        }

        stats.mostUsedTools = Array.from(toolUsage.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([toolName, count]) => ({toolName, count}));

        return stats;
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
                    /chmod/,                    // Permission changes
                    /chown/,                    // Ownership changes
                    /passwd/,                   // Password changes
                    /useradd/,                  // User creation
                    /userdel/,                  // User deletion
                    /su/,                       // Switch user
                    /sudo/,                     // Superuser
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
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(timeoutMessage));
            }, timeout);

            Promise.resolve(promise)
                .then(resolve)
                .catch(reject)
                .finally(() => clearTimeout(timer));
        });
    }

    /**
     * Generates unique execution ID
     * @private
     */
    _generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Adds execution to history with size limiting
     * @private
     */
    _addToHistory(execution) {
        this.executionHistory.push({
            ...execution,
            timestamp: Date.now()
        });

        // Maintain history size limit
        if (this.executionHistory.length > this.config.maxHistorySize) {
            this.executionHistory = this.executionHistory.slice(-this.config.maxHistorySize);
        }
    }

    /**
     * Tracks successful execution for performance metrics
     * @private
     */
    _trackExecutionSuccess(executionId, toolName, startTime, result) {
        const duration = Date.now() - startTime;

        this.performanceTracker.totalExecutions++;
        this.performanceTracker.successfulExecutions++;

        const {successfulExecutions} = this.performanceTracker;
        this.performanceTracker.averageExecutionTime =
            (this.performanceTracker.averageExecutionTime * (successfulExecutions - 1) + duration) / successfulExecutions;

        // Track tool-specific metrics
        if (!this.performanceTracker.toolUsageStats.has(toolName)) {
            this.performanceTracker.toolUsageStats.set(toolName, {
                executions: 0,
                successes: 0,
                failures: 0,
                totalTime: 0,
                averageTime: 0
            });
        }

        const toolStats = this.performanceTracker.toolUsageStats.get(toolName);
        toolStats.executions++;
        toolStats.successes++;
        toolStats.totalTime += duration;
        toolStats.averageTime = toolStats.totalTime / toolStats.executions;
    }

    /**
     * Tracks failed execution for error metrics
     * @private
     */
    _trackExecutionFailure(executionId, toolName, startTime, error) {
        const duration = Date.now() - startTime;

        this.performanceTracker.totalExecutions++;
        this.performanceTracker.failedExecutions++;

        // Track tool-specific failure metrics
        if (!this.performanceTracker.toolUsageStats.has(toolName)) {
            this.performanceTracker.toolUsageStats.set(toolName, {
                executions: 0,
                successes: 0,
                failures: 0,
                totalTime: 0,
                averageTime: 0
            });
        }

        const toolStats = this.performanceTracker.toolUsageStats.get(toolName);
        toolStats.executions++;
        toolStats.failures++;
        toolStats.totalTime += duration;
        toolStats.averageTime = toolStats.totalTime / toolStats.executions;

        // Track error patterns
        const errorKey = error.constructor.name;
        const count = this.performanceTracker.errorPatterns.get(errorKey) || 0;
        this.performanceTracker.errorPatterns.set(errorKey, count + 1);
    }

    /**
     * Cancels all active executions (emergency stop)
     */
    cancelAllExecutions() {
        const count = this.activeExecutions.size;
        this.activeExecutions.clear();

        this.logger.warn(`Canceled ${count} active tool executions`);
        return count;
    }

    /**
     * Shuts down the tool engine and cleans up resources
     */
    async shutdown() {
        this.logger.info('Shutting down ToolEngine...');

        // Cancel active executions
        for (const [executionId, execution] of this.activeExecutions) {
            this.logger.warn(`Canceling active execution: ${executionId} (tool: ${execution.toolId})`);
        }
        this.activeExecutions.clear();

        this.logger.info('ToolEngine shutdown complete');
    }
}