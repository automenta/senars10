// Test setup file to improve test isolation and reduce resource contention
import { jest } from '@jest/globals';

// Increase timeout for async operations
jest.setTimeout(15000);

// Global test cleanup to ensure no resource leaks between tests
let globalSystems = new Set();

global.beforeEach(() => {
  // Track any global systems created during tests
  globalSystems.clear();
});

global.afterEach(async () => {
  // Clean up any systems that weren't properly cleaned up
  for (const system of globalSystems) {
    try {
      if (system && typeof system.stop === 'function') {
        await system.stop();

        // Clear event handlers
        if (typeof system.removeAllListeners === 'function') {
          system.removeAllListeners();
        }

        // Clear core reference
        if (system.core) {
          system.core = null;
        }
      }
    } catch (error) {
      console.warn('Error cleaning up system in test teardown:', error.message);
    }
  }
  globalSystems.clear();

  // Force garbage collection if available (Node.js with --expose-gc)
  if (global.gc) {
    global.gc();
  }

  // Clear any remaining timers or async operations
  if (global.clearImmediate) {
    // Clear any immediate operations
  }
});

// Mock console methods during tests to reduce noise unless specifically testing logging
global.beforeAll(() => {
  if (process.env.NODE_ENV === 'test') {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    // Keep warn and error for debugging test failures
  }
});

global.afterAll(() => {
  if (process.env.NODE_ENV === 'test') {
    console.log.mockRestore();
    console.debug.mockRestore();
    console.info.mockRestore();
  }
});

// Helper function to register systems for cleanup
global.registerSystemForCleanup = (system) => {
  globalSystems.add(system);
};

// Helper function to create optimized test configuration
global.createTestConfig = (overrides = {}) => {
  return {
    maxTasks: 50, // Reduced for tests
    maxRules: 25, // Reduced for tests
    enableWebSocket: false,
    testMode: true,
    // Disable heavy components for faster test startup
    components: {
      webSocketServer: { enabled: false },
      lm: { enabled: false },
      analysis: { enabled: false },
      patternDetector: { enabled: false },
      reports: { enabled: false },
      ingestor: { enabled: false },
      ...overrides.components
    },
    ...overrides
  };
};