import { jest } from '@jest/globals';
import Core from '../../core/orchestration/Core.js';
import WebSocketServer from '../../core/server/WebSocketServer.js';

import Messages from '../../core/messaging/Messages.js';

describe('Core Integration - Phase 2 Components', () => {
  let core;

  beforeEach(async () => {
    core = new Core();
  });

  afterEach(async () => {
    if (core) {
      try {
        await core.destroy();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
  });

  test('should register all Phase 2 components in Core', async () => {
    await core.initialize();

    // Check that WebSocketServer is registered
    expect(core.webSocketServer).toBeDefined();
    expect(core.webSocketServer).toBeInstanceOf(WebSocketServer);

    // Check that Messages is registered (needed for integration)
    expect(core.messages).toBeDefined();
    expect(core.messages).toBeInstanceOf(Messages);

    // Verify that all expected components are in the component map
    expect(core.componentMap.has('webSocketServer')).toBe(true);
    expect(core.componentMap.has('messages')).toBe(true);
  });





  test('should set up WebSocketServer with core reference', async () => {
    await core.initialize();

    // Verify that WebSocketServer has core reference set up
    expect(core.webSocketServer.core).toBe(core);
  });

  test('should start and stop all components properly', async () => {
    // Initialize with a test config
    await core.initialize({
      components: {
        webSocketServer: { port: 8082 } // Use different port for tests
      }
    });

    // Start all components
    await core.start();

    // Verify some components are running (they might not have an explicit running flag)
    expect(core.componentMap.size).toBeGreaterThan(0);

    // Stop all components
    await core.stop();
  });

  test('should handle cross-component communication via Messages', async () => {
    await core.initialize();

    // Create a mock handler for a test event
    const eventsReceived = [];
    core.messages.on('test:cross-component', (data) => {
      eventsReceived.push(data);
    });

    // Emit an event from one component that another component could listen to
    core.messages.emit('test:cross-component', { message: 'test' });

    // Verify the event was received
    expect(eventsReceived).toHaveLength(1);
    expect(eventsReceived[0]).toEqual({ message: 'test' });
  });

  test('should maintain component references via Proxy', async () => {
    await core.initialize();

    // Test that Proxy access works for registered components
    expect(core.webSocketServer).toBeDefined();
    expect(core.messages).toBeDefined();

    // Verify they're the same instances
    expect(core.getComponent('webSocketServer')).toBe(core.webSocketServer);
    expect(core.getComponent('messages')).toBe(core.messages);
  });

  test('should properly destroy all components', async () => {
    await core.initialize();

    // Capture destroy calls by spying on component methods
    const webSocketServerDestroySpy = jest.spyOn(core.webSocketServer, 'destroy').mockImplementation(() => Promise.resolve());
    const messagesDestroySpy = jest.spyOn(core.messages, 'destroy').mockImplementation(() => Promise.resolve());

    await core.destroy();

    // Verify destroy methods were called
    expect(webSocketServerDestroySpy).toHaveBeenCalled();
    expect(messagesDestroySpy).toHaveBeenCalled();

    // Clean up spies
    webSocketServerDestroySpy.mockRestore();
    messagesDestroySpy.mockRestore();
  });
});