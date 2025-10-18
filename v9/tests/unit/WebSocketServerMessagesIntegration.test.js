import { jest } from '@jest/globals';
import Messages from '../../core/messaging/Messages.js';
import WebSocketServer from '../../core/server/WebSocketServer.js';
import { CommonMiddleware } from '../../core/messaging/Middleware.js';

describe('WebSocketServer Integration with Messages', () => {
  let messages;
  let webSocketServer;
  let mockConfig;

  beforeEach(async () => {
    messages = new Messages();
    webSocketServer = new WebSocketServer();

    mockConfig = {
      port: 8081, // Use different port to avoid conflicts in tests
      heartbeatInterval: 1000
    };

    // Initialize messages component to set up default policies
    await messages.initialize();

    // Set up the core reference for events
    webSocketServer.core = { messages };
  });

  afterEach(async () => {
    if (webSocketServer.isRunning) {
      await webSocketServer.stop();
    }
  });

  test('should initialize with correct configuration', async () => {
    await webSocketServer.initialize(mockConfig);

    expect(webSocketServer.config).toBeDefined();
    expect(webSocketServer.config.port).toBe(8081);
  });

  test('should handle start and stop lifecycle properly', async () => {
    // Test with disabled configuration to ensure it doesn't try to start
    const configWithEnabled = {
      ...mockConfig,
      enabled: false
    };

    await webSocketServer.initialize(configWithEnabled);

    // Start should complete without trying to bind to a real port since it's disabled
    await webSocketServer.start();

    // Should remain false since it was disabled
    expect(webSocketServer.isRunning).toBe(false);

    await webSocketServer.stop();
    expect(webSocketServer.isRunning).toBe(false);
  });

  test('should have middleware support from Messages system', () => {
    // Test that Messages system supports middleware
    const loggingMiddleware = CommonMiddleware.loggingMiddleware();
    messages.use(loggingMiddleware);

    expect(messages.middleware).toHaveLength(1);
    expect(messages.middleware[0].fn).toBe(loggingMiddleware);
  });

  test('should emit events that can be caught by Messages system', () => {
    return new Promise((resolve) => {
      // Set up event listener
      messages.on('websocket.client.connected', (data) => {
        expect(data).toHaveProperty('clientId');
        expect(data).toHaveProperty('timestamp');
        resolve();
      });

      // Simulate the event emission by calling the internal method directly
      // This would normally happen when a client connects
      const mockClientId = 'test_client_123';
      if (messages) {
        messages.emit('websocket.client.connected', {
          clientId: mockClientId,
          ip: '127.0.0.1',
          userAgent: 'test-agent',
          connectedAt: new Date(),
          timestamp: new Date().toISOString()
        });
      }
    });
  });

  test('should broadcast messages to clients', async () => {
    await webSocketServer.initialize(mockConfig);

    // Mock the WebSocket server to not actually bind to a port
    webSocketServer.server = { listen: jest.fn((port, host, callback) => callback()) };
    webSocketServer.wss = { on: jest.fn(), close: jest.fn() };

    // This test verifies the broadcast method exists and can be called
    const mockMessage = { type: 'test', data: 'test data' };

    // Mock a client to test broadcasting
    webSocketServer.clients.set('test_client', {
      id: 'test_client',
      ws: { readyState: 1, send: jest.fn() }, // 1 = OPEN
      type: 'test'
    });

    webSocketServer.broadcast(mockMessage);

    // Verify that the client's send method was called
    expect(webSocketServer.clients.get('test_client').ws.send).toHaveBeenCalled();
  });

  test('should register commands and handle them through Messages system', async () => {
    // Initialize messages to set up default retry policy
    await messages.initialize();

    const commandResult = { success: true };
    const mockCommandHandler = jest.fn(() => commandResult);

    messages.registerCommand('testCommand', mockCommandHandler);

    // Execute the command
    const result = await messages.execute('testCommand', { testData: 'test' });

    expect(mockCommandHandler).toHaveBeenCalledWith({ testData: 'test' });
    expect(result).toStrictEqual(commandResult);
  });

  test('should handle events through Messages system', () => {
    const mockEventHandler = jest.fn();

    messages.on('testEvent', mockEventHandler);

    // Emit the event
    messages.emit('testEvent', { testData: 'test' });

    expect(mockEventHandler).toHaveBeenCalledWith({ testData: 'test' });
  });
});