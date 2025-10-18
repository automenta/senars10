import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ConceptMap from './ConceptMap'; // Updated import to match the file name
import { UIProvider } from '../core/UIContext';
import { NotificationProvider } from '../core/NotificationSystem';

// Wrapper component that includes all necessary providers
const TestWrapper = ({ children }) => (
  <UIProvider>
    <NotificationProvider>
      {children}
    </NotificationProvider>
  </UIProvider>
);

// This integration test serves as a "smoke test" for the ConceptMap component.
// It verifies that the component can be rendered into the DOM without causing any runtime errors.

describe('ConceptMap Component - Integration Test', () => {
  it('renders the graphics canvas without errors', async () => {
    // Render the ConceptMap component
    const { container } = render(<ConceptMap concepts={[]} />, { wrapper: TestWrapper });

    // Verify the component renders without throwing exceptions by checking
    // that the container has the expected structure
    expect(container.firstChild).toBeInTheDocument();
  });
});
