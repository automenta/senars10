// ui/shared/hooks/useAgentState.js
import { useState, useEffect } from 'react';
// Note: Adjust the path to the EventBus based on the actual location in your core
// For now, we'll use a placeholder that will need to be updated when the actual EventBus path is known
// import { eventBus } from '../../core/util/EventBus.js';

// For now, creating a mock event bus for demonstration purposes
// This should be replaced with the actual SeNARS core EventBus
let mockEventBus = null;

// For the mock implementation, if we're on the server side (CLI), we'll create a simple event system
if (typeof window === 'undefined') {
  const EventEmitter = require('events');
  mockEventBus = new EventEmitter();
  
  // Simulate some agents periodically for demo purposes
  setTimeout(() => {
    mockEventBus.emit('agentUpdate', [
      { id: 'agent-1', name: 'Research Agent', status: 'active', tasks: ['research-task-1'], created_at: new Date().toISOString(), last_updated: new Date().toISOString() },
      { id: 'agent-2', name: 'Planning Agent', status: 'idle', tasks: [], created_at: new Date().toISOString(), last_updated: new Date().toISOString() },
    ]);
  }, 1000);
} else {
  // For web, we can use a simple object-based event system
  mockEventBus = {
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

export function useAgentState() {
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    const handler = (data) => {
      // In a real implementation, we'd validate with AgentSchema here
      setAgents(data || []);
    };
    
    mockEventBus.on('agentUpdate', handler);

    // Initial fetch if available
    // In a real implementation, you might fetch initial data here
    
    return () => {
      mockEventBus.off('agentUpdate', handler);
    };
  }, []);

  return { agents, eventBus: mockEventBus }; // Return eventBus for potential external use
}