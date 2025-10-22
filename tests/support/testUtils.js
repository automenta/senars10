/**
 * @file testUtils.js
 * @description Common test utilities following AGENTS.md guidelines
 *
 * NOTE: This file now uses the organized test utilities from testOrganizer.js
 * for better maintainability and reduced duplication
 */

// Re-export organized test utilities for backward compatibility and ease of use
export * from './testOrganizer.js';
// Also export direct links for specific utilities to maintain compatibility
export * from './baseTestUtils.js';
export * from './narTestSetup.js';
export * from './factories.js';
export * from './commonTestSuites.js';
export * from './generalTestSuites.js';
export * from './flexibleTestUtils.js';
export * from './TestTemplateFactory.js';