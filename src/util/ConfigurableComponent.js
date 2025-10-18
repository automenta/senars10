/**
 * Base class for components that support configuration
 * Implements common configuration patterns to reduce code duplication
 */
export class ConfigurableComponent {
    constructor(defaultConfig = {}) {
        this._defaultConfig = defaultConfig;
        this._config = {...defaultConfig};
    }

    /**
     * Get current configuration
     */
    get config() {
        return {...this._config};
    }

    /**
     * Get default configuration
     */
    get defaultConfig() {
        return {...this._defaultConfig};
    }

    /**
     * Update configuration with new values
     */
    configure(newConfig) {
        this._config = {...this._config, ...newConfig};
        return this;  // Allow chaining
    }

    /**
     * Get specific configuration value
     */
    getConfigValue(key, defaultValue = undefined) {
        return this._config[key] !== undefined ? this._config[key] : defaultValue;
    }

    /**
     * Set specific configuration value
     */
    setConfigValue(key, value) {
        this._config[key] = value;
        return this;
    }
}