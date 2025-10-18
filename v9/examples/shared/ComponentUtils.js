/**
 * Common utilities for component availability checks in examples
 */
export class ComponentUtils {
  static requireComponent(system, componentName, componentPath = null) {
    const component = componentPath ? this.getNestedComponent(system, componentPath) : system.core[componentName];

    if (!component) {
      throw new Error(`${componentName} not available`);
    }

    return component;
  }

  static getNestedComponent(obj, path) {
    return path.split('.').reduce((current, key) =>
      current && current[key], obj);
  }

  static checkComponentAvailability(system, componentChecks) {
    const results = {};

    for (const [name, path] of Object.entries(componentChecks)) {
      results[name] = {
        available: !!this.getNestedComponent(system, path || name),
        path: path || name
      };
    }

    return results;
  }

  static withComponentCheck(system, componentName, fn, componentPath = null) {
    const component = this.requireComponent(system, componentName, componentPath);

    return async (...args) => {
      return await fn(component, ...args);
    };
  }

  static safeExecuteComponentMethod(component, methodName, fallbackValue = null) {
    if (!component || typeof component[methodName] !== 'function') {
      return fallbackValue;
    }

    try {
      return component[methodName]();
    } catch (error) {
      console.warn(`Failed to execute ${methodName}:`, error.message);
      return fallbackValue;
    }
  }
}