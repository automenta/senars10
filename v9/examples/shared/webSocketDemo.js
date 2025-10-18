/**
 * @file: examples/shared/webSocketDemo.js
 * @description: Shared functionality for WebSocket communication demonstration used by both tests and examples
 */

import System from '../../core/system/System.js';

// Export the main functionality for both tests and examples to use
export async function demonstrateWebSocketCommunication() {
  // Create and start the system
  const system = new System({});

  try {
    await system.start();
    console.log('✅ System started successfully');

    // Get the WebSocket server component
    const wsServer = system.core.wss || system.core.webSocketServer;
    if (!wsServer) {
      console.log('⚠️  WebSocket server not available in this configuration');
      return null;
    }

    // Get initial stats
    const initialStats = wsServer.getStats();
    console.log('📋 WebSocket Server Initial Stats:');
    console.log('   Running:', initialStats.isRunning);
    console.log('   Clients:', initialStats.clientCount);
    console.log('   NARS Instances:', initialStats.narsInstances);

    // Simulate registering a NARS instance
    console.log('\n🎯 Simulating NARS Instance Registration:');

    // This would normally be done by an external NARS instance connecting via WebSocket
    // For this example, we'll show how the system would handle it
    console.log('   Instance registration would be handled via WebSocket messages');
    console.log('   Message format: { type: "identify", clientType: "nars", instanceId: "nars-001", ... }');

    // Show available NARS instances (currently empty)
    const narsInstances = wsServer.getNARSInstances();
    console.log('\n📊 Available NARS Instances:', narsInstances.length);

    // Add some basic tasks to demonstrate potential sync capabilities
    const task1 = system.input({
      term: '((A) --> (B))',
      punctuation: '.',
      truth: { frequency: 0.9, confidence: 0.8 }
    });

    console.log('\n📥 Input task for potential sync:');
    console.log('   Task:', task1.term + task1.punctuation);

    // Demonstrate the new methods added to the WebSocket server
    console.log('\n⚙️  New Inter-NARS Protocol Methods:');
    console.log('   ✓ _handleNARSRegistration() - Handle instance registration');
    console.log('   ✓ _handleTaskSynchronization() - Sync tasks between instances');
    console.log('   ✓ _handleStatusRequest() - Handle status queries');
    console.log('   ✓ _handleStatusBroadcast() - Broadcast status updates');
    console.log('   ✓ broadcastTaskToNARS() - Broadcast tasks to all instances');
    console.log('   ✓ getNARSInstanceStatus() - Get status of specific instance');
    console.log('   ✓ sendRequestToNARS() - Send requests and await responses');

    console.log('\n🔄 Task synchronization would work as follows:');
    console.log('   1. NARS instance A adds a task');
    console.log('   2. Task is synchronized to NARS instance B');
    console.log('   3. Both instances now have the same task in their memory');

    // Get final stats
    const finalStats = wsServer.getStats();

    // Return results for verification
    return {
      initialStats,
      finalStats,
      narsInstances,
      task: task1,
      system
    };

  } catch (error) {
    console.error('❌ Error during example execution:', error);
    throw error;
  } finally {
    if (system) {
      await system.stop();
      console.log('\n✅ System stopped');
    }
  }
}

// Export a function that can be used specifically for testing WebSocket functionality
export async function testWebSocketFunctionality() {
  const system = new System({});

  try {
    await system.start();

    const wsServer = system.core.wss || system.core.webSocketServer;
    if (!wsServer) {
      throw new Error('WebSocket server not available');
    }

    // Test WebSocket server methods exist
    const methodsToTest = [
      '_handleNARSRegistration',
      '_handleTaskSynchronization',
      '_handleStatusRequest',
      '_handleStatusBroadcast',
      'broadcastTaskToNARS',
      'getNARSInstanceStatus',
      'sendRequestToNARS'
    ];

    const methodAvailability = {};
    methodsToTest.forEach(method => {
      methodAvailability[method] = typeof wsServer[method] === 'function';
    });

    // Test basic stats functionality
    const stats = wsServer.getStats();
    const narsInstances = wsServer.getNARSInstances();

    return {
      methodAvailability,
      stats,
      narsInstances,
      hasWebSocketServer: !!wsServer
    };
  } finally {
    await system.stop();
  }
}