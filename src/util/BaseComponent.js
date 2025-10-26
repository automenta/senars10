import {Logger} from '../util/Logger.js';
import {EventBus} from '../util/EventBus.js';

/**
 * Abstract base component that provides common functionality for all system components.
 * Implements standardized patterns for lifecycle, metrics, and logging.
 */
export class BaseComponent {
    /**
     * Creates a new base component
     * @param {Object} config - Component configuration
     * @param {string} name - Component name for identification and logging
     * @param {EventBus} [eventBus] - Optional shared event bus
     * @param {Joi.ObjectSchema} [validationSchema] - Optional validation schema for configuration
     */
    constructor(config = {}, name = 'BaseComponent', eventBus = null, validationSchema = null) {
        this._config = config;
        this._name = name;
        this._logger = Logger;  // Logger is a singleton instance, not a class to instantiate
        this._eventBus = eventBus || new EventBus();
        this._metrics = new Map();
        this._validationSchema = validationSchema;
        this._initialized = false;
        this._started = false;
        this._disposed = false;
        this._startTime = null;

        // Validate configuration if schema provided
        if (this._validationSchema) {
            this._validateConfig(config);
        }

        // Initialize common metrics
        this._initializeMetrics();
    }

    /**
     * Gets the component name
     * @returns {string} Component name
     */
    get name() {
        return this._name;
    }

    /**
     * Gets the component configuration
     * @returns {Object} Component configuration
     */
    get config() {
        return this._config;
    }

    /**
     * Gets the component logger
     * @returns {Logger} Component logger
     */
    get logger() {
        return this._logger;
    }

    /**
     * Gets the component event bus
     * @returns {EventBus} Component event bus
     */
    get eventBus() {
        return this._eventBus;
    }

    /**
     * Gets the component metrics
     * @returns {Map} Component metrics
     */
    get metrics() {
        return this._metrics;
    }

    /**
     * Checks if the component is initialized
     * @returns {boolean} True if initialized, false otherwise
     */
    get isInitialized() {
        return this._initialized;
    }

    /**
     * Checks if the component is started
     * @returns {boolean} True if started, false otherwise
     */
    get isStarted() {
        return this._started;
    }

    /**
     * Checks if the component is disposed
     * @returns {boolean} True if disposed, false otherwise
     */
    get isDisposed() {
        return this._disposed;
    }

    /**
     * Checks if the component is running (both started and not disposed)
     * @returns {boolean} True if running, false otherwise
     */
    get isRunning() {
        return this._started && !this._disposed;
    }

    /**
     * Gets the component uptime in milliseconds
     * @returns {number} Uptime in milliseconds, or null if not started
     */
    get uptime() {
        return this._startTime ? Date.now() - this._startTime : 0;
    }

    /**
     * Validates configuration against the provided schema
     * @param {Object} config - Configuration to validate
     * @returns {Object} - Validated and potentially transformed config
     */
    _validateConfig(config) {
        const schema = typeof this._validationSchema === 'function'
            ? this._validationSchema()
            : this._validationSchema;

        const validationResult = schema.validate(config, {
            stripUnknown: true,
            allowUnknown: false,
            convert: true
        });

        if (validationResult.error) {
            throw new Error(`Configuration validation failed for ${this._name}: ${validationResult.error.message}`);
        }

        return validationResult.value;
    }

    /**
     * Validates configuration against the provided schema
     * @param {Object} config - Configuration to validate
     * @returns {Object} - Validated and potentially transformed config
     */
    validateConfig(config = this._config) {
        if (!this._validationSchema) return config;

        const schema = typeof this._validationSchema === 'function'
            ? this._validationSchema()
            : this._validationSchema;

        const validationResult = schema.validate(config, {
            stripUnknown: true,
            allowUnknown: false,
            convert: true
        });

        if (validationResult.error) {
            throw new Error(`Configuration validation failed for ${this._name}: ${validationResult.error.message}`);
        }

        return validationResult.value;
    }

    /**
     * Initializes the component
     * @returns {Promise<boolean>} True if initialization was successful
     */
    async initialize() {
        if (this._initialized) {
            this.logWarn('Component already initialized');
            return true;
        }

        try {
            this.logInfo('Initializing component');
            await this._initialize();
            this._initialized = true;

            // Emit initialization event
            this._eventBus.emit(`${this._name}.initialized`, {
                timestamp: Date.now(),
                component: this._name
            });

            this._logger.info('Component initialized successfully');
            this.incrementMetric('initializeCount');
            return true;
        } catch (error) {
            this._logger.error('Failed to initialize component', error);
            return false;
        }
    }

    /**
     * Starts the component
     * @returns {Promise<boolean>} True if start was successful
     */
    async start() {
        if (!this._initialized) {
            this._logger.error('Cannot start uninitialized component');
            return false;
        }

        if (this._started) {
            this.logWarn('Component already started');
            return true;
        }

        try {
            this.logInfo('Starting component');
            this._startTime = Date.now();
            await this._start();
            this._started = true;

            // Emit start event
            this._eventBus.emit(`${this._name}.started`, {
                timestamp: Date.now(),
                component: this._name,
                uptime: this.uptime
            });

            this.logInfo('Component started successfully');
            this.incrementMetric('startCount');
            return true;
        } catch (error) {
            this._logger.error('Failed to start component', error);
            return false;
        }
    }

    /**
     * Stops the component
     * @returns {Promise<boolean>} True if stop was successful
     */
    async stop() {
        if (!this._started) {
            this.logWarn('Component not started');
            return true;
        }

        try {
            this.logInfo('Stopping component');
            await this._stop();
            this._started = false;

            // Emit stop event
            this._eventBus.emit(`${this._name}.stopped`, {
                timestamp: Date.now(),
                component: this._name,
                uptime: this.uptime
            });

            this.logInfo('Component stopped successfully');
            this.incrementMetric('stopCount');
            return true;
        } catch (error) {
            this._logger.error('Failed to stop component', error);
            return false;
        }
    }

    /**
     * Disposes the component, releasing all resources
     * @returns {Promise<boolean>} True if dispose was successful
     */
    async dispose() {
        if (this._disposed) {
            this.logWarn('Component already disposed');
            return true;
        }

        try {
            this.logInfo('Disposing component');

            // Stop if running
            if (this._started) {
                await this.stop();
            }

            await this._dispose();
            this._disposed = true;

            // Emit dispose event
            this._eventBus.emit(`${this._name}.disposed`, {
                timestamp: Date.now(),
                component: this._name,
                uptime: this.uptime
            });

            this.logInfo('Component disposed successfully');
            return true;
        } catch (error) {
            this._logger.error('Failed to dispose component', error);
            return false;
        }
    }

    /**
     * Internal initialization method - to be overridden by subclasses
     * @protected
     * @returns {Promise<void>}
     */
    async _initialize() {
        // Default implementation - can be overridden
    }

    /**
     * Internal start method - to be overridden by subclasses
     * @protected
     * @returns {Promise<void>}
     */
    async _start() {
        // Default implementation - can be overridden
    }

    /**
     * Internal stop method - to be overridden by subclasses
     * @protected
     * @returns {Promise<void>}
     */
    async _stop() {
        // Default implementation - can be overridden
    }

    /**
     * Internal dispose method - to be overridden by subclasses
     * @protected
     * @returns {Promise<void>}
     */
    async _dispose() {
        // Default implementation - can be overridden
    }

    /**
     * Initialize common metrics for the component
     * @private
     */
    _initializeMetrics() {
        this._metrics.set('initializeCount', 0);
        this._metrics.set('startCount', 0);
        this._metrics.set('stopCount', 0);
        this._metrics.set('errorCount', 0);
        this._metrics.set('uptime', 0);
        this._metrics.set('lastActivity', Date.now());
    }

    /**
     * Updates a metric value
     * @param {string} key - Metric key
     * @param {any} value - Metric value
     */
    updateMetric(key, value) {
        this._metrics.set(key, value);
        this._metrics.set('lastActivity', Date.now());
    }

    /**
     * Increments a metric value
     * @param {string} key - Metric key
     * @param {number} increment - Value to increment by (default: 1)
     */
    incrementMetric(key, increment = 1) {
        const currentValue = this._metrics.get(key) || 0;
        this._metrics.set(key, currentValue + increment);
        this._metrics.set('lastActivity', Date.now());
    }

    /**
     * Gets a metric value
     * @param {string} key - Metric key
     * @returns {any} Metric value
     */
    getMetric(key) {
        return this._metrics.get(key);
    }

    /**
     * Gets all metrics as an object
     * @returns {Object} All metrics
     */
    getMetrics() {
        return {
            ...Object.fromEntries(this._metrics),
            uptime: this.uptime,
            isRunning: this.isRunning
        };
    }

    /**
     * Logs an info message
     * @param {string} message - Message to log
     * @param {Object} [metadata] - Optional metadata to include
     */
    logInfo(message, metadata) {
        this._logger.info(message, metadata);
        this._metrics.set('lastActivity', Date.now());
    }

    /**
     * Logs a warning message
     * @param {string} message - Message to log
     * @param {Object} [metadata] - Optional metadata to include
     */
    logWarn(message, metadata) {
        this._logger.warn(message, metadata);
        this._metrics.set('lastActivity', Date.now());
    }

    /**
     * Logs an error message
     * @param {string} message - Message to log
     * @param {Object} [metadata] - Optional metadata to include
     */
    logError(message, metadata) {
        this._logger.error(message, metadata);
        this.incrementMetric('errorCount');
    }

    /**
     * Logs a debug message
     * @param {string} message - Message to log
     * @param {Object} [metadata] - Optional metadata to include
     */
    logDebug(message, metadata) {
        this._logger.debug(message, metadata);
        this._metrics.set('lastActivity', Date.now());
    }

    /**
     * Emits an event through the event bus
     * @param {string} event - Event name
     * @param {Object} data - Event data
     * @param {Object} options - Event options
     */
    emitEvent(event, data, options = {}) {
        this._eventBus.emit(event, {
            timestamp: Date.now(),
            component: this._name,
            uptime: this.uptime,
            ...data
        }, options);
    }

    /**
     * Subscribes to an event
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function
     */
    onEvent(event, handler) {
        this._eventBus.on(event, handler);
    }

    /**
     * Unsubscribes from an event
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function
     */
    offEvent(event, handler) {
        this._eventBus.off(event, handler);
    }
}