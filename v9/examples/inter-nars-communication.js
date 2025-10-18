/**
 * @file: examples/inter-nars-communication.js
 * @description: Example demonstrating the enhanced inter-NARS communication protocol
 */

import System from '../core/System.js';

async function runInterNARSCommunicationExample() {
  console.log('🌐 Enhanced Inter-NARS Communication Example');
  console.log('============================================');

  // Create and start the system
  const system = new System({});

  try {
    await system.start();
    console.log('✅ System started successfully');

    // Get the WebSocket server component
    const wsServer = system.core.wss || system.core.webSocketServer;
    if (!wsServer) {
      console.log('⚠️  WebSocket server not available in this configuration');
      return;
    }

    console.log('\n📋 WebSocket Server Stats:');
    const stats = wsServer.getStats();
    console.log('   Running:', stats.isRunning);
    console.log('   Clients:', stats.clientCount);
    console.log('   NARS Instances:', stats.narsInstances);

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

  } catch (error) {
    console.error('❌ Error during example execution:', error);
  } finally {
    await system.stop();
    console.log('\n✅ System stopped');
  }
}

// Run the example
runInterNARSCommunicationExample().catch(console.error);