import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ReasonerControlPanel from './ReasonerControlPanel';
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

describe('ReasonerControlPanel', () => {
  it('renders correctly', () => {
    render(<ReasonerControlPanel stats={{}} />, { wrapper: TestWrapper });
    expect(screen.getByText('Reasoner Control')).toBeInTheDocument();
  });
});
