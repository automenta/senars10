import React, { useState } from 'react';
import { CONNECTION_DEFAULTS } from '@core/shared/ClientConstants.js';
import { NARSESE_SUGGESTIONS } from '../constants';

const StatusBar = ({ onSend, stats }) => {
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSend(inputValue);
      if (inputValue !== history[0]) {
        const newHistory = [inputValue, ...history];
        setHistory(newHistory.slice(0, CONNECTION_DEFAULTS.maxHistorySize));
      }
      setHistoryIndex(-1);
      setInputValue('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(newIndex);
        setInputValue(history[newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > -1) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInputValue(history[newIndex] || '');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const parts = inputValue.split(/(\\s+)/);
      const lastPart = parts[parts.length - 1];
      if (lastPart.trim()) {
        const match = NARSESE_SUGGESTIONS.find(s => s.startsWith(lastPart));
        if (match) {
          parts[parts.length - 1] = match;
          const newValue = parts.join('');
          setInputValue(newValue);
        }
      }
    }
  };

  const handleControlCommand = (command) => {
    onSend(command);
  };

  return (
    <div className="status-bar" style={{ display: 'flex', alignItems: 'center', padding: '5px', backgroundColor: '#f0f0f0' }}>
      <div style={{ display: 'flex', gap: '5px', marginRight: '10px' }}>
        <button onClick={() => handleControlCommand('start')}>Start</button>
        <button onClick={() => handleControlCommand('stop')}>Stop</button>
        <button onClick={() => handleControlCommand('reset')}>Reset</button>
      </div>
      <div style={{ marginRight: '10px' }}>
        <span>Status: {stats?.running ? 'Running' : 'Stopped'}</span>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginRight: '10px' }}>
        <span>Concepts: {stats?.concepts || 0}</span>
        <span>Tasks: {stats?.tasks || 0}</span>
        <span>Cycles: {stats?.cycles || 0}</span>
      </div>
      <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex' }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command..."
          style={{ flex: 1 }}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default StatusBar;
