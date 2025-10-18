import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LogList from './LogList';
import * as Y from 'yjs';

describe('LogList', () => {
  it('renders correctly with no logs', () => {
    render(<LogList logs={[]} />);
    expect(screen.getByText('No log messages yet...')).toBeInTheDocument();
  });

  it('renders a list of logs', () => {
    const ydoc = new Y.Doc();
    const yLogs = ydoc.getArray('logs');
    const logs = [
      { data: 'log message 1' },
      { data: 'log message 2' },
    ];
    logs.forEach(log => yLogs.push([new Y.Map(Object.entries(log))]));

    render(<LogList logs={yLogs.toArray()} />);
    expect(screen.getByText('log message 1')).toBeInTheDocument();
    expect(screen.getByText('log message 2')).toBeInTheDocument();
  });
});
