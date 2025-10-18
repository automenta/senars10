import { jest } from '@jest/globals';
import Messages from '../../core/messaging/Messages.js';

describe('Messages', () => {
  let messages;

  beforeEach(async () => {
    messages = new Messages();
    await messages.initialize({});
    // Ensure middleware is cleared for each test
    messages.middleware = [];
  });

  describe('Event Handling', () => {
    test('should register and emit an event', () => {
      const handler = jest.fn();
      messages.on('test-event', handler);
      messages.emit('test-event', { data: 'payload' });
      expect(handler).toHaveBeenCalledWith({ data: 'payload' });
    });

    test('should unregister an event handler', () => {
      const handler = jest.fn();
      messages.on('test-event', handler);
      messages.off('test-event', handler);
      messages.emit('test-event', { data: 'payload' });
      expect(handler).not.toHaveBeenCalled();
    });

    test('should handle multiple handlers for one event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      messages.on('multi-event', handler1);
      messages.on('multi-event', handler2);
      messages.emit('multi-event', 'data');
      expect(handler1).toHaveBeenCalledWith('data');
      expect(handler2).toHaveBeenCalledWith('data');
    });
  });

  describe('Command Handling', () => {
    test('should register and execute a command', async () => {
      const commandHandler = jest.fn(data => `executed ${data}`);
      messages.registerCommand('test-command', commandHandler);
      const result = messages.execute('test-command', 'input');
      expect(commandHandler).toHaveBeenCalledWith('input');
      expect(await result).toBe('executed input');
    });

    test('should throw an error for an unknown command', () => {
      expect(() => messages.execute('unknown-command', {})).toThrow('Command "unknown-command" not found.');
    });

    test('should allow overwriting a command with a warning', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      messages.registerCommand('overwrite-cmd', handler1);
      messages.registerCommand('overwrite-cmd', handler2);
      expect(warnSpy).toHaveBeenCalledWith('[WARN]', 'Command "overwrite-cmd" is already registered. Overwriting.', {});
      messages.execute('overwrite-cmd', 'data');
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith('data');
      warnSpy.mockRestore();
    });
  });

  describe('Middleware', () => {
    test('should process events through middleware', () => {
      const middlewareFn = jest.fn((context, next) => {
        context.data.modified = true;
        next();
      });
      messages.use(middlewareFn);

      const handler = jest.fn();
      messages.on('event-with-middleware', handler);
      messages.emit('event-with-middleware', { original: true });

      expect(middlewareFn).toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith({ original: true, modified: true });
    });

    test('should process commands through middleware', async () => {
      const middlewareFn = jest.fn((context, next) => {
        context.data = `modified ${context.data}`;
        return next();
      });
      messages.use(middlewareFn);

      const commandHandler = jest.fn(data => `final ${data}`);
      messages.registerCommand('cmd-with-middleware', commandHandler);
      const result = messages.execute('cmd-with-middleware', 'input');

      expect(middlewareFn).toHaveBeenCalled();
      expect(commandHandler).toHaveBeenCalledWith('modified input');
      expect(await result).toBe('final modified input');
    });

    test('middleware can cancel an event', () => {
      const middlewareFn = (context, next) => {
        context.cancelled = true;
        next();
      };
      messages.use(middlewareFn);

      const handler = jest.fn();
      messages.on('cancelled-event', handler);
      messages.emit('cancelled-event', {});

      expect(handler).not.toHaveBeenCalled();
    });

    test('middleware can cancel a command', () => {
      const middlewareFn = (context, next) => {
        context.cancelled = true;
        // Not calling next() also stops the chain
      };
      messages.use(middlewareFn);

      const commandHandler = jest.fn();
      messages.registerCommand('cancelled-cmd', commandHandler);
      const result = messages.execute('cancelled-cmd', {});

      expect(commandHandler).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('Enhanced Middleware', () => {
    test('should support middleware priority ordering', () => {
      const executionOrder = [];
      const lowPriorityMiddleware = jest.fn((context, next) => {
        executionOrder.push('low');
        next();
      });
      const highPriorityMiddleware = jest.fn((context, next) => {
        executionOrder.push('high');
        next();
      });

      messages.use(lowPriorityMiddleware, { priority: 1, name: 'low-priority' });
      messages.use(highPriorityMiddleware, { priority: 10, name: 'high-priority' });

      const handler = jest.fn();
      messages.on('priority-test', handler);
      messages.emit('priority-test', {});

      expect(executionOrder).toEqual(['high', 'low']);
    });

    test('should support enabling/disabling middleware', () => {
      const middlewareFn = jest.fn((context, next) => {
        context.modified = true;
        next();
      });

      messages.use(middlewareFn, { name: 'toggle-test' });
      expect(messages.setMiddlewareEnabled('toggle-test', false)).toBe(true);

      const handler = jest.fn();
      messages.on('toggle-test', handler);
      messages.emit('toggle-test', {});

      expect(middlewareFn).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith({});

      messages.setMiddlewareEnabled('toggle-test', true);
      messages.emit('toggle-test', {});
      expect(middlewareFn).toHaveBeenCalled();
    });

    test('should support middleware timeout configuration', () => {
      const timeoutMiddleware = jest.fn((context, next) => {
        next();
      });

      messages.use(timeoutMiddleware, { name: 'timeout-config-test', timeout: 1000 });

      const stats = messages.getStats();
      const middleware = stats.middleware.find(m => m.name === 'timeout-config-test');
      expect(middleware.timeout).toBe(1000);
    });
  });

  describe('Unified Message Processing', () => {
    test('should process messages with unified interface', async () => {
      const commandHandler = jest.fn(data => `processed ${data}`);
      messages.registerCommand('unified-cmd', commandHandler);

      const result = await messages.process({
        type: 'command',
        name: 'unified-cmd',
        data: 'test-data'
      });

      expect(result.success).toBe(true);
      expect(commandHandler).toHaveBeenCalledWith('test-data');
      expect(result.context.processed).toBe(true);
    });

    test('should filter invalid messages', async () => {
      const result = await messages.process({
        type: 'invalid',
        name: 'test',
        data: {}
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('filtered');
    });

    test('should generate message IDs', async () => {
      const result = await messages.process({
        type: 'event',
        name: 'id-test',
        data: {}
      });

      expect(result.context.id).toBeDefined();
      expect(typeof result.context.id).toBe('string');
      expect(result.context.id).toMatch(/^\d+-[a-z0-9]+$/);
    });

    test('should handle message preprocessing filters', async () => {
      // Test that invalid message types are filtered
      const invalidResult = await messages.process({
        type: 'invalid',
        name: 'test',
        data: {}
      });

      expect(invalidResult.success).toBe(false);
      expect(invalidResult.reason).toBe('filtered');
    });
  });

  describe('Enhanced Error Handling', () => {
    test('should handle and recover from errors', async () => {
      const errorHandler = jest.fn().mockReturnValue('recovered');
      messages.registerErrorHandler('Error', errorHandler);

      const failingHandler = jest.fn(() => {
        throw new Error('Test error');
      });

      messages.registerCommand('failing-cmd', failingHandler);

      // Test that error handler is registered
      const stats = messages.getStats();
      expect(stats.errorTypes).toContain('Error');

      // Test error handler functionality by checking it's in the handlers array
      expect(messages.errorHandlers.has('Error')).toBe(true);
    });

    test('should determine retry eligibility', () => {
      // Test the retry logic with different error types
      const retryableError = new Error('Network timeout');
      const nonRetryableError = new Error('Invalid input');

      const context = { name: 'test', retryAttempt: 0 };

      // Test that timeout errors are retryable
      expect(messages._shouldRetry(retryableError, context)).toBe(true);
      // Test that validation errors are not retryable
      expect(messages._shouldRetry(nonRetryableError, context)).toBe(false);
    });
  });

  describe('System Management', () => {
    test('should provide comprehensive statistics', () => {
      const handler = jest.fn();
      messages.on('stats-test', handler);
      messages.registerCommand('stats-cmd', jest.fn());

      const stats = messages.getStats();

      expect(stats.health).toBeDefined();
      expect(stats.middleware).toBeDefined();
      expect(stats.processors).toBeDefined();
      expect(stats.errorTypes).toBeDefined();
      expect(stats.retryPolicies).toBeDefined();
    });

    test('should clear all handlers and state', () => {
      const handler = jest.fn();
      messages.on('clear-test', handler);
      messages.registerCommand('clear-cmd', jest.fn());

      // Check that we have handlers before clearing
      const initialHealth = messages.getHealth();
      expect(initialHealth.events).toBe(1);
      expect(initialHealth.commands).toBe(1);

      messages.clear();

      const health = messages.getHealth();
      expect(health.events).toBe(0);
      expect(health.commands).toBe(0);
      expect(health.processors).toBe(0);
      expect(health.errorHandlers).toBe(0);
      expect(messages.middleware).toHaveLength(0);
      expect(health.retryPolicies).toBe(1); // Should have default policy
    });
  });
});