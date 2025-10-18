import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CONNECTION_DEFAULTS } from '@core/shared/ClientConstants.js';
import { useUI } from '../core/UIContext';
import { useNotification } from '../core/NotificationSystem';
import { useCommandHistory } from '../utils/hooks';
import { createPanelStyle, createHeaderStyle, createButtonStyle, createLabelStyle, createInputStyle, createStatBoxStyle } from '../utils/uiHelpers';
import { THEME } from '../constants';
import { NARSESE_SUGGESTIONS } from '../constants';

const ReasonerControlPanel = ({ stats, onCommand, onAddTask }) => {
  const { config } = useUI();
  const { addNotification } = useNotification();
  const controlConfig = config?.controlPanel || {};
  
  const [inputValue, setInputValue] = useState('');
  const [cpuThrottle, setCpuThrottle] = useState(controlConfig.defaultThrottle || 100);
  const [chartData, setChartData] = useState([]);
  
  const { 
    history, 
    addToHistory, 
    navigateHistory, 
    resetHistoryNavigation 
  } = useCommandHistory();

  useEffect(() => {
    const interval = setInterval(() => {
      if (stats) {
        const now = new Date().toLocaleTimeString();
        const newPoint = {
          time: now,
          concepts: stats.concepts || 0,
          tasks: stats.tasks || 0,
          cycles: stats.cycles || 0,
        };
        setChartData(prev => [...prev, newPoint].slice(-20));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [stats]);

  const handleCpuThrottleChange = (e) => {
    const value = parseInt(e.target.value);
    setCpuThrottle(value);
    onCommand('throttle', { value });
    addNotification(`CPU throttle set to ${value}%`, 'info');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      if (inputValue.startsWith('/cmd')) {
        // This is a command, send it via onCommand
        const command = inputValue.slice(5).trim();
        // Extract potential payload from command if present in format: command payload
        const [cmd, ...args] = command.split(' ');
        args.length > 0 ?
          (onCommand(cmd, { payload: args.join(' ') }), addNotification(`Command '${cmd}' executed with payload`, 'info')) :
          (onCommand(cmd), addNotification(`Command '${cmd}' executed`, 'info'));
      } else {
        // This is a task, add it via onAddTask
        if (onAddTask) {
          const taskData = {
            content: inputValue,
            priority: 0.5,
            type: 'input',
            status: 'pending',
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString()
          };
          onAddTask(taskData);
          addNotification(`Task added: ${inputValue.substring(0, 30)}${inputValue.length > 30 ? '...' : ''}`, 'success');
        } else {
          // Fallback to command if onAddTask is not provided
          onCommand('add_task', {
            content: inputValue,
            priority: 0.5,
            type: 'input',
            status: 'pending',
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString()
          });
          addNotification(`Task added via command: ${inputValue.substring(0, 30)}${inputValue.length > 30 ? '...' : ''}`, 'success');
        }
      }
      addToHistory(inputValue);
      setInputValue('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const historyValue = navigateHistory('up');
      if (historyValue !== null) {
        setInputValue(historyValue);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const historyValue = navigateHistory('down');
      setInputValue(historyValue || '');
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



  return (
    <div className="reasoner-control-panel" style={{...createPanelStyle({ marginBottom: '10px' }), border: '1px solid #ccc' }}>
      <h3 style={createHeaderStyle({ margin: '0 0 10px 0', color: '#333' })}>Reasoner Control</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {controlConfig.showStartButton || controlConfig.showStopButton || controlConfig.showStepButton || controlConfig.showResetButton ? (
            <div>
              <label style={createLabelStyle()}>Control:</label>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                {controlConfig.showStartButton && (
                  <button
                    onClick={async () => {
                      try {
                        await onCommand('start');
                        addNotification('Reasoner started', 'success');
                      } catch (error) {
                        console.error('Start command failed:', error);
                        addNotification('Start command failed', 'error');
                      }
                    }}
                    style={{ ...createButtonStyle('success'), padding: '5px 10px', borderRadius: '3px' }}
                  >
                    Start
                  </button>
                )}
                {controlConfig.showStopButton && (
                  <button
                    onClick={async () => {
                      try {
                        await onCommand('stop');
                        addNotification('Reasoner stopped', 'info');
                      } catch (error) {
                        console.error('Stop command failed:', error);
                        addNotification('Stop command failed', 'error');
                      }
                    }}
                    style={{ ...createButtonStyle('danger'), padding: '5px 10px', borderRadius: '3px' }}
                  >
                    Stop
                  </button>
                )}
                {controlConfig.showStepButton && (
                  <button
                    onClick={async () => {
                      try {
                        console.log('Step button clicked');
                        await onCommand('step');
                        addNotification('Single cognitive cycle executed', 'info');
                      } catch (error) {
                        console.error('Step command failed:', error);
                        addNotification('Step command failed', 'error');
                      }
                    }}
                    style={{ ...createButtonStyle('info'), padding: '5px 10px', borderRadius: '3px' }}
                  >
                    Step
                  </button>
                )}
                {controlConfig.showResetButton && (
                  <button
                    onClick={async () => {
                      try {
                        await onCommand('reset');
                        addNotification('System reset completed', 'info');
                      } catch (error) {
                        console.error('Reset command failed:', error);
                        addNotification('Reset command failed', 'error');
                      }
                    }}
                    style={{ ...createButtonStyle('warning'), padding: '5px 10px', borderRadius: '3px' }}
                  >
                    Reset
                  </button>
                )}
                {controlConfig.showThrottleControl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '10px' }}>
                    <label htmlFor="cpu-throttle-slider" style={{ ...createLabelStyle(), cursor: 'pointer' }} title={`CPU Throttle: ${cpuThrottle}%`}>
                      <span role="img" aria-label="CPU Throttle">💨</span>
                    </label>
                    <input
                      id="cpu-throttle-slider"
                      type="range"
                      min="1"
                      max="100"
                      value={cpuThrottle}
                      onChange={handleCpuThrottleChange}
                      style={{ width: '80px', cursor: 'pointer' }}
                      title={`CPU Throttle: ${cpuThrottle}%`}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
        {controlConfig.showStats && (
          <div>
            <label style={createLabelStyle()}>
              Status:
              <span style={{
                marginLeft: '10px',
                padding: '2px 8px',
                backgroundColor: stats?.running && !stats?.paused ? '#d4edda' : 
                                stats?.paused ? '#fff3cd' : '#f8d7da',
                color: stats?.running && !stats?.paused ? '#155724' : 
                       stats?.paused ? '#856404' : '#721c24',
                borderRadius: '12px',
                fontSize: '12px',
              }}>
                {stats?.running && !stats?.paused ? 'Running' : 
                 stats?.paused ? 'Paused' : 'Stopped'}
              </span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
              <div style={{...createStatBoxStyle({ textAlign: 'center', padding: '8px', backgroundColor: '#e9ecef' })}}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#007bff' }}>{stats?.concepts || 0}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Concepts</div>
              </div>
              <div style={{...createStatBoxStyle({ textAlign: 'center', padding: '8px', backgroundColor: '#e9ecef' })}}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#28a745' }}>{stats?.tasks || 0}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Tasks</div>
              </div>
              <div style={{...createStatBoxStyle({ textAlign: 'center', padding: '8px', backgroundColor: '#e9ecef' })}}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffc107' }}>{stats?.cycles || 0}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Cycles</div>
              </div>
            </div>
          </div>
        )}
      </div>
      {controlConfig.showChart && (
        <div style={{ marginTop: '15px', height: '120px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" hide />
              <YAxis width={30} />
              <Tooltip />
              <Line type="monotone" dataKey="concepts" stroke="#007bff" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="tasks" stroke="#28a745" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {controlConfig.showInputField && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', marginTop: '10px' }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a command or task (e.g. /cmd start)..."
            style={{...createInputStyle(), flex: 1, padding: '5px', marginRight: '5px', border: '1px solid #ccc', borderRadius: '3px'}}
          />
          <button type="submit" style={{...createButtonStyle('primary'), padding: '5px 10px', borderRadius: '3px'}}>Send</button>
        </form>
      )}
    </div>
  );
};

export default ReasonerControlPanel;