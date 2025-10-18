/**
 * Registry for managing LM providers
 */
export class ProviderRegistry {
    constructor() {
        this.providers = new Map();
        this.defaultProviderId = null;
    }

    get size() {
        return this.providers.size;
    }

    register(id, provider) {
        if (!id || !provider) {
            throw new Error('Provider ID and provider object are required');
        }

        this.providers.set(id, provider);

        // Set as default if none exists
        if (!this.defaultProviderId) {
            this.defaultProviderId = id;
        }

        return this;
    }

    get(id) {
        return this.providers.get(id);
    }

    has(id) {
        return this.providers.has(id);
    }

    remove(id) {
        if (this.defaultProviderId === id) {
            this.defaultProviderId = this.providers.size > 0 ?
                Array.from(this.providers.keys())[0] : null;
        }
        return this.providers.delete(id);
    }

    getAll() {
        return new Map(this.providers);
    }

    setDefault(id) {
        if (this.providers.has(id)) {
            this.defaultProviderId = id;
        }
        return this;
    }
}