import { Component } from '../components/Component.js';
import { Logger } from '../base/utilities.js';

/**
 * SystemContext - Provides safe, read-only access to system internals
 *
 * SystemContext provides controlled access to system components and state
 * without allowing modifications. This enables other components to introspect
 * the system state safely for reasoning and decision making.
 */
export class SystemContext extends Component {
  constructor(system) {
    super();

    // Reference to the main system instance
    this.system = system;

    // Cached read-only views of system state
    this._cachedViews = new Map();

    // Configuration for what components/services can be accessed
    this.config = {
      allowMemoryAccess: true,
      allowReasonerAccess: true,
      allowClockAccess: true,
      allowTaskAccess: true,
      maxCacheAge: 1000 // 1 second cache
    };
  }

  async initialize(config = {}) {
    await super.initialize(config);

    // Apply configuration
    this.config = { ...this.config, ...config };

    // Clear cached views
    this._cachedViews.clear();
  }

  /**
   * Get read-only access to memory
   */
  getMemory() {
    if (!this.config.allowMemoryAccess || !this.system.memory) {
      return null;
    }

    // Return a proxy that only allows read operations
    return this._createReadOnlyProxy(this.system.memory);
  }

  /**
   * Get read-only access to reasoner
   */
  getReasoner() {
    if (!this.config.allowReasonerAccess || !this.system.reasoner) {
      return null;
    }

    return this._createReadOnlyProxy(this.system.reasoner);
  }

  /**
   * Get read-only access to clock
   */
  getClock() {
    if (!this.config.allowClockAccess || !this.system.clock) {
      return null;
    }

    return this._createReadOnlyProxy(this.system.clock);
  }

  /**
   * Get read-only access to current tasks
   */
  getCurrentTasks() {
    if (!this.config.allowTaskAccess) {
      return null;
    }

    // Return a read-only view of current tasks if system has them
    if (this.system.focusSetSelector && this.system.focusSetSelector.getFocusSet) {
      const focusSet = this.system.focusSetSelector.getFocusSet();
      return this._createReadOnlyProxy(focusSet);
    }

    return null;
  }

  /**
   * Get system statistics and metrics
   */
  getSystemStats() {
    if (!this.system) return {};

    return {
      timestamp: Date.now(),
      componentCount: this._getComponentCount(),
      taskCount: this._getTaskCount(),
      memoryUsage: this._getMemoryUsage(),
      cycleCount: this._getCycleCount(),
      uptime: this._getUptime()
    };
  }

  /**
   * Get system configuration
   */
  getSystemConfig() {
    return this._createReadOnlyProxy(this.system?.config || {});
  }

  /**
   * Get the current system state summary
   */
  getSystemState() {
    return {
      stats: this.getSystemStats(),
      config: this.getSystemConfig(),
      components: this._getComponentStatuses(),
      timestamp: Date.now()
    };
  }

  /**
   * Get component count
   * @private
   */
  _getComponentCount() {
    if (this.system && this.system.components) {
      return this.system.components.size;
    }
    return 0;
  }

  /**
   * Get task count
   * @private
   */
  _getTaskCount() {
    if (this.system && this.system.focusSetSelector) {
      try {
        const focusSet = this.system.focusSetSelector.getFocusSet();
        return Array.isArray(focusSet) ? focusSet.length : 0;
      } catch (e) {
        return 0;
      }
    }
    return 0;
  }

  /**
   * Get memory usage information
   * @private
   */
  _getMemoryUsage() {
    if (this.system && this.system.memory) {
      try {
        return {
          size: this.system.memory.size ? this.system.memory.size() : 'unknown',
          capacity: this.system.memory.capacity || 'unlimited',
          usage: 'available'
        };
      } catch (e) {
        return { error: e.message };
      }
    }
    return { error: 'Memory not available' };
  }

  /**
   * Get cycle count
   * @private
   */
  _getCycleCount() {
    if (this.system && this.system.clock) {
      return this.system.clock.cycleCount || 0;
    }
    return 0;
  }

  /**
   * Get system uptime
   * @private
   */
  _getUptime() {
    if (this.system && this.system.startTime) {
      return Date.now() - this.system.startTime;
    }
    return 0;
  }

  /**
   * Get component statuses
   * @private
   */
  _getComponentStatuses() {
    const statuses = {};
    if (this.system && this.system.components) {
      for (const [name, component] of this.system.components) {
        try {
          statuses[name] = component.getHealth ? component.getHealth().status : 'unknown';
        } catch (e) {
          statuses[name] = 'error';
        }
      }
    }
    return statuses;
  }

  /**
   * Create a read-only proxy for an object
   * @private
   */
  _createReadOnlyProxy(obj) {
    if (!obj) return obj;

    // For arrays, we create a read-only array
    if (Array.isArray(obj)) {
      return new Proxy(obj, {
        get(target, property) {
          if (property === 'push' || property === 'pop' || property === 'shift' ||
              property === 'unshift' || property === 'splice' || property === 'sort' ||
              property === 'reverse' || property === 'fill' || property === 'copyWithin') {
            throw new Error(`Cannot modify array property: ${property}`);
          }
          return target[property];
        },
        set() {
          throw new Error('Cannot modify read-only array');
        }
      });
    }

    // For objects, we create a read-only proxy
    return new Proxy(obj, {
      get(target, property) {
        // Allow access to functions but warn about potential side effects
        if (typeof target[property] === 'function') {
          return function(...args) {
            // Execute the function but warn about potential modifications
            Logger.warn(`Function ${property} called on read-only object. Verify it doesn't modify state.`);
            return target[property].apply(target, args);
          };
        }
        return target[property];
      },
      set(target, property, value) {
        throw new Error(`Cannot modify read-only object property: ${property}`);
      }
    });
  }

  /**
   * Get a cached view of system state
   */
  getCachedView(viewName, updateFn, maxAge = this.config.maxCacheAge) {
    const cached = this._cachedViews.get(viewName);

    if (cached && (Date.now() - cached.timestamp) < maxAge) {
      return cached.data;
    }

    const data = updateFn();
    this._cachedViews.set(viewName, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  /**
   * Clear cached views
   */
  clearCache() {
    this._cachedViews.clear();
  }

  /**
   * Check if a component is available in the system
   */
  isComponentAvailable(componentName) {
    return !!(this.system && this.system.components && this.system.components.has(componentName));
  }

  /**
   * Get a specific component (with safety checks)
   */
  getComponent(componentName) {
    if (!this.system || !this.system.components) {
      return null;
    }

    const component = this.system.components.get(componentName);
    if (!component) {
      return null;
    }

    // Return read-only proxy
    return this._createReadOnlyProxy(component);
  }

  /**
   * Get recent system events (if available)
   */
  getRecentEvents(limit = 50) {
    // Placeholder for system events
    // Would connect to a message/event system if available
    return [];
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      timestamp: Date.now(),
      stats: this.getSystemStats(),
      // Add any other performance-related metrics here
      metrics: {
        cycleTime: this.system?.clock?.getAverageCycleTime?.() || 'unavailable',
        memoryUsage: this._getMemoryUsage()
      }
    };
  }
}