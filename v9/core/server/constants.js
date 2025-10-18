/**
 * Centralized constants for WebSocket server functionality
 * Following DRY principle - single source of truth for all constants
 */

export const DEFAULTS = Object.freeze({
  PORT: 8080,
  HOST: 'localhost',
  HEARTBEAT_INTERVAL: 30000,
  MAX_CONNECTIONS_PER_IP: 10,
  MAX_TOTAL_CONNECTIONS: 1000,
  MAX_CONNECTION_RATE: 10,
  CONNECTION_RATE_WINDOW: 60000,
  STREAM_BUFFER_SIZE: 100,
  TASK_STREAM_BUFFER_SIZE: 50,
  TASK_HISTORY_LIMIT: 10,
  RETENTION_TIME: 3600000,
  CLIENT_TIMEOUT_MULTIPLIER: 2,
  MESSAGE_QUEUE_LIMIT: 1000,
  ENABLED: true
});

export const MESSAGE_TYPES = Object.freeze({
  WELCOME: 'welcome',
  HEARTBEAT: 'heartbeat',
  COMPLETE_STATE: 'complete_state',
  SUBSCRIPTION_CONFIRMED: 'subscription_confirmed',
  SUBSCRIPTION_SUCCESS: 'subscription_success',
  TASK_UPDATE: 'task_update',
  TASK_STREAM_UPDATE: 'task_stream_update',
  TASK_STREAM_HISTORY: 'task_stream_history',
  STREAM_SUBSCRIPTION_CONFIRMED: 'stream_subscription_confirmed',
  STREAM_UNSUBSCRIBED: 'stream_unsubscribed',
  STREAM_DATA: 'stream_data',
  STREAM_ERROR: 'stream_error',
  COMMAND_RESPONSE: 'command_response',
  EVENT: 'event',
  ERROR: 'error'
});

export const CLIENT_STATUS = Object.freeze({
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error'
});

export const STREAM_TYPES = Object.freeze({
  TASK: 'task',
  GENERAL: 'general'
});

export const LOG_LEVELS = Object.freeze({
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
});

export const COMMAND_MAP = Object.freeze({
  'start': 'cycle.start',
  'stop': 'cycle.stop',
  'pause': 'cycle.pause',
  'resume': 'cycle.resume',
  'step': 'cycle.step',
  'reset': 'cycle.reset',
  'throttle': 'cycle.throttle'
});