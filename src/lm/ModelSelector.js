/**
 * Selects optimal models based on task requirements and constraints
 */
export class ModelSelector {
    constructor(providerRegistry) {
        this.providerRegistry = providerRegistry;
        this.cache = new Map();
    }

    select(task, constraints = {}) {
        // Create a cache key based on task and constraints
        const cacheKey = `${task?.type || 'unknown'}_${JSON.stringify(constraints)}`;

        // Check cache first
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Simple selection logic based on constraints
        const availableProviders = Array.from(this.providerRegistry.providers.keys());

        // If no constraints, return default or first available
        if (Object.keys(constraints).length === 0) {
            const result = this.providerRegistry.defaultProviderId || availableProviders[0] || null;
            this.cache.set(cacheKey, result);
            return result;
        }

        // More sophisticated selection logic would go here
        // For now, return first available that meets basic constraints
        let selected = availableProviders[0] || null;

        // Example: if constraints specify performance requirements
        if (constraints.performance === 'high') {
            // Select the most capable model (in a real implementation)
            selected = availableProviders[0]; // Simplified
        } else if (constraints.performance === 'low') {
            // Select the most efficient model (in a real implementation)
            selected = availableProviders[availableProviders.length - 1] || null;
        }

        this.cache.set(cacheKey, selected);
        return selected;
    }

    getAvailableModels() {
        return Array.from(this.providerRegistry.providers.keys());
    }

    clearCache() {
        this.cache.clear();
    }
}