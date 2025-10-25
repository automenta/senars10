import { BaseModule } from './BaseModule.js';
import { ToolEngine } from '../tools/ToolEngine.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';

/**
 * @file src/module/ToolModule.js
 * @description The entire subsystem for interacting with the external world.
 *
 * This module encapsulates the functionality for registering, discovering, and
 * executing external tools. It provides a unified interface for the reasoning
 * core to leverage external capabilities, from file operations to web automation.
 */
export class ToolModule extends BaseModule {
    constructor() {
        super('tools');
        this.toolUsageHistory = [];
    }

    /**
     * Registers the tool engine and registry with the agent.
     * @param {object} agent - The main agent instance.
     * @param {object} config - The module-specific configuration.
     */
    register(agent, config) {
        this.agent = agent;
        this.config = config;
        this.engine = new ToolEngine(config.engine || {});
        this.registry = config.enableRegistry !== false ? new ToolRegistry(this.engine) : null;

        // Make the tool execution capabilities available on the agent
        agent.tools = this;
    }

    /**
     * Initializes the default set of tools.
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.registry) {
            await this._initializeDefaultTools();
        }
    }

    async _initializeDefaultTools() {
        try {
            const { FileOperationsTool, CommandExecutorTool, WebAutomationTool, MediaProcessingTool, EmbeddingTool } =
                await import('../tools/index.js');

            const toolsConfig = [
                { id: 'file-operations', tool: new FileOperationsTool(), category: 'file-operations', description: 'File operations' },
                { id: 'command-executor', tool: new CommandExecutorTool(), category: 'command-execution', description: 'Safe command execution' },
                { id: 'web-automation', tool: new WebAutomationTool(), category: 'web-automation', description: 'Web automation' },
                { id: 'media-processing', tool: new MediaProcessingTool(), category: 'media-processing', description: 'Media processing' },
                { id: 'embedding', tool: new EmbeddingTool(), category: 'embedding', description: 'Text embedding operations' }
            ];

            toolsConfig.forEach(({ id, tool, category, description }) =>
                this.registry.registerTool(id, tool, { category, description }));
        } catch (error) {
            console.error('Failed to initialize default tools:', error);
            throw error;
        }
    }

    /**
     * Execute a tool as part of the reasoning process.
     * @param {string} toolId - Tool ID to execute.
     * @param {object} params - Tool parameters.
     * @param {object} context - Reasoning context.
     * @returns {Promise<object>} - Tool execution result.
     */
    async executeTool(toolId, params, context = {}) {
        const startTime = Date.now();
        try {
            const result = await this.engine.executeTool(toolId, params, { reasoningContext: context });
            this.toolUsageHistory.push({
                toolId,
                params,
                result: { ...result },
                executionTime: Date.now() - startTime,
                timestamp: Date.now(),
                context
            });

            if (this.toolUsageHistory.length > 1000) {
                this.toolUsageHistory.splice(0, this.toolUsageHistory.length - 500);
            }
            return result;
        } catch (error) {
            console.error(`Tool execution failed: ${toolId}`, {
                error: error.message,
                params
            });
            return {
                success: false,
                error: error.message,
                executionTime: Date.now() - startTime,
                toolId
            };
        }
    }

    getAvailableTools() {
        return this.engine.getAvailableTools();
    }
}
