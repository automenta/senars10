import { DEFAULTS } from '../server/WebSocketUtils.js';

// Client-side specific connection defaults that match UI expectations
export const CLIENT_DEFAULTS = {
  ...DEFAULTS,
  defaultPort: 8080,
  fallbackPort: 8081,
  maxHistorySize: 50,
  maxReconnectAttempts: 10,
  reconnectInterval: 3000,
  messageRetention: 500,
  maxMessages: 1000,
  autoRequestState: true,
  enableMessageHistory: true
};

export const CLIENT_WS_CONFIG = {
  maxReconnectAttempts: 10,
  reconnectInterval: 3000,
  messageRetention: 500,
  maxMessages: 1000,
  autoRequestState: true,
  enableMessageHistory: true
};

// Client-specific status constants
export const CONNECTION_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
};

// UI expects these message types for state updates
export const MESSAGE_TYPES = {
  // Control messages
  CONTROL: 'control',
  REQUEST_STATE: 'request_state',

  // State updates - these match what the UI expects to receive from the server
  STATE_UPDATE: 'state_update',
  CONCEPTS_UPDATE: 'concepts_update',
  TOP_TASKS_UPDATE: 'top_tasks_update',

  // Legacy types (for backward compatibility)
  log: 'log',
  task: 'task',
  concept: 'concept',
  reasonerStats: 'reasoner_stats'
};

// Connection defaults
export const CONNECTION_DEFAULTS = {
  defaultPort: 8080,
  fallbackPort: 8081,
  maxHistorySize: 50,
  maxReconnectAttempts: 10,
  reconnectInterval: 3000,
  messageRetention: 500,
  maxMessages: 1000,
  autoRequestState: true,
  enableMessageHistory: true
};