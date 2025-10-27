/**
 * @file src/util/CapabilityManager.js
 * @description Capability-based security model for tools and plugins
 */

/**
 * Types of capabilities that can be granted to tools/plugins
 */
export const CapabilityTypes = {
    // System capabilities
    FILE_SYSTEM_READ: 'file-system-read',
    FILE_SYSTEM_WRITE: 'file-system-write',
    NETWORK_ACCESS: 'network-access',
    COMMAND_EXECUTION: 'command-execution',
    
    // Sensitive capabilities
    PROCESS_MANAGEMENT: 'process-management',
    USER_MANAGEMENT: 'user-management',
    SYSTEM_CONFIGURATION: 'system-configuration',
    
    // Data capabilities
    DATABASE_ACCESS: 'database-access',
    ENCRYPTION: 'encryption',
    CRYPTOGRAPHY: 'cryptography',
    
    // API capabilities
    EXTERNAL_API_ACCESS: 'external-api-access',
    WEB_REQUESTS: 'web-requests',
    
    // Resource capabilities
    RESOURCE_LIMITS: 'resource-limits',
    MEMORY_ACCESS: 'memory-access',
    CPU_INTENSIVE: 'cpu-intensive'
};

/**
 * Represents a capability with its metadata and security parameters
 */
export class Capability {
    constructor(type, options = {}) {
        this.type = type;
        this.description = options.description || `Capability for ${type}`;
        this.resourceLimit = options.resourceLimit || null;
        this.scope = options.scope || 'default';
        this.permissions = options.permissions || [];
        this.requiresApproval = options.requiresApproval || false;
        this.createdAt = new Date().toISOString();
    }

    /**
     * Validates if this capability can be granted based on security policies
     */
    validate(context = {}) {
        const result = { valid: true, errors: [] };

        // Certain capabilities always require approval
        if ([CapabilityTypes.PROCESS_MANAGEMENT, 
             CapabilityTypes.USER_MANAGEMENT, 
             CapabilityTypes.SYSTEM_CONFIGURATION].includes(this.type) 
             && !this.requiresApproval) {
            result.valid = false;
            result.errors.push(`Capability ${this.type} requires explicit approval`);
        }

        // Validate resource limits if specified
        if (this.resourceLimit !== null && this.resourceLimit <= 0) {
            result.valid = false;
            result.errors.push(`Invalid resource limit: ${this.resourceLimit}`);
        }

        return result;
    }
}

/**
 * Manages capabilities for tools and plugins
 */
export class CapabilityManager {
    constructor() {
        this.capabilities = new Map(); // Map of capabilityId -> Capability
        this.grants = new Map();       // Map of toolId -> Set of granted capability IDs
        this.policyRules = new Map();  // Security policy rules
        this.auditLog = [];
    }

    /**
     * Register a new capability type
     */
    async registerCapability(id, capability) {
        if (!id || !capability) {
            throw new Error('Both id and capability are required for registration');
        }

        if (this.capabilities.has(id)) {
            throw new Error(`Capability with ID "${id}" already exists`);
        }

        // Validate capability
        const validation = capability.validate();
        if (!validation.valid) {
            throw new Error(`Capability validation failed: ${validation.errors.join(', ')}`);
        }

        this.capabilities.set(id, capability);

        this._logAudit('capability-registered', {
            capabilityId: id,
            capabilityType: capability.type,
            description: capability.description
        });

        return true;
    }

    /**
     * Grant capabilities to a tool/plugin
     */
    async grantCapabilities(toolId, capabilityIds, options = {}) {
        if (!toolId || !Array.isArray(capabilityIds) || capabilityIds.length === 0) {
            throw new Error('Tool ID and at least one capability ID are required');
        }

        // Validate that all requested capabilities exist
        for (const capId of capabilityIds) {
            if (!this.capabilities.has(capId)) {
                throw new Error(`Capability ID "${capId}" does not exist`);
            }
        }

        // Check policy rules before granting
        for (const capId of capabilityIds) {
            const capability = this.capabilities.get(capId);
            
            // Check if capability requires approval
            if (capability.requiresApproval && !options.approved) {
                throw new Error(`Capability "${capId}" requires explicit approval`);
            }

            // Validate policy rules
            const policyCheck = this._checkPolicyRules(toolId, capId, options);
            if (!policyCheck.allowed) {
                throw new Error(`Policy violation: ${policyCheck.reason}`);
            }
        }

        // Create or update grants for this tool
        if (!this.grants.has(toolId)) {
            this.grants.set(toolId, new Set());
        }

        const toolGrants = this.grants.get(toolId);
        const grantedCapabilities = [];
        const failedGrants = [];

        for (const capId of capabilityIds) {
            if (toolGrants.has(capId)) {
                failedGrants.push({ id: capId, reason: 'Already granted' });
                continue;
            }

            toolGrants.add(capId);
            grantedCapabilities.push(capId);

            this._logAudit('capability-granted', {
                toolId,
                capabilityId: capId,
                grantedBy: options.grantedBy || 'system',
                expiresAt: options.expiresAt,
                conditions: options.conditions
            });
        }

        return {
            success: true,
            granted: grantedCapabilities,
            failed: failedGrants,
            totalRequested: capabilityIds.length,
            totalGranted: grantedCapabilities.length
        };
    }

    /**
     * Revoke capabilities from a tool/plugin
     */
    async revokeCapabilities(toolId, capabilityIds) {
        if (!toolId || !Array.isArray(capabilityIds) || capabilityIds.length === 0) {
            throw new Error('Tool ID and at least one capability ID are required');
        }

        const toolGrants = this.grants.get(toolId);
        if (!toolGrants) {
            return {
                success: true,
                revoked: [],
                failed: capabilityIds.map(id => ({ id, reason: 'No grants exist for tool' }))
            };
        }

        const revokedCapabilities = [];
        const failedRevocations = [];

        for (const capId of capabilityIds) {
            if (toolGrants.has(capId)) {
                toolGrants.delete(capId);
                revokedCapabilities.push(capId);

                this._logAudit('capability-revoked', {
                    toolId,
                    capabilityId: capId
                });
            } else {
                failedRevocations.push({ id: capId, reason: 'Not granted to tool' });
            }
        }

        // Clean up empty grant sets
        if (toolGrants.size === 0) {
            this.grants.delete(toolId);
        }

        return {
            success: true,
            revoked: revokedCapabilities,
            failed: failedRevocations,
            totalRequested: capabilityIds.length,
            totalRevoked: revokedCapabilities.length
        };
    }

    /**
     * Check if a tool has a specific capability
     */
    async hasCapability(toolId, capabilityId) {
        const toolGrants = this.grants.get(toolId);
        if (!toolGrants) {
            return false;
        }

        // Check if the specific capability is granted
        if (!toolGrants.has(capabilityId)) {
            return false;
        }

        // Additional checks could be added here for expiration, conditions, etc.
        return true;
    }

    /**
     * Check if a tool has all required capabilities
     */
    async hasAllCapabilities(toolId, capabilityIds) {
        if (!Array.isArray(capabilityIds) || capabilityIds.length === 0) {
            return true; // If no capabilities required, assume valid
        }

        const toolGrants = this.grants.get(toolId);
        if (!toolGrants) {
            return false;
        }

        return capabilityIds.every(capId => toolGrants.has(capId));
    }

    /**
     * Get all capabilities granted to a tool
     */
    async getToolCapabilities(toolId) {
        const toolGrants = this.grants.get(toolId);
        if (!toolGrants) {
            return [];
        }

        return Array.from(toolGrants).map(capId => {
            const capability = this.capabilities.get(capId);
            return {
                id: capId,
                type: capability?.type,
                description: capability?.description,
                scope: capability?.scope,
                permissions: capability?.permissions
            };
        });
    }

    /**
     * Get all tools that have a specific capability
     */
    async getToolsWithCapability(capabilityId) {
        const tools = [];

        for (const [toolId, toolGrants] of this.grants.entries()) {
            if (toolGrants.has(capabilityId)) {
                tools.push(toolId);
            }
        }

        return tools;
    }

    /**
     * Define a security policy rule
     */
    async addPolicyRule(ruleId, rule) {
        if (!ruleId || !rule) {
            throw new Error('Both ruleId and rule are required');
        }

        // Validate rule structure
        if (!rule.type || !['deny', 'allow', 'conditional'].includes(rule.type)) {
            throw new Error('Rule type must be one of: deny, allow, conditional');
        }

        if (!rule.tools || (!Array.isArray(rule.tools) && typeof rule.tools !== 'string')) {
            throw new Error('Rule must specify tools (array or string)');
        }

        if (!rule.capabilities || (!Array.isArray(rule.capabilities) && typeof rule.capabilities !== 'string')) {
            throw new Error('Rule must specify capabilities (array or string)');
        }

        this.policyRules.set(ruleId, rule);

        this._logAudit('policy-rule-added', {
            ruleId,
            ruleType: rule.type,
            tools: rule.tools,
            capabilities: rule.capabilities
        });

        return true;
    }

    /**
     * Check if a grant complies with policy rules
     */
    _checkPolicyRules(toolId, capabilityId, grantOptions) {
        for (const [ruleId, rule] of this.policyRules.entries()) {
            // Check if rule applies to this tool and capability
            const toolMatch = this._matchesPattern(toolId, rule.tools);
            const capMatch = this._matchesPattern(capabilityId, rule.capabilities);

            if (toolMatch && capMatch) {
                // Check condition if present
                if (rule.condition && typeof rule.condition === 'function') {
                    try {
                        if (!rule.condition(toolId, capabilityId, grantOptions)) {
                            continue; // Condition not met, skip this rule
                        }
                    } catch (error) {
                        this._logAudit('policy-condition-error', {
                            ruleId,
                            error: error.message
                        });
                        continue;
                    }
                }

                // Rule matches and condition is satisfied
                if (rule.type === 'deny') {
                    return {
                        allowed: false,
                        reason: rule.reason || `Policy rule ${ruleId} denies capability ${capabilityId} for tool ${toolId}`
                    };
                }
            }
        }

        return { allowed: true };
    }

    /**
     * Helper to check if a value matches a pattern
     */
    _matchesPattern(value, patterns) {
        if (typeof patterns === 'string') {
            patterns = [patterns];
        }

        for (const pattern of patterns) {
            if (pattern === '*' || pattern === value) {
                return true;
            }
            // Support basic glob patterns
            if (pattern.endsWith('*') && value.startsWith(pattern.slice(0, -1))) {
                return true;
            }
            if (pattern.startsWith('*') && value.endsWith(pattern.slice(1))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Create a security manifest for a tool/plugin
     */
    createSecurityManifest(manifest) {
        if (!manifest || !manifest.id || !manifest.name) {
            throw new Error('Manifest must include id and name');
        }

        const validated = {
            id: manifest.id,
            name: manifest.name,
            requiredCapabilities: manifest.requiredCapabilities || [],
            optionalCapabilities: manifest.optionalCapabilities || [],
            metadata: manifest.metadata || {},
            createdAt: new Date().toISOString()
        };

        // Validate capability IDs exist
        const allCapabilities = [...validated.requiredCapabilities, ...validated.optionalCapabilities];
        for (const capId of allCapabilities) {
            if (!this.capabilities.has(capId)) {
                throw new Error(`Unknown capability in manifest: ${capId}`);
            }
        }

        return validated;
    }

    /**
     * Request capabilities based on a manifest
     */
    async requestCapabilitiesFromManifest(manifest, approvalContext = {}) {
        if (!manifest || !manifest.id) {
            throw new Error('Manifest must include an ID');
        }

        const allCapabilities = [...manifest.requiredCapabilities, ...manifest.optionalCapabilities];
        
        // Determine which capabilities to grant based on approval context
        const capabilitiesToGrant = allCapabilities.filter(capId => {
            const capability = this.capabilities.get(capId);
            // Always grant capabilities that don't require approval
            if (!capability.requiresApproval) {
                return true;
            }
            // Grant capabilities that require approval only if explicitly approved
            return approvalContext.approvedCapabilities?.includes(capId);
        });

        return this.grantCapabilities(
            manifest.id,
            capabilitiesToGrant,
            {
                grantedBy: approvalContext.grantedBy || 'system',
                approved: true,
                conditions: approvalContext.conditions
            }
        );
    }

    /**
     * Get capability usage statistics
     */
    getUsageStats() {
        const stats = {
            totalCapabilities: this.capabilities.size,
            totalGrants: 0,
            toolsWithGrants: this.grants.size,
            capabilityUsage: new Map(),
            auditLogSize: this.auditLog.length
        };

        // Count total grants
        for (const [toolId, toolGrants] of this.grants.entries()) {
            stats.totalGrants += toolGrants.size;
            for (const capId of toolGrants) {
                const count = stats.capabilityUsage.get(capId) || 0;
                stats.capabilityUsage.set(capId, count + 1);
            }
        }

        return stats;
    }

    /**
     * Get audit log for security events
     */
    getAuditLog(filter = {}) {
        let events = [...this.auditLog];

        if (filter.eventType) {
            events = events.filter(event => event.type === filter.eventType);
        }

        if (filter.toolId) {
            events = events.filter(event => 
                event.data.toolId === filter.toolId || 
                event.data.capabilityGrants?.some(g => g.toolId === filter.toolId)
            );
        }

        if (filter.since) {
            events = events.filter(event => event.timestamp >= filter.since);
        }

        if (filter.limit) {
            events = events.slice(-filter.limit);
        }

        return events;
    }

    /**
     * Log an audit event
     */
    _logAudit(eventType, data) {
        const event = {
            type: eventType,
            data,
            timestamp: new Date().toISOString()
        };

        this.auditLog.push(event);

        // Limit audit log size to prevent memory issues
        if (this.auditLog.length > 10000) {
            this.auditLog = this.auditLog.slice(-5000); // Keep last 5000 entries
        }
    }

    /**
     * Initialize with default capabilities
     */
    static async createDefaultManager() {
        const manager = new CapabilityManager();

        // Register default capabilities
        await manager.registerCapability('file-system-read', new Capability(CapabilityTypes.FILE_SYSTEM_READ, {
            description: 'Read access to file system in restricted directories',
            scope: 'local',
            permissions: ['read-files', 'read-directories']
        }));

        await manager.registerCapability('file-system-write', new Capability(CapabilityTypes.FILE_SYSTEM_WRITE, {
            description: 'Write access to file system in restricted directories',
            scope: 'local',
            permissions: ['write-files', 'create-directories'],
            requiresApproval: true
        }));

        await manager.registerCapability('network-access', new Capability(CapabilityTypes.NETWORK_ACCESS, {
            description: 'Network access for HTTP requests',
            scope: 'network',
            permissions: ['http-requests', 'https-requests']
        }));

        await manager.registerCapability('command-execution', new Capability(CapabilityTypes.COMMAND_EXECUTION, {
            description: 'Execute predefined safe system commands',
            scope: 'system',
            permissions: ['execute-commands'],
            requiresApproval: true
        }));

        await manager.registerCapability('external-api-access', new Capability(CapabilityTypes.EXTERNAL_API_ACCESS, {
            description: 'Access to external APIs',
            scope: 'network',
            permissions: ['api-calls'],
            requiresApproval: true
        }));

        return manager;
    }
}