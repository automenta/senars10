import { Validation, ErrorHandler } from '../base/validation.js';
import { Logger, ObjectUtils, IdGenerator } from '../base/utilities.js';

/**
 * Common middleware functions for use with Messages.js
 */
export class CommonMiddleware {
  /**
   * Validation middleware - validates message structure and required fields
   */
  static validationMiddleware(requiredFields = [], schema = null) {
    return (context, next) => {
      try {
        // Basic structure validation
        if (!context.type || !context.name) {
          throw new Error('Message missing required fields: type, name');
        }

        // Required fields validation
        if (requiredFields.length > 0 && context.data) {
          Validation.requireProps(context.data, requiredFields);
        }

        // Schema validation if provided
        if (schema && context.data) {
          // Simple schema validation - can be enhanced with a proper schema library
          for (const [field, rules] of Object.entries(schema)) {
            if (context.data[field] !== undefined) {
              if (rules.type && typeof context.data[field] !== rules.type) {
                throw new Error(`Field '${field}' must be of type ${rules.type}`);
              }
              if (rules.required && (context.data[field] === null || context.data[field] === undefined)) {
                throw new Error(`Field '${field}' is required`);
              }
            }
          }
        }

        Logger.debug('Message validation passed', { type: context.type, name: context.name });
        return next();
      } catch (error) {
        Logger.error('Message validation failed', {
          type: context.type,
          name: context.name,
          error: error.message
        });
        context.cancelled = true;
        throw error;
      }
    };
  }

  /**
   * Logging middleware - logs message processing
   */
  static loggingMiddleware(options = {}) {
    const { logLevel = 'debug', includeData = false, prefix = '' } = options;

    return (context, next) => {
      const startTime = Date.now();
      Logger[logLevel](`${prefix}Processing ${context.type}: ${context.name}`, {
        messageId: context.id,
        timestamp: context.timestamp,
        ...(includeData && context.data ? { data: context.data } : {})
      });

      try {
        const result = next();
        const duration = Date.now() - startTime;

        Logger[logLevel](`${prefix}Completed ${context.type}: ${context.name}`, {
          messageId: context.id,
          duration: `${duration}ms`,
          success: true
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        Logger.error(`${prefix}Failed ${context.type}: ${context.name}`, {
          messageId: context.id,
          duration: `${duration}ms`,
          error: error.message
        });

        throw error;
      }
    };
  }

  /**
   * Caching middleware - caches results of expensive operations
   */
  static cachingMiddleware(cache, options = {}) {
    const {
      ttl = 300000, // 5 minutes default
      keyGenerator = (context) => `${context.type}:${context.name}:${JSON.stringify(context.data)}`,
      includeErrors = false
    } = options;

    return async (context, next) => {
      const cacheKey = keyGenerator(context);

      // Check cache first
      const cached = cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < ttl) {
        Logger.debug('Cache hit', { key: cacheKey, type: context.type, name: context.name });
        context.cached = true;
        context.results.push({ type: 'cache_hit', data: cached.result });
        return cached.result;
      }

      Logger.debug('Cache miss', { key: cacheKey, type: context.type, name: context.name });

      try {
        const result = await next();

        // Cache successful results
        cache.set(cacheKey, {
          result,
          timestamp: Date.now()
        });

        Logger.debug('Cached result', { key: cacheKey, type: context.type, name: context.name });
        return result;
      } catch (error) {
        // Optionally cache errors too
        if (includeErrors) {
          cache.set(cacheKey, {
            error: error.message,
            timestamp: Date.now()
          });
        }
        throw error;
      }
    };
  }

  /**
   * Rate limiting middleware - prevents excessive operations
   */
  static rateLimitingMiddleware(options = {}) {
    const {
      windowMs = 60000, // 1 minute window
      maxRequests = 100,
      keyGenerator = (context) => `${context.type}:${context.name}`,
      skipSuccessfulRequests = false
    } = options;

    const requests = new Map();

    return (context, next) => {
      const key = keyGenerator(context);
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old requests
      for (const [reqKey, timestamp] of requests.entries()) {
        if (timestamp < windowStart) {
          requests.delete(reqKey);
        }
      }

      // Count current requests
      const requestCount = Array.from(requests.values()).filter(timestamp => timestamp > windowStart).length;

      if (requestCount >= maxRequests) {
        Logger.warn('Rate limit exceeded', {
          key,
          count: requestCount,
          limit: maxRequests,
          type: context.type,
          name: context.name
        });

        context.cancelled = true;
        throw new Error(`Rate limit exceeded for ${key}. Limit: ${maxRequests} per ${windowMs}ms`);
      }

      // Record this request
      requests.set(`${key}:${now}`, now);

      Logger.debug('Rate limit check passed', {
        key,
        count: requestCount + 1,
        limit: maxRequests,
        type: context.type,
        name: context.name
      });

      return next();
    };
  }

  /**
   * Performance monitoring middleware - tracks operation performance
   */
  static performanceMonitoringMiddleware(options = {}) {
    const {
      slowQueryThreshold = 1000, // ms
      trackMemory = false,
      emitEvents = true,
      eventTarget = null
    } = options;

    return (context, next) => {
      const startTime = Date.now();
      const startMemory = trackMemory ? process.memoryUsage() : null;

      try {
        const result = next();
        const duration = Date.now() - startTime;
        const endMemory = trackMemory ? process.memoryUsage() : null;

        // Log slow operations
        if (duration > slowQueryThreshold) {
          Logger.warn('Slow operation detected', {
            type: context.type,
            name: context.name,
            duration: `${duration}ms`,
            threshold: `${slowQueryThreshold}ms`
          });
        }

        // Emit performance events if enabled
        if (emitEvents && eventTarget) {
          eventTarget.emit('performance:operation', {
            type: context.type,
            name: context.name,
            duration,
            memoryDelta: trackMemory && endMemory ? {
              heapUsed: endMemory.heapUsed - startMemory.heapUsed,
              heapTotal: endMemory.heapTotal - startMemory.heapTotal
            } : null,
            timestamp: new Date()
          });
        }

        Logger.debug('Performance metrics recorded', {
          type: context.type,
          name: context.name,
          duration: `${duration}ms`
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        Logger.error('Performance monitoring error', {
          type: context.type,
          name: context.name,
          duration: `${duration}ms`,
          error: error.message
        });

        throw error;
      }
    };
  }

  /**
   * Retry middleware - handles transient failures
   */
  static retryMiddleware(options = {}) {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      backoffMultiplier = 2,
      retryableErrors = ['NetworkError', 'TimeoutError', 'TemporaryFailure']
    } = options;

    return async (context, next) => {
      let lastError;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await next();

          if (attempt > 0) {
            Logger.debug(`Operation succeeded after ${attempt} retries`, {
              type: context.type,
              name: context.name,
              attempts: attempt + 1
            });
          }

          return result;
        } catch (error) {
          lastError = error;
          const errorType = error.constructor.name || 'Error';

          // Check if error is retryable
          const isRetryable = retryableErrors.includes(errorType) ||
                             error.message?.includes('timeout') ||
                             error.message?.includes('network') ||
                             error.message?.includes('temporary');

          if (attempt < maxRetries && isRetryable) {
            const delay = IdGenerator.calculateBackoffDelay(retryDelay, attempt, backoffMultiplier);

            Logger.warn(`Retrying operation`, {
              type: context.type,
              name: context.name,
              attempt: attempt + 1,
              maxRetries,
              delay: `${delay}ms`,
              error: error.message
            });

            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          // No more retries or error not retryable
          Logger.error(`Operation failed after ${attempt + 1} attempts`, {
            type: context.type,
            name: context.name,
            attempts: attempt + 1,
            error: error.message,
            retryable: isRetryable
          });

          throw error;
        }
      }

      throw lastError;
    };
  }
}

export default CommonMiddleware;