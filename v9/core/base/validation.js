import { Logger, IdGenerator, ObjectUtils } from './utilities.js';
import { DEFAULTS, RETRYABLE_ERRORS } from './constants.js';

class Validation {
  static requireProps(obj, props) {
    if (!obj) throw new Error('Object is required');
    if (!Array.isArray(props)) throw new Error('Props must be an array');

    const missingProps = props.filter(prop => obj[prop] === undefined);
    if (missingProps.length > 0) {
      // For backward compatibility with existing tests, only return the first missing prop
      // like the original implementation did
      throw new Error(`${missingProps[0]} is required`);
    }
  }

  static validateType(value, expectedType, name) {
    // Handle special 'any' type and 'null' checking
    if (expectedType === 'any' || (value === null && expectedType === 'null')) return;

    // For null values, use a different check
    if (value === null) {
      throw new Error(`${name} must be ${expectedType}, got null`);
    }

    const actualType = typeof value;
    if (actualType !== expectedType) {
      throw new Error(`${name} must be ${expectedType}, got ${actualType}`);
    }
  }

  static validateFunction(fn, name) {
    if (typeof fn !== 'function') {
      throw new Error(`${name || 'Function'} must be function, got ${typeof fn}`);
    }
  }

  static validateTool(tool) {
    if (!tool || !tool.id) {
      this.requireProps(tool, ['id']);
    } else {
      // For backward compatibility - only validate execute if id is provided
      if (!tool.execute) {
        throw new Error('tool.execute must be function, got undefined');
      }
      this.validateFunction(tool.execute, 'tool.execute');
    }
  }

  static validatePlugin(plugin) {
    if (!plugin || !plugin.id) {
      this.requireProps(plugin, ['id']);
    } else {
      // For backward compatibility - only validate install if id is provided
      if (!plugin.install) {
        throw new Error('plugin.install must be function, got undefined');
      }
      this.validateFunction(plugin.install, 'plugin.install');
    }
  }

  static ensureExists(item, name, type = 'Item') {
    if (item === null || item === undefined) {
      throw new Error(`${type} "${name}" not found.`);
    }
    return item;
  }

  static ensureCondition(condition, message) {
    if (!condition) {
      throw new Error(message || 'Validation condition not met');
    }
  }

  static ensure(condition, message = 'Validation failed') {
    return this.ensureCondition(condition, message);
  }
}

class ErrorHandler {
  static handle(error, context = '', messagesComponent = null) {
    const errorInfo = {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      errorId: this._generateErrorId()
    };

    if (messagesComponent) {
      messagesComponent.emit('error:occurred', {
        error: errorInfo.error,
        errorId: errorInfo.errorId,
        context,
        stack: errorInfo.stack,
        timestamp: errorInfo.timestamp
      });
    } else {
      Logger.error('Handled error', errorInfo);
    }

    return errorInfo;
  }

  static async withErrorHandling(fn, context = '', messagesComponent = null) {
    try {
      return await fn();
    } catch (error) {
      return this.handle(error, context, messagesComponent);
    }
  }

  static createEnhanced(error, context = {}) {
    const enhanced = new Error(`${context.type || 'Error'}: ${error.message}`);
    enhanced.originalError = error;
    enhanced.context = context;
    enhanced.timestamp = new Date().toISOString();
    enhanced.errorId = this._generateErrorId();
    enhanced.name = error.name || 'Error';
    return enhanced;
  }

  static _generateErrorId() {
    return IdGenerator.generateErrorId();
  }


  static createErrorBoundary(componentName, messagesComponent = null) {
    return {
      wrap: (fn) => async (...args) => {
        try {
          return await fn.apply(this, args);
        } catch (error) {
          const enhancedError = this.createEnhanced(error, {
            component: componentName,
            type: 'ComponentError'
          });
          return this.handle(enhancedError, componentName, messagesComponent);
        }
      },

      wrapMethod: (obj, methodName) => {
        const originalMethod = obj[methodName];
        if (typeof originalMethod !== 'function') {
          throw new Error(`${methodName} is not a function`);
        }

        obj[methodName] = async function(...args) {
          try {
            return await originalMethod.apply(this, args);
          } catch (error) {
            const enhancedError = ErrorHandler.createEnhanced(error, {
              component: componentName,
              method: methodName,
              type: 'MethodError'
            });
            return ErrorHandler.handle(enhancedError, `${componentName}.${methodName}`, messagesComponent);
          }
        };
      }
    };
  }
}

class Retry {
  static async execute(fn, options = {}) {
    const {
      maxRetries = DEFAULTS.MAX_RETRIES,
      retryDelay = DEFAULTS.RETRY_DELAY,
      backoffMultiplier = DEFAULTS.BACKOFF_MULTIPLIER,
      retryableErrors = RETRYABLE_ERRORS
    } = options;
    let lastError;

    if (maxRetries === 0) return fn();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        if (attempt > 0) {
          Logger.debug(`Operation succeeded after ${attempt} retries`, { fn: fn.name || 'anonymous' });
        }
        return result;
      } catch (error) {
        lastError = error;

        // Check if we should retry based on the error type
        const shouldRetry = attempt < maxRetries && (
          retryableErrors.some(retryable => error.name?.includes(retryable) || error.message?.includes(retryable)) ||
          retryableErrors.includes('Error') // Default to retry on any error if 'Error' is in the list
        );

        if (shouldRetry) {
          const delay = IdGenerator.calculateBackoffDelay(retryDelay, attempt, backoffMultiplier);
          Logger.debug(`Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, { error: error.message });
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Don't retry, break out of the loop
          break;
        }
      }
    }

    throw lastError;
  }

  static withHandler(errorHandler) {
    return {
      async execute(fn, options = {}) {
        try {
          return await Retry.execute(fn, options);
        } catch (error) {
          return errorHandler(error);
        }
      }
    };
  }

  static async withErrorHandling(fn, context = '', messagesComponent = null) {
    try {
      return await fn();
    } catch (error) {
      const errorInfo = {
        error: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
        errorId: this._generateErrorId()
      };

      if (messagesComponent) {
        messagesComponent.emit('error:occurred', {
          error: errorInfo.error,
          errorId: errorInfo.errorId,
          context,
          stack: errorInfo.stack,
          timestamp: errorInfo.timestamp
        });
      } else {
        Logger.error('Handled error', errorInfo);
      }

      throw error;
    }
  }
}

export { Validation, ErrorHandler, Retry };