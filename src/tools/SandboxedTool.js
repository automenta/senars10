/**
 * @file src/tools/SandboxedTool.js
 * @description Base class for tools that execute in a sandboxed environment
 */

import {BaseTool} from './BaseTool.js';
import {spawn} from 'child_process';
import path from 'path';
import os from 'os';

/**
 * Resource limits for sandboxed execution
 */
export const ResourceLimits = {
    MEMORY: 100 * 1024 * 1024, // 100MB
    CPU_TIME: 5000,            // 5 seconds
    RUNTIME: 10000,            // 10 seconds max runtime
    STDOUT_SIZE: 1024 * 100,   // 100KB max stdout
    STDERR_SIZE: 1024 * 10,    // 10KB max stderr
};

/**
 * Base class for sandboxed tools that execute in isolated environments
 * with strict resource limits and capability controls
 */
export class SandboxedTool extends BaseTool {
    constructor(config = {}) {
        super(config);
        
        this.memoryLimit = config.memoryLimit || ResourceLimits.MEMORY;
        this.cpuTimeLimit = config.cpuTimeLimit || ResourceLimits.CPU_TIME;
        this.runtimeLimit = config.runtimeLimit || ResourceLimits.RUNTIME;
        this.stdoutSizeLimit = config.stdoutSizeLimit || ResourceLimits.STDOUT_SIZE;
        this.stderrSizeLimit = config.stderrSizeLimit || ResourceLimits.STDERR_SIZE;
        this.workingDir = config.workingDir || os.tmpdir();
        this.allowedPaths = new Set(config.allowedPaths || [
            os.tmpdir(),
            path.join(process.cwd(), 'temp'),
            path.join(process.cwd(), 'work')
        ]);
        
        // Create a unique execution subdirectory for this tool
        this.executionDir = path.join(this.workingDir, 'sandboxes', this.constructor.name, Date.now().toString());
        
        // Ensure the execution directory exists
        this._ensureExecutionDirectory();
    }

    /**
     * Execute the tool in a sandboxed environment
     */
    async execute(params, context) {
        // Validate that the tool has required capabilities
        if (!context.engine || !context.engine.capabilityManager) {
            throw new Error('SandboxedTool requires an engine with capability manager');
        }

        const hasCapabilities = await context.engine.capabilityManager.hasAllCapabilities(
            this.constructor.name.toLowerCase().replace(/tool$/, ''), 
            this.getRequiredCapabilities()
        );
        
        if (!hasCapabilities) {
            const requiredCaps = this.getRequiredCapabilities();
            throw new Error(`Tool lacks required capabilities: ${requiredCaps.join(', ')}`);
        }

        // Validate parameters
        const validation = this.validate(params);
        if (!validation.isValid) {
            throw new Error(`Tool parameters validation failed: ${validation.errors.join(', ')}`);
        }

        // Execute in sandbox
        return this._executeInSandbox(params, context);
    }

    /**
     * Execute the tool logic in a sandboxed environment
     * @protected
     */
    async _executeInSandbox(params, context) {
        throw new Error('_executeInSandbox must be implemented by subclass');
    }

    /**
     * Get required capabilities for this tool
     */
    getRequiredCapabilities() {
        return ['sandbox-execution'];
    }

    /**
     * Get resource limits for this tool
     */
    getResourceLimits() {
        return {
            memory: this.memoryLimit,
            cpuTime: this.cpuTimeLimit,
            runtime: this.runtimeLimit,
            stdoutSize: this.stdoutSizeLimit,
            stderrSize: this.stderrSizeLimit
        };
    }

    /**
     * Validate that a path is allowed for access
     */
    isPathAllowed(targetPath) {
        const resolvedPath = path.resolve(targetPath);
        
        for (const allowedDir of this.allowedPaths) {
            const resolvedAllowedDir = path.resolve(allowedDir);
            if (resolvedPath === resolvedAllowedDir || resolvedPath.startsWith(resolvedAllowedDir + path.sep)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Ensure the execution directory exists
     * @private
     */
    _ensureExecutionDirectory() {
        // In a real implementation, we would create the directory
        // For now, we just track it for validation purposes
        // The actual sandbox implementation would depend on the host system
    }

    /**
     * Sanitize output to prevent leaking sensitive information
     * @protected
     */
    sanitizeOutput(output) {
        if (!output) return output;

        // Redact potentially sensitive information
        return output
            .replace(/(password|token|key|secret|auth|api)[=:]\s*[^\\s\\n\\r]+/gi, '$1: [REDACTED]')
            .replace(/\/\/[^:]+:[^@]+@/g, '//[USER]:[PASS]@'); // Redact HTTP basic auth
    }

    /**
     * Execute a command in a restricted environment
     * @protected
     */
    async executeRestrictedCommand(command, args = [], options = {}) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            let stdout = '';
            let stderr = '';
            let stdoutSize = 0;
            let stderrSize = 0;

            // Resource limits
            const timeout = Math.min(this.runtimeLimit, options.timeout || this.runtimeLimit);

            const child = spawn(command, args, {
                cwd: this.workingDir,
                timeout: timeout,
                maxBuffer: Math.max(this.stdoutSizeLimit, this.stderrSizeLimit),
                env: this._getSandboxEnv(options.env),
                stdio: ['ignore', 'pipe', 'pipe'] // Prevent stdin, allow stdout/stderr
            });

            // Limit stdout size
            child.stdout.on('data', (data) => {
                stdoutSize += data.length;
                if (stdoutSize > this.stdoutSizeLimit) {
                    child.kill();
                    reject(new Error(`STDOUT exceeded size limit of ${this.stdoutSizeLimit} bytes`));
                    return;
                }
                stdout += data.toString();
            });

            // Limit stderr size
            child.stderr.on('data', (data) => {
                stderrSize += data.length;
                if (stderrSize > this.stderrSizeLimit) {
                    child.kill();
                    reject(new Error(`STDERR exceeded size limit of ${this.stderrSizeLimit} bytes`));
                    return;
                }
                stderr += data.toString();
            });

            child.on('error', (error) => {
                reject(new Error(`Command execution failed: ${error.message}`));
            });

            child.on('close', (code, signal) => {
                const executionTime = Date.now() - startTime;

                // If the process was killed due to timeout or resource limits
                if (signal === 'SIGTERM' || signal === 'SIGKILL') {
                    resolve({
                        success: false,
                        exitCode: null,
                        error: {
                            message: `Command killed after ${executionTime}ms`,
                            signal: signal,
                            executionTime
                        },
                        stdout: this.sanitizeOutput(stdout),
                        stderr: this.sanitizeOutput(stderr),
                        executionTime
                    });
                    return;
                }

                resolve({
                    success: code === 0,
                    exitCode: code,
                    stdout: this.sanitizeOutput(stdout),
                    stderr: this.sanitizeOutput(stderr),
                    executionTime
                });
            });

            // Set timeout
            setTimeout(() => {
                if (!child.killed) {
                    child.kill();
                    resolve({
                        success: false,
                        exitCode: null,
                        error: {
                            message: `Command timed out after ${timeout}ms`,
                            code: 'ETIMEOUT',
                            executionTime: Date.now() - startTime
                        },
                        stdout: this.sanitizeOutput(stdout),
                        stderr: this.sanitizeOutput(stderr),
                        executionTime: Date.now() - startTime
                    });
                }
            }, timeout);
        });
    }

    /**
     * Get the environment for the sandboxed process
     * @private
     */
    _getSandboxEnv(additionalEnv = {}) {
        // Create a minimal, safe environment
        const safeEnv = {
            PATH: process.env.PATH,
            HOME: process.env.HOME,
            TEMP: os.tmpdir(),
            TMPDIR: os.tmpdir(),
            LANG: process.env.LANG || 'C.UTF-8',
            LC_ALL: process.env.LC_ALL || 'C.UTF-8'
        };

        // Merge with additional environment variables
        return { ...safeEnv, ...additionalEnv };
    }

    /**
     * Cleanup resources used by this tool
     */
    async cleanup() {
        // In a real implementation, clean up the execution directory
        // For now, this is a placeholder
    }
}