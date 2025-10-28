/**
 * Base class for components that support configuration
 * Implements common configuration patterns to reduce code duplication
 */
export class ConfigurableComponent {
    constructor(defaultConfig = {}, validationSchema = null) {
        this._defaultConfig = defaultConfig;
        this._config = {...defaultConfig};
        this._validationSchema = validationSchema;
    }

    get config() {
        return {...this._config};
    }

    get defaultConfig() {
        return {...this._defaultConfig};
    }

    configure(cfg) {
        if (this._validationSchema) {
            const schema = typeof this._validationSchema === 'function'
                ? this._validationSchema()
                : this._validationSchema;

            const validationResult = schema.validate(cfg, {
                stripUnknown: true,
                allowUnknown: false,
                convert: true
            });

            if (validationResult.error) {
                throw new Error(`Configuration validation failed: ${validationResult.error.message}`);
            }

            cfg = validationResult.value;
        }

        this._config = {...this._config, ...cfg};
        return this;
    }

    getConfigValue(key, defaultVal) {
        return this._config[key] !== undefined ? this._config[key] : defaultVal;
    }

    setConfigValue(key, val) {
        const newConfig = {...this._config, [key]: val};

        if (this._validationSchema) {
            const schema = typeof this._validationSchema === 'function'
                ? this._validationSchema()
                : this._validationSchema;

            const validationResult = schema.validate(newConfig, {
                stripUnknown: true,
                allowUnknown: false,
                convert: true
            });

            if (validationResult.error) {
                throw new Error(`Configuration validation failed: ${validationResult.error.message}`);
            }

            this._config = validationResult.value;
        } else {
            this._config[key] = val;
        }

        return this;
    }

    validateConfig(config = this._config) {
        if (this._validationSchema) {
            const schema = typeof this._validationSchema === 'function'
                ? this._validationSchema()
                : this._validationSchema;

            const validationResult = schema.validate(config, {
                stripUnknown: true,
                allowUnknown: false,
                convert: true
            });

            if (validationResult.error) {
                throw new Error(`Configuration validation failed: ${validationResult.error.message}`);
            }

            return validationResult.value;
        }

        return config;
    }
}