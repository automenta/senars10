import {BaseComponent} from '../util/BaseComponent.js';

/**
 * ComponentManager manages the lifecycle of system components
 * ensuring standardized initialization, startup, and shutdown patterns
 */
export class ComponentManager extends BaseComponent {
    /**
     * Creates a new component manager
     * @param {Object} config - Configuration for the component manager
     * @param {EventBus} [eventBus] - Optional shared event bus
     */
    constructor(config = {}, eventBus = null) {
        super(config, 'ComponentManager', eventBus);
        this._components = new Map(); // Map of component names to component instances
        this._dependencyGraph = new Map(); // Map of component dependencies
        this._startupOrder = []; // Order in which components should be started
        this._shutdownOrder = []; // Order in which components should be shut down
    }

    /**
     * Registers a component with the manager
     * @param {string} name - Component name
     * @param {BaseComponent} component - Component instance
     * @param {string[]} [dependencies] - Names of components this component depends on
     * @returns {boolean} True if registration was successful
     */
    registerComponent(name, component, dependencies = []) {
        if (this._components.has(name)) {
            this.logWarn(`Component ${name} already registered`);
            return false;
        }

        this._components.set(name, component);
        this._dependencyGraph.set(name, dependencies);
        this.logDebug(`Registered component: ${name}`, {
            dependencies,
            totalComponents: this._components.size
        });

        return true;
    }

    /**
     * Gets a registered component by name
     * @param {string} name - Component name
     * @returns {BaseComponent|null} Component instance or null if not found
     */
    getComponent(name) {
        return this._components.get(name) || null;
    }

    /**
     * Gets all registered components
     * @returns {Map<string, BaseComponent>} Map of component names to instances
     */
    getComponents() {
        return new Map(this._components);
    }

    /**
     * Gets the startup order of components
     * @returns {string[]} Array of component names in startup order
     */
    getStartupOrder() {
        if (this._startupOrder.length === 0) {
            this._calculateStartupOrder();
        }
        return [...this._startupOrder];
    }

    /**
     * Gets the shutdown order of components
     * @returns {string[]} Array of component names in shutdown order
     */
    getShutdownOrder() {
        if (this._shutdownOrder.length === 0) {
            this._calculateShutdownOrder();
        }
        return [...this._shutdownOrder];
    }

    /**
     * Calculates the startup order based on dependencies
     * @private
     */
    _calculateStartupOrder() {
        const result = [];
        const visited = new Set();
        const visiting = new Set(); // For cycle detection

        const visit = (node) => {
            if (visited.has(node)) return;
            if (visiting.has(node)) {
                throw new Error(`Circular dependency detected: ${node}`);
            }

            visiting.add(node);

            const dependencies = this._dependencyGraph.get(node) || [];
            for (const dependency of dependencies) {
                if (this._components.has(dependency)) {
                    visit(dependency);
                }
            }

            visiting.delete(node);
            visited.add(node);
            result.push(node);
        };

        for (const componentName of this._components.keys()) {
            if (!visited.has(componentName)) {
                visit(componentName);
            }
        }

        this._startupOrder = result;
    }

    /**
     * Calculates the shutdown order (reverse of startup order)
     * @private
     */
    _calculateShutdownOrder() {
        if (this._startupOrder.length === 0) {
            this._calculateStartupOrder();
        }
        this._shutdownOrder = [...this._startupOrder].reverse();
    }

    /**
     * Initializes all registered components in dependency order
     * @returns {Promise<boolean>} True if all components were initialized successfully
     */
    async initializeAll() {
        this.logInfo('Initializing all components', {
            totalComponents: this._components.size
        });

        const startupOrder = this.getStartupOrder();
        const failedComponents = [];

        for (const componentName of startupOrder) {
            const component = this._components.get(componentName);
            if (!component) continue;

            this.logDebug(`Initializing component: ${componentName}`);

            try {
                const success = await component.initialize();
                if (!success) {
                    failedComponents.push(componentName);
                    this.logError(`Failed to initialize component: ${componentName}`);
                } else {
                    this.incrementMetric('initializeCount');
                }
            } catch (error) {
                failedComponents.push(componentName);
                this.logError(`Exception during initialization of component ${componentName}:`, error);
            }
        }

        const success = failedComponents.length === 0;

        this.logInfo(`Component initialization complete`, {
            total: startupOrder.length,
            successful: startupOrder.length - failedComponents.length,
            failed: failedComponents.length,
            failedComponents,
            success
        });

        this.emitEvent('components.initialized', {
            total: startupOrder.length,
            successful: startupOrder.length - failedComponents.length,
            failed: failedComponents.length,
            failedComponents,
            success
        });

        return success;
    }

    /**
     * Starts all registered components in dependency order
     * @returns {Promise<boolean>} True if all components were started successfully
     */
    async startAll() {
        this.logInfo('Starting all components', {
            totalComponents: this._components.size
        });

        const startupOrder = this.getStartupOrder();
        const failedComponents = [];

        for (const componentName of startupOrder) {
            const component = this._components.get(componentName);
            if (!component) continue;

            this.logDebug(`Starting component: ${componentName}`);

            try {
                const success = await component.start();
                if (!success) {
                    failedComponents.push(componentName);
                    this.logError(`Failed to start component: ${componentName}`);
                } else {
                    this.incrementMetric('startCount');
                }
            } catch (error) {
                failedComponents.push(componentName);
                this.logError(`Exception during start of component ${componentName}:`, error);
            }
        }

        const success = failedComponents.length === 0;

        this.logInfo(`Component start complete`, {
            total: startupOrder.length,
            successful: startupOrder.length - failedComponents.length,
            failed: failedComponents.length,
            failedComponents,
            success
        });

        this.emitEvent('components.started', {
            total: startupOrder.length,
            successful: startupOrder.length - failedComponents.length,
            failed: failedComponents.length,
            failedComponents,
            success
        });

        return success;
    }

    /**
     * Stops all registered components in reverse dependency order
     * @returns {Promise<boolean>} True if all components were stopped successfully
     */
    async stopAll() {
        this.logInfo('Stopping all components', {
            totalComponents: this._components.size
        });

        const shutdownOrder = this.getShutdownOrder();
        const failedComponents = [];

        for (const componentName of shutdownOrder) {
            const component = this._components.get(componentName);
            if (!component) continue;

            this.logDebug(`Stopping component: ${componentName}`);

            try {
                const success = await component.stop();
                if (!success) {
                    failedComponents.push(componentName);
                    this.logError(`Failed to stop component: ${componentName}`);
                } else {
                    this.incrementMetric('stopCount');
                }
            } catch (error) {
                failedComponents.push(componentName);
                this.logError(`Exception during stop of component ${componentName}:`, error);
            }
        }

        const success = failedComponents.length === 0;

        this.logInfo(`Component stop complete`, {
            total: shutdownOrder.length,
            successful: shutdownOrder.length - failedComponents.length,
            failed: failedComponents.length,
            failedComponents,
            success
        });

        this.emitEvent('components.stopped', {
            total: shutdownOrder.length,
            successful: shutdownOrder.length - failedComponents.length,
            failed: failedComponents.length,
            failedComponents,
            success
        });

        return success;
    }

    /**
     * Disposes all registered components
     * @returns {Promise<boolean>} True if all components were disposed successfully
     */
    async disposeAll() {
        this.logInfo('Disposing all components', {
            totalComponents: this._components.size
        });

        const shutdownOrder = this.getShutdownOrder();
        const failedComponents = [];

        for (const componentName of shutdownOrder) {
            const component = this._components.get(componentName);
            if (!component) continue;

            this.logDebug(`Disposing component: ${componentName}`);

            try {
                const success = await component.dispose();
                if (!success) {
                    failedComponents.push(componentName);
                    this.logError(`Failed to dispose component: ${componentName}`);
                }
            } catch (error) {
                failedComponents.push(componentName);
                this.logError(`Exception during dispose of component ${componentName}:`, error);
            }
        }

        const success = failedComponents.length === 0;

        this.logInfo(`Component dispose complete`, {
            total: shutdownOrder.length,
            successful: shutdownOrder.length - failedComponents.length,
            failed: failedComponents.length,
            failedComponents,
            success
        });

        this.emitEvent('components.disposed', {
            total: shutdownOrder.length,
            successful: shutdownOrder.length - failedComponents.length,
            failed: failedComponents.length,
            failedComponents,
            success
        });

        return success;
    }

    /**
     * Gets metrics for all components
     * @returns {Object} Metrics for all components
     */
    getComponentsMetrics() {
        const allMetrics = {};

        for (const [name, component] of this._components) {
            allMetrics[name] = {
                isInitialized: component.isInitialized,
                isStarted: component.isStarted,
                isDisposed: component.isDisposed,
                metrics: component.getMetrics()
            };
        }

        return allMetrics;
    }

    /**
     * Health check for all components
     * @returns {Object} Health status for all components
     */
    async healthCheck() {
        const healthStatus = {};

        for (const [name, component] of this._components) {
            try {
                // Basic health check - verify component is in expected state
                healthStatus[name] = {
                    isInitialized: component.isInitialized,
                    isStarted: component.isStarted,
                    isDisposed: component.isDisposed,
                    reachable: true,
                    error: null
                };
            } catch (error) {
                healthStatus[name] = {
                    isInitialized: false,
                    isStarted: false,
                    isDisposed: true,
                    reachable: false,
                    error: error.message
                };
            }
        }

        return healthStatus;
    }
}