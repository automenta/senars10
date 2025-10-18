import {
  isValidWebSocketUrl,
  createConnectionManager,
  parseWebSocketMessage,
  createTask,
  sortTasksByPriority,
  createStateUpdater
} from './webSocketUtils';
import { CONNECTION_STATUS, CLIENT_WS_CONFIG as DEFAULT_WS_CONFIG, MESSAGE_TYPES } from '@core/shared/ClientConstants.js';

// Unified WebSocket manager - handles both connection and state management
class WebSocketConnectionManager {
  constructor(url, options = {}) {
    if (!isValidWebSocketUrl(url)) throw new Error(`Invalid WebSocket URL: ${url}`);

    const { config = {}, setData, setError, setLastMessage, setMessages } = options;

    this.url = url;
    this.config = { ...DEFAULT_WS_CONFIG, ...config };
    this.setData = setData;
    this.setError = setError;
    this.setLastMessage = setLastMessage;
    this.setMessages = setMessages;

    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.reconnectTimeoutId = null;
    this.events = {};

    this.connectionManager = createConnectionManager();
    this.connectionManager.subscribe(status => this.emit('statusChange', status));
  }

  async connect() {
    if (!this._isConnectionValid()) return;

    this.connectionManager.setStatus(CONNECTION_STATUS.CONNECTING);

    try {
      const WebSocketClass = typeof window !== 'undefined' ? WebSocket : (await import('ws')).default;
      this.ws = new WebSocketClass(this.url);

      this._setupEventHandlers();

    } catch (error) {
      this._handleConnectionError(error);
    }
  }

  _isConnectionValid() {
    return this.connectionManager &&
           !this.isConnected &&
           this.connectionManager.status !== CONNECTION_STATUS.CONNECTING;
  }

  _setupEventHandlers() {
    const handlers = {
      open: () => this._handleOpen(),
      message: (event) => this._handleIncomingMessage(event),
      close: (event) => this._handleClose(event),
      error: (error) => this._handleConnectionError(error)
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      this.ws[`on${event}`] = handler;
    });
  }

  _handleOpen() {
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.connectionManager.setStatus(CONNECTION_STATUS.CONNECTED);
    this.connectionManager.resetReconnectAttempts();
    this.emit('connect');
    this.handleConnect();
  }

  _handleIncomingMessage(event) {
    this.emit('message', event);
    this.handleMessage(event);
  }

  _handleClose(event) {
    this.isConnected = false;
    this.connectionManager?.setStatus(CONNECTION_STATUS.DISCONNECTED);
    this.emit('disconnect', event);

    const shouldReconnect = !event.wasClean &&
      this.reconnectAttempts < this.config.maxReconnectAttempts &&
      this.connectionManager;

    shouldReconnect && this.scheduleReconnect();
  }

  _handleConnectionError(error) {
    this.isConnected = false;
    this.connectionManager?.setStatus(CONNECTION_STATUS.ERROR);
    this.emit('error', error);
    this.handleError(error);
  }

  scheduleReconnect() {
    if (!this.connectionManager) return;

    this.reconnectAttempts++;
    this.connectionManager.setStatus(CONNECTION_STATUS.RECONNECTING);
    this.connectionManager.incrementReconnectAttempts();

    this.reconnectTimeoutId = setTimeout(() => this.connect(), this.config.reconnectInterval);
  }

  // Higher-level message and state management - consolidated
  async handleMessage(event) {
    this.setLastMessage?.(event);

    const message = await this._parseMessageSafely(event);

    // Add to message history if enabled
    if (this.config.enableMessageHistory && this.setMessages && message) {
      this._addToMessageHistory(message);
    }

    // Update state if message is valid
    if (this.setData && message) {
      this.handleStateUpdate(message);
    }
  }

  async _parseMessageSafely(event) {
    try {
      return await parseWebSocketMessage(event);
    } catch (parseError) {
      // Add error to message history if enabled
      if (this.config.enableMessageHistory && this.setMessages) {
        this._addToMessageHistory({
          type: 'error',
          data: event.data,
          error: parseError.message
        });
      }
      return null;
    }
  }
  
  _addToMessageHistory(message) {
    this.setMessages?.(prev => this._manageHistory([...prev, message]));
  }
  
  _manageHistory(messages) {
    return this.config.enableMessageHistory && messages.length > this.config.maxMessages
      ? messages.slice(-this.config.messageRetention)
      : messages;
  }

  handleStateUpdate(message) {
    createStateUpdater(this.setData)(message);
  }

  handleConnect() {
    this.setError?.(null);
    if (this.config.autoRequestState) {
      setTimeout(() => this.send({ type: MESSAGE_TYPES.REQUEST_STATE }), 100);
    }
  }

  handleError(error) {
    this.setError?.({ message: error.message, timestamp: new Date().toISOString() });
  }

  // Consolidated task management
  handleTaskOperation(operation, task) {
    const taskHandlers = {
      add: (task) => this._handleAddTask(task),
      update: (task) => this._handleUpdateTask(task),
      delete: (task) => this._handleDeleteTask(task)
    };

    const handler = taskHandlers[operation];
    handler?.(task);
  }

  _handleAddTask(task) {
    const newTask = createTask(task);
    this._updateTaskState(prev => ({
      ...prev,
      tasks: [...(prev.tasks || []), newTask]
    }));
    this._sendTaskCommand('add_task', newTask);
  }

  _handleUpdateTask(task) {
    this._updateTaskState(prev => ({
      ...prev,
      tasks: (prev.tasks || []).map(t =>
        t.id === task.id ? { ...t, ...task, lastModified: Date.now() } : t
      )
    }));
    this._sendTaskCommand('update_task', task);
  }

  _handleDeleteTask(task) {
    this._updateTaskState(prev => ({
      ...prev,
      tasks: (prev.tasks || []).filter(t => t.id !== task.id)
    }));
    this._sendTaskCommand('delete_task', { id: task.id });
  }

  _updateTaskState(updater) {
    this.setData?.(updater);
  }

  _sendTaskCommand(command, payload) {
    this.send({ type: MESSAGE_TYPES.CONTROL, command, payload });
  }

  getSortedTasks(tasks) {
    return sortTasksByPriority(tasks || []);
  }

  manageMessageHistory(messages) {
    return this.config.enableMessageHistory && messages.length > this.config.maxMessages
      ? messages.slice(-this.config.messageRetention)
      : messages;
  }

  send(message) {
    if (!this.isConnected || !this.ws) {
      this.emit('error', new Error('WebSocket not connected'));
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }

  disconnect() {
    // Clear reconnection timer
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    // Close WebSocket connection
    this.ws?.close(1000, 'Manual disconnect');
    this.isConnected = false;
    this.connectionManager.setStatus(CONNECTION_STATUS.DISCONNECTED);
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      status: this.connectionManager.status,
      reconnectAttempts: this.reconnectAttempts,
      url: this.url
    };
  }

  getTaskHandlers() {
    return {
      handleAddTask: this.handleAddTask.bind(this),
      handleUpdateTask: this.handleUpdateTask.bind(this),
      handleDeleteTask: this.handleDeleteTask.bind(this)
    };
  }

  on(event, listener) {
    (this.events[event] ||= []).push(listener);
    return this;
  }

  off(event, listener) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(l => l !== listener);
    }
    return this;
  }

  emit(event, ...args) {
    this.events[event]?.forEach(listener => listener(...args));
    return this;
  }

  removeAllListeners() {
    this.events = {};
  }

  destroy() {
    this.removeAllListeners();
    this.disconnect();
    this.connectionManager = null;
  }
}

export default WebSocketConnectionManager;