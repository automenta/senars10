import React from 'react';
import { render, screen } from '@testing-library/react';
import Panel from './Panel';
import '@testing-library/jest-dom';

describe('Panel', () => {
  it('renders the title and children', () => {
    const title = 'Test Panel';
    const content = 'This is the panel content.';

    render(
      <Panel title={title}>
        <div>{content}</div>
      </Panel>
    );

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(content)).toBeInTheDocument();
  });
});
