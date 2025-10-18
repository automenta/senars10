import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Minimal mocks only - avoid global mocking for performance
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Simplified GraphicsEngine mock
vi.mock('./src/components/GraphicsEngine', () => ({
  useGraphics: () => ({
    scene: { add: vi.fn(), remove: vi.fn() },
    camera: {},
  }),
  default: ({ children }) => <div data-testid="mock-graphics-engine">{children}</div>,
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Simplified DOM rect mock for performance
Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
  value: () => ({
    width: 800,
    height: 600,
    top: 0,
    left: 0,
    bottom: 600,
    right: 800,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }),
  writable: true,
});
