import {Logger} from '../util/Logger.js';
import {CapabilityManager, Capability} from '../util/CapabilityManager.js';

export class ToolEngine {
    constructor(config = {}) {
        Object.assign(this, {
            config: {
                defaultTimeout: 5000,
                safetyLimits: {
                    maxOutputSize: 10000,
                    maxCommandLength: 1000
                },
                maxHistorySize: 1000,
                enableSandboxing: true,
                ...config
            },
            tools: new Map(),
            logger: Logger,
            activeExecutions: new Map(),
            executionHistory: [],
            capabilityManager: config.capabilityManager || null,
            performanceTracker: {
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
            }
        });
        
        if (!this.capabilityManager) {
            this.capabilityManager = new CapabilityManager();
        }
    }

    async registerTool(id, tool, metadata = {}) {
        if (this.tools.has(id)) throw new Error(`Tool with ID "${id}" already exists`);

        if (!tool.execute || typeof tool.execute !== 'function') {
            throw new Error(`Tool "${id}" must have an execute method`);
        }

        if (!tool.getDescription || typeof tool.getDescription !== 'function') {
            throw new Error(`Tool "${id}" must have a getDescription method`);
        }

        const toolCapabilities = tool.getCapabilities?.() || [];
        const toolData = {
            id,
            instance: tool,
            name: tool.constructor.name,
            description: tool.getDescription(),
            parameters: tool.getParameterSchema?.() || {type: 'object', properties: {}},
            category: tool.getCategory?.() || 'general',
            capabilities: toolCapabilities,
            createdAt: Date.now(),
            usageCount: 0,
            lastUsed: null,
            ...metadata
        };

        this.tools.set(id, toolData);

        for (const capability of toolCapabilities) {
            if (!this.capabilityManager.capabilities.has(capability)) {
                await this.capabilityManager.registerCapability(capability, 
                    new Capability(capability, {
                        description: `Capability for ${capability}`,
                        scope: 'default',
                        permissions: []
                    })
                );
            }
        }

        if (toolCapabilities.length > 0) {
            await this.capabilityManager.grantCapabilities(id, toolCapabilities, {
                grantedBy: 'system',
                approved: true
            });
        }

        this.logger.info(`Registered tool: ${id} (${toolData.category})`, {
            name: tool.constructor.name,
            description: toolData.description,
            capabilities: toolData.capabilities
        });

        return this;
    }

    unregisterTool(id) {
        if (!this.tools.has(id)) return false;

        const tool = this.tools.get(id);
        this.tools.delete(id);
        this.logger.info(`Unregistered tool: ${id} (${tool.category})`);
        return true;
    }

    async executeTool(toolId, params = {}, context = {}) {
        const startTime = Date.now();
        const executionId = this._generateExecutionId();

        const tool = this.tools.get(toolId);
        if (!tool) throw new Error(`Tool "${toolId}" not found`);

        const hasRequiredCapabilities = await this.capabilityManager.hasAllCapabilities(toolId, tool.capabilities || []);
        if (!hasRequiredCapabilities) {
            const missingCaps = tool.capabilities.filter(cap =>
                !this.capabilityManager.hasCapability(toolId, cap)
            );
            throw new Error(`Tool "${toolId}" lacks required capabilities: ${missingCaps.join(', ')}`);
        }

        const executionContext = this._createExecutionContext(executionId, toolId, params, context, startTime);
        this.activeExecutions.set(executionId, executionContext);

        try {
            this._validateSafety(params);

            if (tool.instance.validate && typeof tool.instance.validate === 'function') {
                const validationResult = tool.instance.validate(params);
                if (!validationResult.isValid) {
                    throw new Error(`Tool parameters validation failed: ${validationResult.errors?.join(', ') || 'Unknown error'}`);
                }
            }

            const timeout = context.timeout || this.config.defaultTimeout;
            const result = await this._executeWithTimeout(
                tool.instance.execute(params, {engine: this, executionId, context}),
                timeout,
                `Tool "${toolId}" execution timed out after ${timeout}ms`
            );

            const safeResult = this._sanitizeResult(result);
            return this._handleExecutionSuccess(executionContext, safeResult, startTime, tool);

        } catch (error) {
            return this._handleExecutionError(executionContext, error, startTime, tool);
        } finally {
            this.activeExecutions.delete(executionId);
        }
    }

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

    _handleExecutionSuccess(executionContext, result, startTime, tool) {
        const {executionId, toolId} = executionContext;
        executionContext.endTime = Date.now();
        executionContext.duration = executionContext.endTime - startTime;
        executionContext.result = result;
        executionContext.status = 'completed';

        tool.usageCount++;
        tool.lastUsed = Date.now();

        this._trackExecutionSuccess(executionId, toolId, startTime, result);
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

        this._trackExecutionFailure(executionId, toolId, startTime, error);
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

    async executeTools(toolCalls, context = {}) {
        if (!Array.isArray(toolCalls)) throw new Error('ToolCalls must be an array');

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

                if (!result.success && context.continueOnError !== true) break;
            }
            return results;
        }
    }

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

    getTool(toolId) {
        return this.tools.get(toolId) || null;
    }

    getToolsByCategory(category) {
        return Array.from(this.tools.values()).filter(tool => tool.category === category);
    }

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

        for (const tool of this.tools.values()) {
            const category = tool.category;
            stats.toolsByCategory[category] = (stats.toolsByCategory[category] || 0) + 1;
        }

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

    _validateSafety(params) {
        const checkParam = (value, path = '') => {
            if (typeof value === 'string') {
                const dangerousPatterns = [
                    /rm\s+-rf/,
                    /exec\s*\(/,
                    /eval\s*\(/,
                    /import\s+subprocess/,
                    /import\s+os\.system/,
                    /import\s+os\.popen/,
                    /&&/,
                    /\|\|/,
                    /\|/,
                    />/,
                    /</,
                    /;/,
                    /chmod/,
                    /chown/,
                    /passwd/,
                    /useradd/,
                    /userdel/,
                    /su/,
                    /sudo/,
                ];

                for (const pattern of dangerousPatterns) {
                    if (pattern.test(value)) {
                        throw new Error(`Potential security risk detected in parameter${path ? ` (${path})` : ''}: ${value.substring(0, 50)}...`);
                    }
                }

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

    _sanitizeResult(result) {
        const jsonString = JSON.stringify(result);

        if (jsonString.length > this.config.safetyLimits.maxOutputSize) {
            throw new Error(`Tool result exceeds maximum output size limit (${this.config.safetyLimits.maxOutputSize} chars)`);
        }

        return result;
    }

    _executeWithTimeout(promise, timeout, timeoutMessage) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(timeoutMessage)), timeout);
            Promise.resolve(promise).then(resolve).catch(reject).finally(() => clearTimeout(timer));
        });
    }

    _generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    _addToHistory(execution) {
        this.executionHistory.push({...execution, timestamp: Date.now()});
        if (this.executionHistory.length > this.config.maxHistorySize) {
            this.executionHistory = this.executionHistory.slice(-this.config.maxHistorySize);
        }
    }

    _trackExecutionSuccess(executionId, toolName, startTime, result) {
        const duration = Date.now() - startTime;

        this.performanceTracker.totalExecutions++;
        this.performanceTracker.successfulExecutions++;

        const {successfulExecutions} = this.performanceTracker;
        this.performanceTracker.averageExecutionTime =
            (this.performanceTracker.averageExecutionTime * (successfulExecutions - 1) + duration) / successfulExecutions;

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

    _trackExecutionFailure(executionId, toolName, startTime, error) {
        const duration = Date.now() - startTime;

        this.performanceTracker.totalExecutions++;
        this.performanceTracker.failedExecutions++;

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

        const errorKey = error.constructor.name;
        const count = this.performanceTracker.errorPatterns.get(errorKey) || 0;
        this.performanceTracker.errorPatterns.set(errorKey, count + 1);
    }

    cancelAllExecutions() {
        const count = this.activeExecutions.size;
        this.activeExecutions.clear();
        this.logger.warn(`Canceled ${count} active tool executions`);
        return count;
    }

    async shutdown() {
        this.logger.info('Shutting down ToolEngine...');

        for (const [executionId, execution] of this.activeExecutions) {
            this.logger.warn(`Canceling active execution: ${executionId} (tool: ${execution.toolId})`);
        }
        this.activeExecutions.clear();

        this.logger.info('ToolEngine shutdown complete');
    }
}