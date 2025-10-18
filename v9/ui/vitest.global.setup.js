// vitest.global.setup.js - Minimal setup for performance
export async function setup() {
  // No server startup needed for UI tests
  globalThis.__SERVER_PROCESS__ = null;
}

export async function teardown() {
  // No cleanup needed - no server was started
}
