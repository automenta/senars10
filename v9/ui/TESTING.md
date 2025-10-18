# Testing in the UI Module

This project uses [Vitest](https://vitest.dev/) for testing the UI components. The setup is specifically configured to prevent and catch browser console errors that could be fatal in a production environment.

## Running Tests

```bash
# Run all tests once
npm run test:run

# Run tests in watch mode
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

Tests are located alongside the components they test (e.g., `ComponentName.test.jsx`).

The test setup includes:
- JSDOM environment to simulate browser APIs
- React testing utilities from `@testing-library/react`
- Mocks for browser APIs that aren't available in Node.js (like `ResizeObserver`)
- Console error tracking to prevent silent failures

## Browser Error Prevention

The test suite is specifically designed to catch potential browser console errors including:
- JavaScript runtime errors
- Component rendering failures
- Unhandled promise rejections
- Memory leaks from unremoved event listeners
- WebSocket connection errors

## Mocking

Components that have side effects (like WebSocket connections, timers, or external API calls) are mocked to prevent tests from hanging or causing side effects during test execution.