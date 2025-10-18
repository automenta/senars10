/**
 * A generic event handler function.
 */
export let EventHandler = null; // This will be a function type in actual usage

/**
 * Component health status.
 */
export class ComponentHealth {
  constructor(status = 'unknown') {
    this.status = status;
  }
}

/**
 * Component metrics.
 */
export class ComponentMetrics {
  constructor(data = {}) {
    this.data = data;
  }
}

/**
 * Component operational status.
 */
export class ComponentStatus {
  constructor(isRunning = false) {
    this.isRunning = isRunning;
  }
}

/**
 * Configuration for a component, loaded at initialization.
 */
export class ComponentConfig {
  constructor(name, version = '1.0.0', dependencies = [], config = {}) {
    this.name = name;
    this.version = version;
    this.dependencies = dependencies;
    this.config = config;
  }
}

/**
 * The Component interface defines a common interface for all major parts of the SeNARS system.
 *
 * This ensures that components have a consistent lifecycle, health monitoring,
 * and event handling mechanism.
 */
export class Component {
  constructor() {
    this.isInitialized = false;
    this.isRunning = false;
  }

  /**
   * Initializes the component with its configuration.
   * This is called once before the component is started.
   * @param {ComponentConfig} config - The configuration for the component
   * @returns {Promise<void>}
   */
  async initialize(config) {
    this.config = config;
    this.isInitialized = true;
  }

  /**
   * Starts the component's main logic.
   * @returns {Promise<void>}
   */
  async start() {
    if (!this.isInitialized) {
      throw new Error('Component must be initialized before starting');
    }
    this.isRunning = true;
  }

  /**
   * Stops the component's main logic.
   * @returns {Promise<void>}
   */
  async stop() {
    this.isRunning = false;
  }

  /**
   * Cleans up any resources used by the component.
   * @returns {Promise<void>}
   */
  async destroy() {
    await this.stop();
    this.isInitialized = false;
  }

  /**
   * Returns the current health of the component.
   * @returns {ComponentHealth}
   */
  getHealth() {
    return new ComponentHealth('healthy');
  }

  /**
   * Returns performance metrics from the component.
   * @returns {ComponentMetrics}
   */
  getMetrics() {
    return new ComponentMetrics({});
  }

  /**
   * Returns the current operational status of the component.
   * @returns {ComponentStatus}
   */
  getStatus() {
    return new ComponentStatus(this.isRunning);
  }

  /**
   * Emits an event from the component.
   * @param {string} event - The event name
   * @param {any} data - The event data
   */
  emit(event, data) {
    // In a real implementation, this would likely use a dedicated event bus
    console.log(`Event emitted: ${event}`, data);
  }
}