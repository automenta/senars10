import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import GraphicsEngine from './GraphicsEngine';

describe('GraphicsEngine', () => {
  it('renders correctly', () => {
    const { container } = render(<GraphicsEngine />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
