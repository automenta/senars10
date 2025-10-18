/**
 * Common validation utilities to reduce code duplication
 */
export class ValidationUtils {
  static validateRequired(obj, props) {
    if (!obj) throw new Error('Object is required');
    if (!Array.isArray(props)) throw new Error('Props must be an array');

    const missingProps = props.filter(prop => !(prop in obj) || obj[prop] == null);
    if (missingProps.length > 0) {
      throw new Error(`${missingProps[0]} is required`);
    }
  }

  static validateType(value, expectedType, name) {
    if (value == null) {
      throw new Error(`${name} must be ${expectedType}, got null`);
    }

    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== expectedType) {
      throw new Error(`${name} must be ${expectedType}, got ${actualType}`);
    }
  }

  static validateFunction(fn, name) {
    if (typeof fn !== 'function') {
      throw new Error(`${name || 'Function'} must be function, got ${typeof fn}`);
    }
  }

  static validateInstance(obj, expectedClass, name) {
    if (!(obj instanceof expectedClass)) {
      throw new Error(`${name} must be instance of ${expectedClass.name}`);
    }
  }

  static validateNotFound(item, type, name) {
    if (item == null) {
      throw new Error(`${type} "${name}" not found.`);
    }
  }

  static validateCondition(condition, message = 'Validation condition not met') {
    if (!condition) {
      throw new Error(message);
    }
  }

  static validateComponentAvailable(component, componentName) {
    if (!component) {
      throw new Error(`${componentName} not available`);
    }
  }

  static validateProvider(provider, providerId) {
    if (!provider) {
      throw new Error(`Provider "${providerId}" not found`);
    }
  }

  static validateStrategy(strategy, strategyId) {
    if (!strategy) {
      throw new Error(`Strategy "${strategyId}" not found`);
    }
    if (typeof strategy.execute !== 'function') {
      throw new Error(`Strategy ${strategyId} must have an execute() method`);
    }
  }

  static validatePlanner(planner, plannerId) {
    if (!planner) {
      throw new Error(`Planner "${plannerId}" not found`);
    }
    if (typeof planner.plan !== 'function') {
      throw new Error(`Planner ${plannerId} must have a plan() method`);
    }
  }

  static validateExecutor(executor, executorId) {
    if (!executor) {
      throw new Error(`Executor "${executorId}" not found`);
    }
    if (typeof executor.execute !== 'function') {
      throw new Error(`Executor ${executorId} must have an execute() method`);
    }
  }
}