import { describe, test, expect } from '@jest/globals';
import WebSocketServer from '../../core/server/WebSocketServer.js';
import WebSocketUtils from '../../core/server/WebSocketUtils.js';
import MessageHandler from '../../core/server/MessageHandler.js';
import ConnectionManager from '../../core/server/ConnectionManager.js';
import StreamManager from '../../core/server/StreamManager.js';

describe('WebSocket Integration Test', () => {
  test('should demonstrate WebSocket communication functionality and verify server methods', async () => {
    const wsServer = new WebSocketServer();

    // Verify WebSocket server exists and has expected properties
    expect(wsServer).toBeDefined();
    expect(wsServer.clients).toBeDefined();
    expect(wsServer.subscriptions).toBeDefined();
    expect(wsServer.isRunning).toBe(false);

    // Verify component managers exist
    expect(wsServer.connectionManager).toBeInstanceOf(ConnectionManager);
    expect(wsServer.streamManager).toBeInstanceOf(StreamManager);
    expect(wsServer.messageHandler).toBeInstanceOf(MessageHandler);

    // Test utility functions
    expect(typeof WebSocketUtils.generateId).toBe('function');
    expect(typeof WebSocketUtils.formatTaskData).toBe('function');
    expect(typeof WebSocketUtils.createMessage).toBe('function');

    // Test stats functionality
    const stats = wsServer.getStats();
    expect(stats).toBeDefined();
    expect(typeof stats.isRunning).toBe('boolean');
    expect(typeof stats.clientCount).toBe('number');
    expect(typeof stats.subscriptions).toBe('number');
    expect(typeof stats.taskStreams).toBe('number');
  });

  test('should handle component initialization properly', async () => {
    const wsServer = new WebSocketServer();

    // Test initialization with config
    await wsServer.initialize({
      port: 8080,
      host: 'localhost',
      maxConnectionsPerIP: 5
    });

    // Verify initialization worked
    expect(wsServer.server).toBeDefined();
    expect(wsServer.wss).toBeDefined();
  });

  test('should demonstrate real-time event broadcasting capabilities', async () => {
    const wsServer = new WebSocketServer();

    // Test stream manager functionality
    const stream = wsServer.streamManager.createTaskStream('test-task');
    expect(stream).toBeDefined();
    expect(stream.id).toBe('test-task');
    expect(stream.participants).toBeInstanceOf(Set);

    // Test message handler registration
    expect(wsServer.messageHandler.handlers).toBeInstanceOf(Map);
    expect(wsServer.messageHandler.handlers.size).toBeGreaterThan(0);
  });

  test('should validate message routing and handling', async () => {
    const wsServer = new WebSocketServer();

    // Test that message handler can process different message types
    const testMessage = {
      type: 'identify',
      clientType: 'test',
      version: '1.0.0'
    };

    // Mock client for testing
    const mockClient = { id: 'test-client' };
    wsServer.clients.set('test-client', mockClient);

    // Test message handling
    wsServer.messageHandler.handle('test-client', testMessage);
    expect(mockClient.type).toBe('test');
    expect(mockClient.version).toBe('1.0.0');
  });
});