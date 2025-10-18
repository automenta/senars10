import { CONNECTION_STATUS, CLIENT_WS_CONFIG as DEFAULT_WS_CONFIG } from '@core/shared/ClientConstants.js';

export { DEFAULT_WS_CONFIG };

// WebSocket configuration with defaults
export const createWebSocketConfig = (overrides = {}) => ({
  ...DEFAULT_WS_CONFIG,
  ...overrides
});

// Message parsing utilities - consolidated and optimized
export const parseWebSocketMessage = async (event) => {
  const parseData = (data) => {
    if (data instanceof ArrayBuffer) return JSON.parse(new TextDecoder().decode(data));
    if (typeof data === 'string') return JSON.parse(data);
    return data;
  };

  try {
    if (event.data instanceof Blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(JSON.parse(reader.result));
        reader.onerror = () => reject(new Error('Failed to read blob data'));
        reader.readAsText(event.data);
      });
    }
    return parseData(event.data);
  } catch (error) {
    throw new Error(`WebSocket message parse error: ${error.message}`);
  }
};

// Enhanced message parsing with type checking
export const parseWebSocketMessageSafe = async (event) => {
  try {
    return await parseWebSocketMessage(event);
  } catch (error) {
    console.error('Error parsing WebSocket message:', error);
    return null;
  }
};

// Task management utilities
export const createTask = (task) => ({
  ...task,
  id: task.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  createdAt: task.createdAt || new Date().toISOString(),
  type: task.type || 'input',
  status: task.status || 'pending',
  lastModified: Date.now()
});

export const sortTasksByPriority = (tasks) =>
  [...tasks].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

// Message history management - optimized

// Connection state management
export const createConnectionManager = () => {
  let status = CONNECTION_STATUS.DISCONNECTED;
  let reconnectAttempts = 0;
  const listeners = new Set();

  return {
    get status() { return status; },
    setStatus: (newStatus) => {
      status = newStatus;
      listeners.forEach(listener => listener(status));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    incrementReconnectAttempts: () => reconnectAttempts++,
    resetReconnectAttempts: () => { reconnectAttempts = 0; },
    get reconnectAttempts() { return reconnectAttempts; }
  };
};

// URL validation
export const isValidWebSocketUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
  } catch {
    return false;
  }
};

// Safe message sending
export const createSafeSend = (ws, isConnected) => (message) => {
  if (ws && isConnected) {
    try {
      ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }
  return false;
};

// State update handlers - consolidated and optimized
export const createStateUpdater = (setData) => (message) => {
  const updateStrategies = {
    [MESSAGE_TYPES.STATE_UPDATE]: (payload) => {
      const { tasks, concepts, logs, stats } = payload;
      setData(prev => ({
        ...prev,
        tasks: tasks || prev.tasks || [],
        concepts: concepts || prev.concepts || [],
        logs: logs || prev.logs || [],
        reasonerStats: stats || prev.reasonerStats
      }));
    },
    [MESSAGE_TYPES.CONCEPTS_UPDATE]: (payload) =>
      setData(prev => ({ ...prev, concepts: payload || [] })),
    [MESSAGE_TYPES.TOP_TASKS_UPDATE]: (payload) =>
      setData(prev => ({ ...prev, memoryTasks: payload || [] })),
    // Add a generic handler for other message types
    default: (payload) => {
      // Generic handler for any other message types that may need state updates  
    }
  };

  (updateStrategies[message.type] || updateStrategies.default)(message.payload);
};

// WebSocket utilities - consolidated and deduplicated

// Common WebSocket patterns abstraction - consolidated
export const createWebSocketHook = (WebSocketClass, config = {}) => {
  const {
    onMessage,
    onConnect,
    onError,
    onDisconnect,
    setData,
    setError,
    setLastMessage,
    setMessages,
    enableMessageHistory = false,
    maxMessages = 1000,
    messageRetention = 500
  } = config;

  const processMessageSafely = (event, processor) => {
    try {
      return parseWebSocketMessage(event);
    } catch (parseError) {
      console.error('Error parsing WebSocket message:', parseError);
      return null;
    }
  };

  return {
    handleMessage: (event) => {
      setLastMessage?.(event);
      onMessage?.(event);

      if (enableMessageHistory && setMessages) {
        const message = processMessageSafely(event);
        if (message) {
          setMessages(prev => manageMessageHistory([...prev, message], maxMessages, messageRetention));
        } else {
          setMessages?.(prev => [...prev, {
            type: 'error',
            data: event.data,
            error: 'Parse error'
          }]);
        }
      }

      if (setData) {
        const message = processMessageSafely(event);
        if (message) createStateUpdater(setData)(message);
      }
    },

    handleConnect: () => {
      setError?.(null);
      onConnect?.();
    },

    handleError: (error) => {
      setError?.({ message: error.message, timestamp: new Date().toISOString() });
      onError?.(error);
    },

    handleDisconnect: (event) => {
      onDisconnect?.(event);
    }
  };
};

// Message history management - optimized
export const manageMessageHistory = (messages, maxMessages, messageRetention) =>
  messages.length > maxMessages ? messages.slice(-messageRetention) : messages;

// Terse syntax utility functions
export const safeArray = (arr) => Array.isArray(arr) ? arr : [];
export const safeObject = (obj) => obj && typeof obj === 'object' ? obj : {};

// Legacy compatibility exports - simplified
export const createStateMessageHandler = createStateUpdater;