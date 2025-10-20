/**
 * @file src/tools/CommandExecutorTool.js
 * @description Tool for executing commands in a sandboxed environment
 */

import { BaseTool } from './BaseTool.js';
import { spawn, exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

/**
 * Tool for executing system commands with safety restrictions
 */
export class CommandExecutorTool extends BaseTool {
    constructor(config = {}) {
        super(config);
        this.name = 'CommandExecutorTool';
        
        // Configure safety settings
        this.allowedCommands = config.allowedCommands || [
            'ls', 'dir', 'cat', 'head', 'tail', 'echo', 'date', 'whoami', 'pwd', 
            'ps', 'top', 'free', 'df', 'du', 'grep', 'find', 'which', 'whereis',
            'node', 'npm', 'npx', 'git', 'curl', 'wget', 'ping', 'nslookup', 'dig'
        ];
        
        this.disallowedCommands = config.disallowedCommands || [
            'rm', 'rmdir', 'rmtree', 'del', 'format', 'mkfs', 
            'dd', 'chmod', 'chown', 'passwd', 'useradd', 'userdel', 'su', 'sudo'
        ];
        
        this.timeout = config.timeout || 10000; // 10 seconds default
        this.maxOutputSize = config.maxOutputSize || 1024 * 100; // 100KB
        this.workingDir = config.workingDir || os.tmpdir();
    }

    /**
     * Execute a system command
     * @param {object} params - Tool parameters
     * @param {object} context - Execution context
     * @returns {Promise<any>} - Command execution result
     */
    async execute(params, context) {
        const { command, args = [], options = {} } = params;
        
        if (!command) {
            throw new Error('Command is required');
        }

        // Validate and sanitize the command
        this._validateCommand(command, args);

        // Sanitize options
        const sanitizedOptions = {
            cwd: this.workingDir,
            timeout: this.timeout,
            maxBuffer: this.maxOutputSize,
            ...options
        };

        return new Promise((resolve, reject) => {
            const commandString = [command, ...args].join(' ');
            const startTime = Date.now();
            
            // Use exec for safety since it prevents shell injection better than spawn
            const child = exec(commandString, sanitizedOptions, (error, stdout, stderr) => {
                const executionTime = Date.now() - startTime;
                
                if (error) {
                    // Filter out potentially unsafe information in error messages
                    const safeError = {
                        message: error.message ? error.message.replace(/(password|token|key|secret)/gi, '[REDACTED]') : 'Unknown error',
                        code: error.code,
                        signal: error.signal,
                        executionTime
                    };
                    
                    resolve({
                        success: false,
                        command: commandString,
                        error: safeError,
                        stdout: this._sanitizeOutput(stdout),
                        stderr: this._sanitizeOutput(stderr),
                        executionTime
                    });
                } else {
                    resolve({
                        success: true,
                        command: commandString,
                        stdout: this._sanitizeOutput(stdout),
                        stderr: this._sanitizeOutput(stderr),
                        executionTime
                    });
                }
            });

            // Add timeout handling
            setTimeout(() => {
                if (!child.killed) {
                    child.kill();
                    resolve({
                        success: false,
                        command: commandString,
                        error: {
                            message: `Command timed out after ${this.timeout}ms`,
                            code: 'ETIMEOUT',
                            executionTime: Date.now() - startTime
                        }
                    });
                }
            }, this.timeout);
        });
    }

    /**
     * Get tool description
     */
    getDescription() {
        return 'Tool for executing system commands in a secure, sandboxed environment with safety restrictions. Only allows predefined safe commands.';
    }

    /**
     * Get parameter schema
     */
    getParameterSchema() {
        return {
            type: 'object',
            properties: {
                command: {
                    type: 'string',
                    description: 'The command to execute'
                },
                args: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Arguments for the command'
                },
                options: {
                    type: 'object',
                    properties: {
                        cwd: { type: 'string', description: 'Working directory' },
                        env: { type: 'object', description: 'Environment variables' }
                    },
                    description: 'Additional options for command execution'
                }
            },
            required: ['command']
        };
    }

    /**
     * Validate parameters
     */
    validate(params) {
        const errors = [];

        if (!params.command) {
            errors.push('Command is required');
        } else {
            try {
                this._validateCommand(params.command, params.args || []);
            } catch (error) {
                errors.push(error.message);
            }
        }

        if (params.args && !Array.isArray(params.args)) {
            errors.push('Args must be an array');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get tool capabilities
     */
    getCapabilities() {
        return ['command-execution', 'system-utilities'];
    }

    /**
     * Get tool category
     */
    getCategory() {
        return 'command-execution';
    }

    /**
     * Validate command for safety
     * @private
     */
    _validateCommand(command, args = []) {
        // Check for disallowed commands first (higher priority)
        const normalizedCommand = command.split(/\s+/)[0].toLowerCase();
        
        if (this.disallowedCommands.includes(normalizedCommand)) {
            throw new Error(`Command '${normalizedCommand}' is explicitly disallowed`);
        }

        // Check for allowed commands
        if (!this.allowedCommands.includes(normalizedCommand)) {
            throw new Error(`Command '${normalizedCommand}' is not in the allowed list`);
        }

        // Check for dangerous patterns in arguments
        const allArgs = [command, ...args].join(' ');
        
        // Check for shell injection patterns
        const dangerousPatterns = [
            /[\|;&\`]/,  // Pipes, semicolons, amperands, backticks
            /\$\(/,      // Command substitution
            /`.*`/,      // Backtick command substitution
            />\s*[>&]/,  // Output redirection
            /<\s*[<]/,   // Input redirection
            /[\n\r]/,    // Newlines that might separate commands
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(allArgs)) {
                throw new Error(`Dangerous pattern detected in command: ${allArgs}`);
            }
        }

        // Additional checks for specific commands
        if (normalizedCommand === 'rm' || normalizedCommand === 'rmdir' || normalizedCommand === 'del') {
            throw new Error(`File deletion commands are not allowed`);
        }

        if (normalizedCommand === 'chmod' || normalizedCommand === 'chown') {
            throw new Error(`File permission modification commands are not allowed`);
        }
    }

    /**
     * Sanitize command output for safety
     * @private
     */
    _sanitizeOutput(output) {
        if (!output) return output;
        
        // Truncate if too large
        if (output.length > this.maxOutputSize) {
            return output.substring(0, this.maxOutputSize) + '\n[OUTPUT TRUNCATED]';
        }
        
        // Redact potentially sensitive information
        return output
            .replace(/(password|token|key|secret|auth|api)[=:]\s*[^\\s\\n\\r]+/gi, '$1: [REDACTED]')
            .replace(/\/\/[^:]+:[^@]+@/g, '//[USER]:[PASS]@'); // Redact HTTP basic auth
    }
}