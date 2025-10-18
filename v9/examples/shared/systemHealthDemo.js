/**
 * @file: examples/shared/systemHealthDemo.js
 * @description: Shared functionality for system health & monitoring demonstration used by both tests and examples
 */

import System from '../../core/system/System.js';

// Export the main functionality for both tests and examples to use
export async function demonstrateSystemHealthMonitoring() {
  // Create and start the system
  const system = new System({});

  try {
    await system.start();
    console.log('✅ System started successfully');

    // Access various system components for health monitoring
    const components = {
      memory: system.core.memory,
      rules: system.core.rules,
      reasoning: system.core.reasoning,
      planner: system.core.planner,
      messages: system.core.messages,
      contradictionAnalyzer: system.core.contradictionAnalyzer,
      resolutionStrategy: system.core.resolutionStrategy,
      patternDetector: system.core.patternDetector,
      webSocketServer: system.core.webSocketServer || system.core.wss
    };

    console.log('\\n📊 System Component Health Overview:');

    // Get health status for each component
    const healthStatus = {};
    for (const [name, component] of Object.entries(components)) {
      if (component && typeof component.getHealth === 'function') {
        try {
          healthStatus[name] = component.getHealth();
          console.log(`   ${name}: Status: ${healthStatus[name].status}`);
        } catch (error) {
          console.log(`   ${name}: Health check failed - ${error.message}`);
          healthStatus[name] = { status: 'error', error: error.message };
        }
      } else {
        healthStatus[name] = { status: 'unavailable' };
        console.log(`   ${name}: Health check method not available`);
      }
    }

    // Get performance metrics
    console.log('\\n⚡ Performance Metrics:');
    const performanceMetrics = {};
    for (const [name, component] of Object.entries(components)) {
      if (component && typeof component.getMetrics === 'function') {
        try {
          performanceMetrics[name] = component.getMetrics();
          console.log(`   ${name}: Metrics collected`);
        } catch (error) {
          console.log(`   ${name}: Metrics collection failed - ${error.message}`);
          performanceMetrics[name] = { error: error.message };
        }
      }
    }

    // Get overall system statistics
    console.log('\\n📈 System Statistics:');
    const stats = {};
    for (const [name, component] of Object.entries(components)) {
      if (component && typeof component.getStats === 'function') {
        try {
          stats[name] = component.getStats();
          console.log(`   ${name}: Stats available`);
        } catch (error) {
          console.log(`   ${name}: Stats collection failed - ${error.message}`);
          stats[name] = { error: error.message };
        }
      }
    }

    // Simulate system load for performance monitoring (fewer operations in tests)
    console.log('\\n🏋️ Simulating system load...');
    const startTime = Date.now();

    // Perform multiple operations to generate metrics (fewer in tests)
    const maxOperations = (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 3 : 10;
    for (let i = 0; i < maxOperations; i++) {
      if (system.core.memory) {
        system.core.memory.set(`load-test-${i}`, { value: `Load test item ${i}`, timestamp: Date.now() }, { priority: 5 });
      }

      if (system.core.rules) {
        await system.core.rules.evaluate({ type: 'load-test', id: i, priority: 5 });
      }
    }

    const loadTime = Date.now() - startTime;
    console.log(`   Load simulation completed in ${loadTime}ms`);

    // Get updated health status after load
    const postLoadHealth = {};
    for (const [name, component] of Object.entries(components)) {
      if (component && typeof component.getHealth === 'function') {
        try {
          postLoadHealth[name] = component.getHealth();
        } catch (error) {
          postLoadHealth[name] = { status: 'error', error: error.message };
        }
      }
    }

    // Cross-component event propagation example
    console.log('\\n🔄 Testing cross-component event propagation...');
    if (system.core.messages) {
      // Listen for system events
      const eventsReceived = [];

      const eventHandler = (data) => {
        eventsReceived.push({ event: 'system.monitoring', data, timestamp: Date.now() });
      };

      system.core.messages.on('system.monitoring', eventHandler);

      // Emit a monitoring event
      system.core.messages.emit('system.monitoring', {
        type: 'health-check',
        source: 'monitoring-demo',
        timestamp: Date.now()
      });

      // Wait a moment for event processing (shorter in tests)
      const delay = (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 10 : 100;
      await new Promise(resolve => setTimeout(resolve, delay));

      // Remove listener
      system.core.messages.off('system.monitoring', eventHandler);

      console.log(`   Events received: ${eventsReceived.length}`);
    }

    // Return results for verification
    return {
      healthStatus,
      performanceMetrics,
      stats,
      loadTime,
      postLoadHealth,
      hasSystem: !!system,
      system
    };

  } catch (error) {
    console.error('❌ Error during system health monitoring example execution:', error);
    throw error;
  } finally {
    if (system) {
      await system.stop();
      console.log('\\n✅ System stopped');
    }
  }
}

// Export a function specifically for testing system health monitoring functionality
export async function testSystemHealthMonitoringFunctionality() {
  const system = new System({});

  try {
    await system.start();

    // Check which health monitoring functions are available
    const components = {
      memory: system.core.memory,
      rules: system.core.rules,
      reasoning: system.core.reasoning,
      planner: system.core.planner,
      messages: system.core.messages,
      contradictionAnalyzer: system.core.contradictionAnalyzer,
      resolutionStrategy: system.core.resolutionStrategy,
      patternDetector: system.core.patternDetector,
      webSocketServer: system.core.webSocketServer || system.core.wss
    };

    // Health monitoring capabilities
    const capabilities = {};
    for (const [name, component] of Object.entries(components)) {
      if (component) {
        capabilities[name] = {
          hasGetHealth: typeof component.getHealth === 'function',
          hasGetMetrics: typeof component.getMetrics === 'function',
          hasGetStats: typeof component.getStats === 'function',
          hasGetPerformanceStats: typeof component.getPerformanceStats === 'function'
        };
      }
    }

    // Get health for each component that supports it
    const healthReports = {};
    for (const [name, component] of Object.entries(components)) {
      if (component && typeof component.getHealth === 'function') {
        try {
          healthReports[name] = component.getHealth();
        } catch (error) {
          healthReports[name] = { status: 'error', error: error.message };
        }
      }
    }

    // Get metrics for each component that supports it
    const metrics = {};
    for (const [name, component] of Object.entries(components)) {
      if (component && typeof component.getMetrics === 'function') {
        try {
          metrics[name] = component.getMetrics();
        } catch (error) {
          metrics[name] = { error: error.message };
        }
      }
    }

    // Get stats for each component that supports it
    const stats = {};
    for (const [name, component] of Object.entries(components)) {
      if (component && typeof component.getStats === 'function') {
        try {
          stats[name] = component.getStats();
        } catch (error) {
          stats[name] = { error: error.message };
        }
      }
    }

    // Get performance stats for each component that supports it
    const performanceStats = {};
    for (const [name, component] of Object.entries(components)) {
      if (component && typeof component.getPerformanceStats === 'function') {
        try {
          performanceStats[name] = component.getPerformanceStats();
        } catch (error) {
          performanceStats[name] = { error: error.message };
        }
      }
    }

    // Test event-based health monitoring
    let eventsReceived = 0;
    if (system.core.messages) {
      const eventHandler = () => { eventsReceived++; };
      system.core.messages.on('health.event.test', eventHandler);

      // Emit a test event
      system.core.messages.emit('health.event.test', { test: true });
      system.core.messages.emit('health.event.test', { test: true });

      // Clean up
      system.core.messages.off('health.event.test', eventHandler);
    }

    return {
      capabilities,
      healthReports,
      metrics,
      stats,
      performanceStats,
      eventsReceived
    };
  } finally {
    await system.stop();
  }
}

// Export function for testing component health aggregation
export async function testComponentHealthAggregation() {
  const system = new System({});

  try {
    await system.start();

    // Collect health status from all available components
    const components = {
      memory: system.core.memory,
      rules: system.core.rules,
      reasoning: system.core.reasoning,
      planner: system.core.planner,
      messages: system.core.messages
    };

    // Aggregate health status
    const healthAggregation = {
      totalComponents: 0,
      healthyComponents: 0,
      unhealthyComponents: 0,
      components: {}
    };

    for (const [name, component] of Object.entries(components)) {
      if (component) {
        healthAggregation.totalComponents++;

        if (typeof component.getHealth === 'function') {
          try {
            const health = component.getHealth();
            healthAggregation.components[name] = health;

            if (health.status === 'healthy') {
              healthAggregation.healthyComponents++;
            } else {
              healthAggregation.unhealthyComponents++;
            }
          } catch (error) {
            healthAggregation.components[name] = { status: 'error', error: error.message };
            healthAggregation.unhealthyComponents++;
          }
        } else {
          healthAggregation.components[name] = { status: 'unavailable' };
          healthAggregation.unhealthyComponents++;
        }
      }
    }

    // Calculate health percentage
    healthAggregation.healthPercentage = healthAggregation.totalComponents > 0
      ? (healthAggregation.healthyComponents / healthAggregation.totalComponents) * 100
      : 0;

    return healthAggregation;
  } finally {
    await system.stop();
  }
}

// Export function for testing performance metric collection
export async function testPerformanceMetricCollection() {
  const system = new System({});

  try {
    await system.start();

    // Collect performance metrics from components
    const components = {
      memory: system.core.memory,
      rules: system.core.rules,
      reasoning: system.core.reasoning
    };

    const performanceData = {};

    // Measure basic operations for each component
    for (const [name, component] of Object.entries(components)) {
      if (component) {
        const metrics = {};

        // Timing test for standard operations (fewer operations in tests)
        if (name === 'memory' && typeof component.set === 'function') {
          const start = Date.now();
          component.set('perf-test-key', { test: 'data' }, { priority: 5 });
          const setDataTime = Date.now() - start;

          const getStart = Date.now();
          component.get('perf-test-key');
          const getDataTime = Date.now() - getStart;

          metrics.setOperationTime = setDataTime;
          metrics.getOperationTime = getDataTime;
        }

        if (name === 'rules' && typeof component.evaluate === 'function') {
          const start = Date.now();
          await component.evaluate({ type: 'perf-test', priority: 5 });
          const evalTime = Date.now() - start;

          metrics.evaluationTime = evalTime;
        }

        if (name === 'reasoning' && typeof component.reason === 'function') {
          const start = Date.now();
          await component.reason([{ type: 'perf-test-task', priority: 5 }]);
          const reasonTime = Date.now() - start;

          metrics.reasoningTime = reasonTime;
        }

        performanceData[name] = metrics;
      }
    }

    // Get component-specific metrics if available
    for (const [name, component] of Object.entries(components)) {
      if (component && typeof component.getMetrics === 'function') {
        try {
          const componentMetrics = component.getMetrics();
          performanceData[name] = {
            ...performanceData[name],
            ...componentMetrics
          };
        } catch (error) {
          performanceData[name] = {
            ...performanceData[name],
            error: error.message
          };
        }
      }
    }

    return performanceData;
  } finally {
    await system.stop();
  }
}

// Export function for testing cross-component event propagation
export async function testCrossComponentEventPropagation() {
  const system = new System({});

  try {
    await system.start();

    // Test that the message system can propagate events across components
    if (!system.core.messages) {
      return { error: 'Messages component not available' };
    }

    // Set up event tracking
    const eventLog = [];
    const eventHandler = (data) => {
      eventLog.push({
        event: 'test.event',
        data,
        timestamp: Date.now(),
        handler: 'cross-component'
      });
    };

    // Register the event handler
    system.core.messages.on('test.event', eventHandler);

    // Emit events from different contexts
    const testEvents = [
      { source: 'memory', action: 'item.added', data: { key: 'test1', value: 'data1' } },
      { source: 'rules', action: 'rule.fired', data: { rule: 'test-rule', context: 'test' } },
      { source: 'system', action: 'health.check', data: { status: 'ok' } }
    ];

    for (const event of testEvents) {
      system.core.messages.emit('test.event', event);
    }

    // Wait for event processing (shorter in tests)
    const delay = (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 10 : 50;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Clean up
    system.core.messages.off('test.event', eventHandler);

    // Test if events were propagated properly
    const propagationSuccessful = eventLog.length === testEvents.length;

    return {
      eventsEmitted: testEvents.length,
      eventsReceived: eventLog.length,
      eventLog,
      propagationSuccessful,
      systemEventHandling: true
    };
  } finally {
    await system.stop();
  }
}