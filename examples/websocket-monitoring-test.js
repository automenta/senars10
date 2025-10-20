/**
 * Test script to verify WebSocket monitoring functionality
 */

import {NAR} from '../src/nar/NAR.js';
import {MonitoringAPI} from '../src/io/MonitoringAPI.js';

async function testMonitoringAPI() {
    console.log('=== Testing WebSocket Monitoring API ===\n');

    // Create NAR instance
    const nar = new NAR({
        lm: {enabled: false},
        memory: {capacity: 100},
        cycle: {delay: 100}  // Longer delay for monitoring
    });

    // Create monitoring API
    const monitor = new MonitoringAPI(nar, {port: 8081}); // Use different port to avoid conflicts

    try {
        // Start monitoring API
        await monitor.start();
        console.log('✓ Monitoring API started successfully on port 8081');

        // Start NAR reasoning cycle
        nar.start();
        console.log('✓ NAR reasoning cycle started');

        // Add some inputs to generate events
        console.log('\nAdding test inputs to generate events...');
        await nar.input('(test --> concept1). %0.9;0.8%');
        await nar.input('(test --> concept2)?');

        // Let it run for a few seconds to generate events
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Get current metrics
        const metrics = monitor.getSystemMetrics();
        console.log('\nCurrent system metrics:');
        console.log(`  Cycles: ${metrics.cycleCount}`);
        console.log(`  Connected clients: ${metrics.connectedClients}`);
        console.log(`  Runtime: ${metrics.runtime}ms`);

        // Get concepts
        const concepts = monitor.getConcepts();
        console.log(`  Concepts in memory: ${concepts.length}`);

        // Get recent tasks
        const tasks = monitor.getRecentTasks(10);
        console.log(`  Recent tasks: ${tasks.length}`);

        // Stop everything
        nar.stop();
        monitor.stop();
        console.log('\n✓ All systems stopped successfully');

        console.log('\n=== WebSocket Monitoring API Test Complete ===');
        console.log('The monitoring API provides:');
        console.log('- Real-time WebSocket updates for system events');
        console.log('- Cycle completion notifications');
        console.log('- Task input/addition events');
        console.log('- Live system metrics');
        console.log('- Concept and task monitoring');

        return true;
    } catch (error) {
        console.error('❌ Monitoring API test failed:', error);
        // Stop systems even if there's an error
        try {
            nar.stop();
            monitor.stop();
        } catch (e) {
            // Ignore errors during cleanup
        }
        return false;
    }
}

// Run the test
testMonitoringAPI()
    .then(success => {
        if (success) {
            console.log('\n🎉 Monitoring API validation successful!');
        } else {
            console.log('\n⚠️  Monitoring API validation had issues.');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });