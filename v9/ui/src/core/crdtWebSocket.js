import { useEffect, useState, useMemo, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import WebSocketConnectionManager from '../utils/WebSocketConnectionManager';
import { sortTasksByPriority } from '../utils/webSocketUtils';

// Yjs utilities abstraction - simplified
const createYjsObservers = (ydoc, setters) => {
  const { setTasks, setLogs, setConcepts, setReasonerStats } = setters;

  return {
    setup: (provider) => {
      const yTasks = ydoc.getArray('tasks');
      const yLogs = ydoc.getArray('logs');
      const yConcepts = ydoc.getArray('concepts');

      const observers = {
        tasks: () => setTasks(yTasks.toArray().map(task =>
          task instanceof Y.Map ? task.toJSON() : task)),
        logs: () => setLogs(yLogs.toArray()),
        concepts: () => setConcepts(yConcepts.toArray())
      };

      Object.entries(observers).forEach(([key, observer]) =>
        ydoc.getArray(key).observe(observer));

      provider.awareness.on('change', () =>
        setReasonerStats(Array.from(provider.awareness.getStates().values())
          .find(state => state.reasonerStats)?.reasonerStats || null));

      return () => Object.keys(observers).forEach(key =>
        ydoc.getArray(key).unobserve(observers[key]));
    }
  };
};

const useCrdtWebSocket = (url) => {
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [reasonerStats, setReasonerStats] = useState(null);

  useEffect(() => {
    if (!url) return;

    const wsProvider = new WebsocketProvider(url, 'senars', ydoc);
    setProvider(wsProvider);

    wsProvider.on('status', event => setConnectionStatus(event.status));

    // Use abstracted Yjs observer pattern
    const observers = createYjsObservers(ydoc, { setTasks, setLogs, setConcepts, setReasonerStats });
    const cleanup = observers.setup(wsProvider);

    return () => {
      cleanup?.();
      wsProvider.disconnect();
    };
  }, [url, ydoc]);

  const sendMessage = useCallback((command, payload = {}) => {
    if (provider?.ws?.readyState === WebSocket.OPEN) {
      provider.ws.send(JSON.stringify({ type: 'control', command, payload }));
    }
  }, [provider]);

  const sendRawMessage = useCallback((message) => {
    if (provider?.ws?.readyState === WebSocket.OPEN) {
      provider.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, [provider]);

  // Use consolidated WebSocket manager for task operations
  const wsManager = useMemo(() => new WebSocketConnectionManager('', {
    config: { enableMessageHistory: false }
  }), []);

  const sortedTasks = useMemo(() =>
    sortTasksByPriority(tasks), [tasks]);

  const taskHandlers = useMemo(() => ({
    handleAddTask: (task) => {
      wsManager.handleAddTask(task);
      sendMessage('add_task', task);
    },
    handleUpdateTask: (task) => {
      wsManager.handleUpdateTask(task);
      sendMessage('update_task', task);
    },
    handleDeleteTask: (task) => {
      wsManager.handleDeleteTask(task);
      sendMessage('delete_task', { id: task.id });
    }
  }), [wsManager, sendMessage]);

  return {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    error: null,
    tasks: sortedTasks,
    logs,
    concepts,
    reasonerStats,
    sendRawMessage,
    sendMessage,
    handleAddTask: taskHandlers.handleAddTask,
    handleUpdateTask: taskHandlers.handleUpdateTask,
    handleDeleteTask: taskHandlers.handleDeleteTask,
  };
};

export default useCrdtWebSocket;
