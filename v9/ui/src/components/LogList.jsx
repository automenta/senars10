import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getLogLevelColor, getLogIcon, formatLogData as extractLogData, formatLogLevel as extractLogLevel } from '../utils/uiHelpers';
import { createButtonStyle, createFlexLayout } from '../utils/uiHelpers';

const LogList = ({ logs = [] }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);
  const containerRef = useRef(null);
  const bufferSize = 100;

  const displayLogs = useMemo(() => isPaused ? logs : logs.slice(-bufferSize), [logs, isPaused]);

  useEffect(() => {
    if (!isPaused && containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [displayLogs, isPaused]);

  const clearLogs = () => {
    // For clearing logs, we would need to modify the parent component's state
    // TODO: Implement log clearing functionality
  };

  const headerStyle = createFlexLayout('row', 'space-between', 'center', {
    padding: '5px 10px',
    backgroundColor: '#e9ecef',
    borderBottom: '1px solid #ccc',
    fontSize: '12px'
  });

  const buttonBaseStyle = createButtonStyle('secondary', {
    padding: '2px 8px',
    fontSize: '12px',
    borderRadius: '2px'
  });

  return (
    <div className="log-list" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={headerStyle}>
        <div>Log Activity (Buffer: {displayLogs.length}/{bufferSize})</div>
        <div>
          <button onClick={() => setIsPaused(!isPaused)} style={{ ...buttonBaseStyle, backgroundColor: isPaused ? '#28a745' : '#6c757d', color: 'white', margin: '0 5px 0 0' }}>
            {isPaused ? '▶️ Resume' : '⏸️ Pause'}
          </button>
          <button onClick={clearLogs} style={{ ...buttonBaseStyle, backgroundColor: '#dc3545', color: 'white' }}>
            🗑️ Clear
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '5px',
          fontFamily: 'monospace',
          fontSize: '12px',
          backgroundColor: '#ffffff'
        }}
      >
        {displayLogs?.length ? (
          <ul style={{ margin: 0, padding: 0, listStyleType: 'none', animation: 'fadeIn 0.3s ease-in-out' }}>
            {displayLogs.map((log, index) => {
              const isYjsObject = log?.get && typeof log.get === 'function';
              const logData = extractLogData(log);
              const message = typeof logData === 'string' ? logData : JSON.stringify(logData);
              const icon = getLogIcon(message);
              const level = isYjsObject ? extractLogLevel(log) || 'info' : log.level || 'info';
              const color = getLogLevelColor(level);
              const timestamp = isYjsObject ? log.get('timestamp') : log.timestamp || Date.now();
              const logType = isYjsObject ? log.get('type') : log.type || 'LOG';

              const isExpanded = expandedLog === index;
              const truncatedMessage = message.length > 100 && !isExpanded ? `${message.substring(0, 100)}...` : message;

              return (
                <li
                  key={`${timestamp}-${index}-${message.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '')}`}
                  className="log-item"
                  style={{
                    padding: '6px 8px',
                    margin: '3px 0',
                    borderRadius: '4px',
                    backgroundColor: isExpanded ? '#f1f3f5' : 'transparent',
                    borderLeft: `3px solid ${color}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'flex-start'
                  }}
                  onClick={() => setExpandedLog(isExpanded ? null : index)}
                >
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: `${color}20`,
                    marginRight: '8px',
                    fontSize: '12px'
                  }}>
                    {icon}
                  </span>

                  <div style={{ flex: 1 }}>
                    <div style={createFlexLayout('row', 'flex-start', 'center', { marginBottom: '2px' })}>
                      <span style={{ color, fontWeight: 'bold', fontSize: '11px', marginRight: '6px' }}>
                        {logType}
                      </span>
                      <span style={{ color: '#666', fontSize: '10px', marginRight: '8px', minWidth: '70px' }}>
                        [{new Date(timestamp).toLocaleTimeString()}]
                      </span>
                      <span style={{ color: getLogLevelColor(level), fontSize: '11px', fontStyle: 'italic' }}>
                        {level}
                      </span>
                    </div>

                    <div style={{ color: '#333', lineHeight: '1.4', wordBreak: 'break-word' }}>
                      {truncatedMessage}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px dashed #ccc',
                      fontSize: '11px',
                      color: '#666'
                    }}>
                      <div><strong>Full details:</strong></div>
                      <div style={{
                        marginTop: '4px',
                        padding: '4px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '3px',
                        fontFamily: 'monospace',
                        fontSize: '10px',
                        maxHeight: '100px',
                        overflowY: 'auto'
                      }}>
                        {JSON.stringify(isYjsObject ? log.toJSON() : log, null, 2)}
                      </div>

                      <div style={createFlexLayout('row', 'flex-start', 'center', { gap: '8px', marginTop: '6px', flexWrap: 'wrap' })}>
                        <button
                          style={createButtonStyle('secondary', { padding: '2px 6px', fontSize: '10px', borderRadius: '3px' })}
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(message); }}
                        >
                          📋 Copy
                        </button>
                        <button
                          style={createButtonStyle('secondary', { padding: '2px 6px', fontSize: '10px', borderRadius: '3px' })}
                          onClick={(e) => { e.stopPropagation(); /* TODO: Implement filter by type */ }}
                        >
                          🔍 Filter
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div style={createFlexLayout('column', 'center', 'center', {
            height: '100%',
            color: '#999',
            fontStyle: 'italic',
            textAlign: 'center'
          })}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>📋</div>
            <div>No log messages yet...</div>
            <div style={{ fontSize: '10px', marginTop: '5px' }}>Connect to a server to see activity logs</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogList;
