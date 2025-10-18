/**
 * Base class for components that support configuration
 * Implements common configuration patterns to reduce code duplication
 */
export class ConfigurableComponent {
    constructor(defaultConfig = {}) {
        this._defaultConfig = defaultConfig;
        this._config = {...defaultConfig};
    }

    get config() { return {...this._config}; }
    get defaultConfig() { return {...this._defaultConfig}; }

    configure(cfg) {
        this._config = {...this._config, ...cfg};
        return this;
    }

    getConfigValue(key, defaultVal) {
        return this._config[key] !== undefined ? this._config[key] : defaultVal;
    }

    setConfigValue(key, val) {
        this._config[key] = val;
        return this;
    }
}