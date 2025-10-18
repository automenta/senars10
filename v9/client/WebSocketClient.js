import { EventEmitter } from 'events';
import { WebSocketUtils, DEFAULTS, MESSAGE_TYPES } from '../core/server/WebSocketUtils.js';

class WebSocketClient extends EventEmitter {
  constructor(url, options = {}) {
    super();
    this.url = url;
    this.options = {
      reconnectInterval: DEFAULTS.HEARTBEAT_INTERVAL,
      maxReconnectAttempts: 10,
      heartbeatInterval: DEFAULTS.HEARTBEAT_INTERVAL,
      ...options
    };

    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.subscriptions = new Set();
    this.messageQueue = [];
    this.clientId = null;
    this.connectionId = null;
  }

  async connect() {
    if (this.isConnected || this.ws) return;

    try {
      const WebSocketClass = await this._getWebSocketClass();
      this.ws = new WebSocketClass(this.url);

      this.ws.onopen = () => this._handleOpen();
      this.ws.onmessage = (event) => this._handleMessage(event);
      this.ws.onclose = (event) => this._handleClose(event);
      this.ws.onerror = (error) => this._handleError(error);

    } catch (error) {
      this.emit('error', error);
    }
  }

  async _getWebSocketClass() {
    if (typeof window !== 'undefined') {
      return WebSocket;
    }

    const wsModule = await import('ws');
    return wsModule.default;
  }

  _handleOpen() {
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.emit('connected');

    // Send queued messages
    this._processMessageQueue();

    // Start heartbeat
    this._startHeartbeat();
  }

  _handleMessage(event) {
    try {
      const message = WebSocketUtils.validateMessage(event.data);
      this.emit('message', message);

      // Handle specific message types
      if (message.type) {
        this._handleMessageType(message);
      }
    } catch (error) {
      this.emit('error', new Error(`Failed to parse message: ${error.message}`));
    }
  }

  _handleMessageType(message) {
    this.emit(message.type, message);

    // Handle special message types
    switch (message.type) {
      case MESSAGE_TYPES.WELCOME:
        this._handleWelcome(message);
        break;
      case MESSAGE_TYPES.HEARTBEAT:
        this._handleHeartbeat(message);
        break;
    }
  }

  _handleWelcome(message) {
    this.clientId = message.clientId;
    this.connectionId = message.connectionId;
  }

  _handleHeartbeat(message) {
    // Respond to heartbeat if needed
  }

  _handleClose(event) {
    this.isConnected = false;
    this._stopHeartbeat();
    this.emit('disconnected', event);

    // Attempt reconnection if not intentionally closed
    if (event.code !== 1000 && this.reconnectAttempts < this.options.maxReconnectAttempts) {
      this._scheduleReconnect();
    }
  }

  _handleError(error) {
    this.emit('error', error);
  }

  _processMessageQueue() {
    this.messageQueue.forEach(message => this.send(message));
    this.messageQueue = [];
  }

  _scheduleReconnect() {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    this.emit('reconnecting', this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.options.reconnectInterval);
  }

  _startHeartbeat() {
    this._stopHeartbeat(); // Clear any existing timer

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send(WebSocketUtils.createHeartbeatMessage());
      }
    }, this.options.heartbeatInterval);
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  send(message) {
    if (this.isConnected && this.ws) {
      try {
        const data = typeof message === 'string' ? message : JSON.stringify(message);
        this.ws.send(data);
        return true;
      } catch (error) {
        this.emit('error', error);
        return false;
      }
    } else {
      // Queue message for when connection is established
      if (this.messageQueue.length < DEFAULTS.MESSAGE_QUEUE_LIMIT) {
        this.messageQueue.push(message);
        return false;
      } else {
        this.emit('error', new Error('Message queue limit reached'));
        return false;
      }
    }
  }

  subscribe(eventType, callback) {
    this.on(eventType, callback);
    this.subscriptions.add(eventType);
  }

  unsubscribe(eventType, callback) {
    this.removeListener(eventType, callback);
    this.subscriptions.delete(eventType);
  }

  identify(clientType, version = '1.0.0', capabilities = []) {
    this.send({
      type: 'identify',
      clientType,
      version,
      capabilities
    });
  }

  subscribeToEvent(eventTypes, filters = {}) {
    this.send({
      type: 'subscribe',
      eventTypes,
      filters
    });
  }

  unsubscribeFromEvent(eventTypes = []) {
    this.send({
      type: 'unsubscribe',
      eventTypes
    });
  }

  sendCommand(command, data = {}) {
    this.send({
      type: 'command',
      command,
      data
    });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this._stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.isConnected = false;
    this.subscriptions.clear();
    this.messageQueue = [];
    this.clientId = null;
    this.connectionId = null;
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      url: this.url,
      clientId: this.clientId,
      connectionId: this.connectionId,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      subscriptions: Array.from(this.subscriptions)
    };
  }
}

export default WebSocketClient;