import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import WebSocketConnectionManager from '../utils/WebSocketConnectionManager';
import { createWebSocketConfig } from '../utils/webSocketUtils';
import { MESSAGE_TYPES } from '@core/shared/ClientConstants.js';

const useWebSocket = (url, config = {}) => {
  const [messages, setMessages] = useState([]);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const [data, setData] = useState({});

  const wsManagerRef = useRef(null);
  const configRef = useRef(createWebSocketConfig(config));

  // Initialize WebSocket connection
  useEffect(() => {
    wsManagerRef.current?.destroy();

    wsManagerRef.current = new WebSocketConnectionManager(url, {
      config: configRef.current,
      setData,
      setError,
      setLastMessage,
      setMessages
    });

    wsManagerRef.current.connect();

    return () => {
      wsManagerRef.current?.destroy();
      wsManagerRef.current = null;
    };
  }, [url]);

  // Handle URL changes
  useEffect(() => {
    wsManagerRef.current && (wsManagerRef.current.disconnect(), setTimeout(() => wsManagerRef.current?.connect(), 100));
  }, [url]);

  const sendRawMessage = useCallback((message) => wsManagerRef.current?.send(message) || false, []);

  const sendMessage = useCallback((command, payload = {}) =>
    sendRawMessage({ type: MESSAGE_TYPES.CONTROL, command, payload }), [sendRawMessage]);

  const taskHandlers = useMemo(() =>
    wsManagerRef.current?.getTaskHandlers() || {
      handleAddTask: () => console.error('WebSocket not ready: handleAddTask'),
      handleUpdateTask: () => console.error('WebSocket not ready: handleUpdateTask'),
      handleDeleteTask: () => console.error('WebSocket not ready: handleDeleteTask')
    }, []);

  const requestConcepts = useCallback(() => sendMessage('get_concepts'), [sendMessage]);
  const requestTopTasks = useCallback(() => sendMessage('get_top_tasks'), [sendMessage]);
  const requestState = useCallback(() => sendRawMessage({ type: 'request_state' }), [sendRawMessage]);

  const disconnect = useCallback(() => (wsManagerRef.current?.disconnect(), setError(null)), []);

  const reconnect = useCallback(() => {
    wsManagerRef.current?.disconnect();
    setTimeout(() => wsManagerRef.current?.connect(), 1000);
  }, []);

  const on = useCallback((event, listener) => wsManagerRef.current?.on(event, listener), []);
  const off = useCallback((event, listener) => wsManagerRef.current?.off(event, listener), []);

  // Manage message history retention
  useEffect(() => {
    configRef.current.enableMessageHistory && wsManagerRef.current &&
      setMessages(prev => wsManagerRef.current.manageMessageHistory(prev));
  }, [messages]);

  const sortedTasks = useMemo(() =>
    wsManagerRef.current?.getSortedTasks(data.tasks || []) || [], [data.tasks]);

  const status = wsManagerRef.current?.getStatus();
  const connectionStatus = status?.status || 'disconnected';

  return {
    isConnected: status?.isConnected || false,
    connectionStatus,
    error: error || (connectionStatus === 'error' ? 'WebSocket connection error' : null),
    messages: configRef.current.enableMessageHistory ? messages : [],
    lastMessage,
    tasks: sortedTasks,
    logs: data.logs || [],
    concepts: data.concepts || [],
    memoryTasks: data.memoryTasks || [],
    reasonerStats: data.reasonerStats || null,
    sendRawMessage,
    sendMessage,
    handleAddTask: taskHandlers.handleAddTask,
    handleUpdateTask: taskHandlers.handleUpdateTask,
    handleDeleteTask: taskHandlers.handleDeleteTask,
    requestConcepts,
    requestTopTasks,
    requestState,
    reconnect,
    disconnect,
    on,
    off,
    reconnectAttempts: status?.reconnectAttempts || 0
  };
};

export default useWebSocket;