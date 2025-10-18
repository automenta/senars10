import Component from '../base/Component.js';
import { Storage } from '../base/collections.js';
import { Retry } from '../base/validation.js';
import { IdGenerator, Logger } from '../base/utilities.js';
import { RETRYABLE_ERRORS, DEFAULTS } from '../base/constants.js';

class Messages extends Component {
  constructor() {
    super();
    this.events = new Storage();
    this.commands = new Storage();
    this.middleware = [];
    this.processors = new Storage();
    this.errorHandlers = new Storage();
    this.retryPolicies = new Storage();
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.events.clear();
    this.commands.clear();
    this.middleware = [];
    this.processors.clear();
    this.errorHandlers.clear();
    this.retryPolicies.clear();

    this.retryPolicies.set('default', {
      maxRetries: config.maxRetries ?? DEFAULTS.MAX_RETRIES,
      retryDelay: config.retryDelay ?? DEFAULTS.RETRY_DELAY,
      backoffMultiplier: DEFAULTS.BACKOFF_MULTIPLIER
    });
  }

  use(middlewareFn, options = {}) {
    if (typeof middlewareFn !== 'function') {
      throw new Error('Middleware must be a function');
    }

    const middleware = {
      fn: middlewareFn,
      priority: options.priority ?? 0,
      name: options.name || `middleware_${this.middleware.length}`,
      enabled: options.enabled !== false,
      timeout: options.timeout ?? DEFAULTS.MIDDLEWARE_TIMEOUT
    };

    this.middleware.push(middleware);
    this.middleware.sort((a, b) => b.priority - a.priority);
  }

  // Remove middleware by name
  removeMiddleware(name) {
    const index = this.middleware.findIndex(m => m.name === name);
    if (index > -1) {
      this.middleware.splice(index, 1);
      return true;
    }
    return false;
  }

  // Enable/disable middleware by name
  setMiddlewareEnabled(name, enabled) {
    const middleware = this.middleware.find(m => m.name === name);
    if (middleware) {
      middleware.enabled = !!enabled;
      return true;
    }
    return false;
  }

  on(event, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Event handler must be a function');
    }

    const handlers = this.events.get(event) || [];
    handlers.push(handler);
    this.events.set(event, handlers);
  }

  off(event, handler) {
    const handlers = this.events.get(event);
    if (!handlers) return;

    const filtered = handlers.filter(h => h !== handler);
    if (filtered.length > 0) {
      this.events.set(event, filtered);
    } else {
      this.events.delete(event);
    }
  }

  emit(event, data) {
    if (!event) {
      Logger.warn('Attempted to emit an event without a name');
      return;
    }

    const context = {
      type: 'event',
      name: event,
      data,
      cancelled: false,
      timestamp: Date.now()
    };

    this._executeMiddleware(context, (ctx) => {
      const eventHandlers = this.events.get(ctx.name);
      if (eventHandlers) {
        // Execute handlers in parallel but catch individual errors
        for (const handler of eventHandlers) {
          try {
            handler(ctx.data);
          } catch (error) {
            Logger.error(`Error in event handler for "${ctx.name}":`, error);
          }
        }
      }
    });
  }

  registerCommand(command, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Command handler must be a function');
    }

    if (this.commands.has(command)) {
      Logger.warn(`Command "${command}" is already registered. Overwriting.`);
    }
    this.commands.set(command, handler);
  }

  /**
   * Unified register method that can register both commands and events
   */
  register(name, handler, options = {}) {
    const { type = 'command', async = false } = options;

    if (type === 'command' || type === 'cmd') {
      this.registerCommand(name, handler);
    } else if (type === 'event' || type === 'evt') {
      this.on(name, handler);
    } else if (type === 'both' || type === 'unified') {
      // Register both command and event handlers to the same function
      this.registerCommand(name, handler);
      this.on(name, handler);
    } else {
      throw new Error(`Invalid registration type: ${type}. Use 'command', 'event', or 'both'.`);
    }
  }

  /**
   * Unified dispatch method that can handle both commands and events
   */
  dispatch(name, data, options = {}) {
    const { type = 'auto', source = 'system' } = options;

    if (type === 'command' || type === 'cmd') {
      return this.execute(name, data);
    } else if (type === 'event' || type === 'evt') {
      this.emit(name, data);
      return Promise.resolve(true);
    } else if (type === 'auto') {
      // Auto-detect: if there's a command handler, execute as command, otherwise emit as event
      if (this.commands.has(name)) {
        return this.execute(name, data);
      } else {
        this.emit(name, data);
        return Promise.resolve(true);
      }
    } else if (type === 'both') {
      // Execute as command and emit as event
      const commandResult = this.execute(name, data).catch(err => {
        Logger.error(`Command execution failed for "${name}":`, err);
        return null;
      });

      this.emit(name, data);

      return Promise.all([commandResult]);
    } else {
      throw new Error(`Invalid dispatch type: ${type}. Use 'command', 'event', 'auto', or 'both'.`);
    }
  }

  execute(command, data) {
    if (!command) {
      throw new Error('Command name is required');
    }

    // Check if command is circuit broken
    if (this._isCircuitBroken(command)) {
      const status = this.getCircuitBreakerStatus(command);
      const error = new Error(`Command "${command}" is temporarily unavailable due to circuit breaker`);
      error.code = 'CIRCUIT_BREAKER_ACTIVE';
      error.retryAfter = status.timeRemaining;
      throw error;
    }

    const handler = this.commands.get(command);
    if (!handler) {
      throw new Error(`Command "${command}" not found.`);
    }

    const context = {
      type: 'command',
      name: command,
      data,
      cancelled: false,
      timestamp: Date.now()
    };

    const executeWithRetry = (ctx) => {
      const policy = this.retryPolicies.get(command) || this.retryPolicies.get('default');
      if (policy.maxRetries === 0) {
        return handler(ctx.data);
      }
      return Retry.execute(() => handler(ctx.data), policy);
    };

    return this._executeMiddleware(context, executeWithRetry);
  }

  registerProcessor(name, processor, options = {}) {
    if (typeof processor !== 'function') {
      throw new Error('Processor must be a function');
    }

    const { events = [], commands = [], priority = 0, filter } = options;

    this.processors.set(name, {
      processor,
      events: new Set(events),
      commands: new Set(commands),
      priority,
      filter, // Filter function to determine if the processor should handle a message
      registeredAt: new Date()
    });
  }

  async process(message, options = {}) {
    const { type, name, data, metadata = {} } = message;
    const { skipMiddleware = false, timeout = DEFAULTS.MESSAGE_TIMEOUT } = options;

    // Validate message structure
    if (!type || !name) {
      return {
        success: false,
        reason: 'invalid_message',
        error: 'Message must have type and name properties',
        context: { type, name }
      };
    }

    const context = {
      type,
      name,
      data,
      metadata,
      timestamp: Date.now(),
      id: metadata.id || this._generateId(),
      processed: false,
      cancelled: false,
      results: []
    };

    if (!this._applyPreprocessingFilters(context)) {
      return { success: false, reason: 'filtered', context };
    }

    if (!skipMiddleware && this.middleware.length > 0) {
      try {
        await this._executeMiddlewareAsync(context, async (ctx) => {
          await this._processMessageCore(ctx);
          ctx.processed = true;
        }, timeout);
      } catch (error) {
        return this._handleProcessingError(error, context);
      }
    } else {
      await this._processMessageCore(context);
      context.processed = true;
    }

    return {
      success: !context.cancelled,
      context,
      results: context.results
    };
  }

  async _processMessageCore(context) {
    if (context.type === 'command') {
      const result = await this.execute(context.name, context.data);
      context.results.push({ type: 'command_result', data: result });
    } else if (context.type === 'event') {
      this.emit(context.name, context.data);
      context.results.push({ type: 'event_emitted', data: true });
    } else {
      throw new Error(`Unknown message type: ${context.type}`);
    }
  }

  _applyPreprocessingFilters(context) {
    if (!['command', 'event'].includes(context.type)) {
      return false;
    }

    if (!context.name || typeof context.name !== 'string') {
      return false;
    }

    // Apply processor-specific filters
    for (const [name, processor] of this.processors.entries()) {
      if (processor.filter && typeof processor.filter === 'function') {
        try {
          if (!processor.filter(context)) {
            return false;
          }
        } catch (filterError) {
          Logger.error(`Filter error in processor "${name}":`, filterError);
          return false;
        }
      }
    }

    return true;
  }

  // Generate unique message ID
  _generateId() {
    return IdGenerator.generate();
  }

  registerErrorHandler(errorType, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Error handler must be a function');
    }

    if (!this.errorHandlers.has(errorType)) {
      this.errorHandlers.set(errorType, []);
    }
    this.errorHandlers.get(errorType).push(handler);
  }

  setRetryPolicy(operation, policy) {
    if (!operation || !policy) {
      throw new Error('Operation and policy are required for retry policy');
    }

    this.retryPolicies.set(operation, {
      maxRetries: policy.maxRetries ?? DEFAULTS.MAX_RETRIES,
      retryDelay: policy.retryDelay ?? DEFAULTS.RETRY_DELAY,
      backoffMultiplier: policy.backoffMultiplier ?? DEFAULTS.BACKOFF_MULTIPLIER
    });
  }

  getHealth() {
    return {
      events: this.events.size(),
      commands: this.commands.size(),
      processors: this.processors.size(),
      middleware: this.middleware.length,
      errorHandlers: this.errorHandlers.size(),
      retryPolicies: this.retryPolicies.size(),
      isHealthy: this.commands.size() > 0 || this.events.size() > 0 || this.middleware.length > 0
    };
  }

  _executeMiddleware(context, final) {
    if (this.middleware.length === 0) {
      return final(context);
    }

    let index = -1;
    const dispatch = (i) => {
      if (i <= index) throw new Error('next() called multiple times');
      index = i;

      if (context.cancelled) return;

      const middleware = this.middleware[i];
      if (i === this.middleware.length) return final(context);

      if (!middleware || !middleware.enabled) return dispatch(i + 1);

      try {
        return middleware.fn(context, () => dispatch(i + 1));
      } catch (err) {
        return this._handleError(err, context, () => dispatch(i + 1));
      }
    };

    return dispatch(0);
  }

  async _executeMiddlewareAsync(context, final, timeout = DEFAULTS.MESSAGE_TIMEOUT) {
    if (this.middleware.length === 0) {
      return await final(context);
    }

    let index = -1;

    const dispatch = async (i) => {
      if (i <= index) {
        throw new Error('next() called multiple times');
      }
      index = i;

      if (context.cancelled) return;

      const middleware = this.middleware[i];
      if (i === this.middleware.length) {
        // Apply timeout to the final handler
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Final handler timed out')), timeout)
        );

        return Promise.race([final(context), timeoutPromise]);
      }

      if (!middleware || !middleware.enabled) {
        return dispatch(i + 1);
      }

      // Apply timeout to each middleware step
      const executeWithTimeout = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Middleware ${middleware.name} timed out after ${middleware.timeout}ms`));
        }, middleware.timeout);

        Promise.resolve(middleware.fn(context, () => dispatch(i + 1)))
          .then(result => {
            clearTimeout(timeoutId);
            resolve(result);
          })
          .catch(error => {
            clearTimeout(timeoutId);
            reject(error);
          });
      });

      try {
        return await executeWithTimeout;
      } catch (err) {
        return this._handleError(err, context, () => dispatch(i + 1));
      }
    };

    return dispatch(0);
  }

  _executeWithRetry(fn, data, type, name) {
    const policy = this.retryPolicies.get(name) || this.retryPolicies.get('default');

    return Retry.execute(() => fn(data), policy).catch(error =>
      this._handleError(error, { type, name, data }));
  }

  _handleError(error, context, retryFn) {
    const errorType = error.constructor?.name || 'Error';
    const errorId = this._generateId();

    // Enhanced error context
    const errorContext = {
      ...context,
      errorId,
      errorType,
      originalError: error,
      timestamp: Date.now(),
      retryAttempt: context.retryAttempt || 0,
      canRetry: !!retryFn,
      retryCount: context.retryCount || 0
    };

    // Log error for debugging
    Logger.error(`[Messages:${errorId}] Error in ${context.type} "${context.name}"`, {
      error: error.message,
      stack: error.stack,
      type: context.type,
      name: context.name,
      timestamp: context.timestamp,
      retryAttempt: context.retryAttempt || 0
    });

    // Emit error event for other components to handle
    this.emit('error:occurred', {
      errorId,
      errorType,
      message: error.message,
      context: {
        type: context.type,
        name: context.name,
        data: context.data,
        timestamp: context.timestamp
      },
      timestamp: Date.now()
    });

    // Try error handlers in sequence
    const handleWithHandlers = (handlers) => {
      if (!handlers) return;

      for (const handler of handlers) {
        try {
          const result = handler(error, errorContext, retryFn);
          if (result !== undefined) {
            // Emit success event if handler recovered
            this.emit('error:recovered', {
              errorId,
              handlerUsed: handler.name || 'anonymous',
              timestamp: Date.now()
            });
            return result;
          }
        } catch (handlerError) {
          Logger.error(`[Messages:${errorId}] Error handler failed`, handlerError);
          // Don't let error handler failures prevent other handlers from running
        }
      }
    };

    // Try specific error handlers first
    if (this.errorHandlers.has(errorType)) {
      const result = handleWithHandlers(this.errorHandlers.get(errorType));
      if (result !== undefined) return result;
    }

    // Try generic error handlers
    if (this.errorHandlers.has('Error')) {
      const result = handleWithHandlers(this.errorHandlers.get('Error'));
      if (result !== undefined) return result;
    }

    // Default recovery strategies
    if (retryFn && this._shouldRetry(error, errorContext)) {
      Logger.warn(`[Messages:${errorId}] Attempting retry for ${context.type} "${context.name}"`);

      // Update retry count in context
      const updatedContext = {
        ...context,
        retryAttempt: (context.retryAttempt || 0) + 1,
        retryCount: (context.retryCount || 0) + 1
      };

      return retryFn(updatedContext);
    }

    // If no recovery possible, try fallback strategies
    const fallbackResult = this._tryFallbackStrategies(error, errorContext);
    if (fallbackResult !== undefined) {
      return fallbackResult;
    }

    // If no recovery is possible, create a safe error response
    const finalError = new Error(`Unhandled error in ${context.type} "${context.name}": ${error.message}`);
    finalError.originalError = error;
    finalError.errorId = errorId;
    finalError.context = errorContext;

    // Create a safe response instead of throwing in some cases
    if (context.type === 'event') {
      // For events, we typically don't want to throw errors that stop execution
      Logger.warn(`[Messages:${errorId}] Event handler failed but continuing: ${context.name}`);
      return null;
    }

    throw finalError;
  }

  /**
   * Try various fallback strategies when normal error handling fails
   */
  _tryFallbackStrategies(error, errorContext) {
    // Strategy 1: Fallback to a default command handler
    const fallbackCommand = `${errorContext.name}:fallback`;
    if (this.commands.has(fallbackCommand)) {
      try {
        return this.commands.get(fallbackCommand)(errorContext.data);
      } catch (fallbackError) {
        Logger.warn(`Fallback command "${fallbackCommand}" also failed`, fallbackError);
      }
    }

    // Strategy 2: Use a default value provider
    const defaultValueProvider = `${errorContext.name}:default`;
    if (this.commands.has(defaultValueProvider)) {
      try {
        return this.commands.get(defaultValueProvider)(errorContext.data);
      } catch (defaultError) {
        Logger.warn(`Default provider "${defaultValueProvider}" failed`, defaultError);
      }
    }

    // Strategy 3: Circuit breaker - temporarily disable failing handlers
    if (this._shouldApplyCircuitBreaker(error, errorContext)) {
      this._applyCircuitBreaker(errorContext.name);
      return this._getCircuitBreakerResponse(errorContext);
    }

    return undefined;
  }

  /**
   * Determine if we should apply a circuit breaker for this error
   */
  _shouldApplyCircuitBreaker(error, errorContext) {
    // Check if this error is occurring repeatedly for the same command/event
    if (!this.errorTracking) this.errorTracking = new Map();

    const key = `${errorContext.type}:${errorContext.name}`;
    const errorInfo = this.errorTracking.get(key) || { count: 0, lastError: null };

    const now = Date.now();
    const errorWindow = 300000; // 5 minutes

    // Reset count if last error was outside the window
    if (errorInfo.lastError && (now - errorInfo.lastError) > errorWindow) {
      errorInfo.count = 1;
    } else {
      errorInfo.count++;
    }

    errorInfo.lastError = now;
    this.errorTracking.set(key, errorInfo);

    // Apply circuit breaker if too many errors in time window
    const maxErrors = this.config.circuitBreakerMaxErrors || 5;
    return errorInfo.count >= maxErrors;
  }

  /**
   * Apply circuit breaker to temporarily disable a failing command/event
   */
  _applyCircuitBreaker(name) {
    if (!this.circuitBreakers) this.circuitBreakers = new Map();

    const timeout = this.config.circuitBreakerTimeout || 60000; // 1 minute default
    const timeoutId = setTimeout(() => {
      this.circuitBreakers.delete(name);
      Logger.info(`Circuit breaker reset for "${name}"`);
    }, timeout);

    this.circuitBreakers.set(name, {
      timeoutId,
      disabledAt: Date.now(),
      timeout
    });

    Logger.warn(`Circuit breaker activated for "${name}", disabled for ${timeout}ms`);
  }

  /**
   * Get a response when circuit breaker is active
   */
  _getCircuitBreakerResponse(errorContext) {
    return {
      error: 'Circuit breaker active - temporarily unavailable',
      code: 'CIRCUIT_BREAKER_ACTIVE',
      command: errorContext.name,
      timestamp: Date.now(),
      retryAfter: this.config.circuitBreakerTimeout || 60000
    };
  }

  /**
   * Check if a command/event is currently circuit broken
   */
  _isCircuitBroken(name) {
    if (!this.circuitBreakers) return false;
    return this.circuitBreakers.has(name);
  }

  // Determine if an error should trigger a retry
  _shouldRetry(error, context) {
    // Check if this command/event is currently circuit broken
    if (this._isCircuitBroken(context.name)) {
      return false; // Don't retry if circuit broken
    }

    const retryableErrors = RETRYABLE_ERRORS;

    const errorType = error.constructor?.name || 'Error';
    const isRetryableType = retryableErrors.includes(errorType) ||
                           error.message?.toLowerCase().includes('timeout') ||
                           error.message?.toLowerCase().includes('network') ||
                           error.message?.toLowerCase().includes('temporary') ||
                           error.message?.toLowerCase().includes('retry');

    const maxRetries = this.retryPolicies.get(context.name)?.maxRetries ||
                      this.retryPolicies.get('default')?.maxRetries || DEFAULTS.MAX_RETRIES;

    // Check retry attempt count
    const retryCount = context.retryAttempt || 0;
    return isRetryableType && retryCount < maxRetries;
  }

  /**
   * Register a circuit breaker reset for a specific command/event
   */
  resetCircuitBreaker(name) {
    if (!this.circuitBreakers) return false;

    const breaker = this.circuitBreakers.get(name);
    if (breaker) {
      clearTimeout(breaker.timeoutId);
      this.circuitBreakers.delete(name);
      Logger.info(`Circuit breaker manually reset for "${name}"`);
      return true;
    }
    return false;
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(name) {
    if (!this.circuitBreakers || !name) {
      return Array.from(this.circuitBreakers?.entries() || []).map(([cmd, info]) => ({
        command: cmd,
        disabledAt: info.disabledAt,
        timeRemaining: Math.max(0, info.timeout - (Date.now() - info.disabledAt))
      }));
    }

    const breaker = this.circuitBreakers.get(name);
    if (!breaker) {
      return { active: false, command: name };
    }

    return {
      active: true,
      command: name,
      disabledAt: breaker.disabledAt,
      timeRemaining: Math.max(0, breaker.timeout - (Date.now() - breaker.disabledAt))
    };
  }

  _handleProcessingError(error, context) {
    const errorResult = {
      success: false,
      error: error.message,
      errorId: error.errorId || this._generateId(),
      context: {
        type: context.type,
        name: context.name,
        timestamp: context.timestamp,
        cancelled: context.cancelled
      }
    };

    // Log the processing error
    Logger.error(`[Messages:${errorResult.errorId}] Processing failed`, {
      error: error.message,
      context: errorResult.context
    });

    return errorResult;
  }

  /**
   * Subscribe to a message (either command or event) with a single interface
   */
  subscribe(name, handler, options = {}) {
    const { type = 'auto', filter = null } = options;

    if (type === 'event' || (type === 'auto' && !this.commands.has(name))) {
      // Subscribe as an event listener
      this.on(name, (data) => {
        if (filter && typeof filter === 'function') {
          if (filter(data)) {
            handler(data);
          }
        } else {
          handler(data);
        }
      });
    } else if (type === 'command' || type === 'auto') {
      // Register as a command handler (this creates a new command that may call the original)
      const originalHandler = this.commands.get(name);
      if (originalHandler) {
        // Wrap the original handler to also call our handler
        this.commands.set(name, (data) => {
          // Call our handler first
          handler(data);
          // Then call the original handler
          return originalHandler(data);
        });
      } else {
        // Register as a new command
        this.registerCommand(name, handler);
      }
    }
  }

  /**
   * Unsubscribe from messages
   */
  unsubscribe(name, handler, options = {}) {
    const { type = 'auto' } = options;

    if (type === 'event' || type === 'auto') {
      this.off(name, handler);
    }
    // For commands, we can't easily remove a specific handler, so we'll log a warning
    if (type === 'command' && this.commands.get(name) === handler) {
      Logger.warn(`Cannot safely remove command handler for "${name}". Commands can only be replaced, not removed.`);
    }
  }

  /**
   * Check if a message name is registered as command or event
   */
  hasRegistration(name, type = 'both') {
    if (type === 'command') {
      return this.commands.has(name);
    } else if (type === 'event') {
      return this.events.has(name) && this.events.get(name).length > 0;
    } else { // 'both'
      return this.commands.has(name) || (this.events.has(name) && this.events.get(name).length > 0);
    }
  }

  // Get comprehensive system statistics
  getStats() {
    return {
      health: this.getHealth(),
      middleware: this.middleware.map(m => ({
        name: m.name,
        priority: m.priority,
        enabled: m.enabled,
        timeout: m.timeout
      })),
      processors: Array.from(this.processors.entries()).map(([name, processor]) => ({
        name,
        events: Array.from(processor.events),
        commands: Array.from(processor.commands),
        priority: processor.priority,
        registeredAt: processor.registeredAt,
        hasFilter: !!processor.filter
      })),
      errorTypes: Array.from(this.errorHandlers.keys()),
      retryPolicies: Array.from(this.retryPolicies.entries()).map(([name, policy]) => ({
        name,
        maxRetries: policy.maxRetries,
        retryDelay: policy.retryDelay,
        backoffMultiplier: policy.backoffMultiplier
      })),
      unified: {
        totalRegistrations: this.commands.size + Array.from(this.events.values()).reduce((sum, handlers) => sum + handlers.length, 0),
        commandCount: this.commands.size,
        eventCount: this.events.size(),
        handlerCount: Array.from(this.events.values()).reduce((sum, handlers) => sum + handlers.length, 0)
      }
    };
  }

  // Clear all handlers and reset state
  clear() {
    this.events.clear();
    this.commands.clear();
    this.middleware.length = 0;
    this.processors.clear();
    this.errorHandlers.clear();
    this.retryPolicies.clear();

    // Reinitialize default retry policy
    this.retryPolicies.set('default', {
      maxRetries: DEFAULTS.MAX_RETRIES,
      retryDelay: DEFAULTS.RETRY_DELAY,
      backoffMultiplier: DEFAULTS.BACKOFF_MULTIPLIER
    });
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default Messages;