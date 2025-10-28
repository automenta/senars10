// ui/shared/hooks/useReasoningTrace.js
import { useState, useEffect } from 'react';

// For the mock implementation, using the same event bus as useAgentState
// This would connect to the actual SeNARS core EventBus in a real implementation
let mockEventBus = null;

if (typeof window === 'undefined') {
  const EventEmitter = require('events');
  mockEventBus = new EventEmitter();
} else {
  // Use the same mock event bus as in useAgentState for consistency
  const mockAgentState = require('./useAgentState.js');
  // We'll assume the mockEventBus is shared between modules in this mock implementation
  mockEventBus = typeof window === 'undefined' 
    ? mockAgentState.mockEventBus 
    : mockAgentState.mockEventBus || {
        events: {},
        on: function(event, handler) {
          if (!this.events[event]) {
            this.events[event] = [];
          }
          this.events[event].push(handler);
        },
        off: function(event, handler) {
          if (this.events[event]) {
            this.events[event] = this.events[event].filter(h => h !== handler);
          }
        },
        emit: function(event, data) {
          if (this.events[event]) {
            this.events[event].forEach(handler => handler(data));
          }
        }
      };
}

export function useReasoningTrace() {
  const [trace, setTrace] = useState([]);

  useEffect(() => {
    const handler = (step) => {
      // Add the new step to the trace and keep only the last 100 steps
      setTrace(prevTrace => [...prevTrace, step].slice(-100));
    };
    
    mockEventBus.on('reasoningStep', handler);

    // Simulate some reasoning steps periodically for demo purposes
    if (typeof window === 'undefined') {
      const interval = setInterval(() => {
        mockEventBus.emit('reasoningStep', {
          id: `step-${Date.now()}`,
          timestamp: new Date().toISOString(),
          agentId: 'agent-1',
          content: `Reasoning step at ${new Date().toISOString()}`,
          type: 'inference'
        });
      }, 5000); // Every 5 seconds
      
      // Clean up the interval
      return () => {
        clearInterval(interval);
        mockEventBus.off('reasoningStep', handler);
      };
    } else {
      // Clean up only the event listener for web
      return () => {
        mockEventBus.off('reasoningStep', handler);
      };
    }
  }, []);

  return trace;
}