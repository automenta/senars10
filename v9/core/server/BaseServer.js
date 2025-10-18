import Component from '../base/Component.js';
import { WebSocketUtils, DEFAULTS } from './WebSocketUtils.js';

class BaseServer extends Component {
  constructor(core = null) {
    super();
    this.core = core;
    this.wss = null;
    this.server = null;
    this.clients = new Map();
    this.subscriptions = new Map();
    this.taskStreams = new Map();
    this.streams = new Map();
    this.isRunning = false;
    this.startTime = null;
  }

  async initialize(config = {}) {
     await super.initialize(config);
     this.config = this.mergeConfig(this.getDefaultConfig(), config);
   }

   mergeConfig(baseConfig, overrides) {
     return WebSocketUtils.mergeConfig(baseConfig, overrides);
   }

   getConfig(key, defaultValue = null) {
     return WebSocketUtils.getConfigValue(this.config, key, defaultValue);
   }

  getDefaultConfig() {
    return {
      port: DEFAULTS.PORT,
      host: DEFAULTS.HOST,
      enabled: DEFAULTS.ENABLED,
      heartbeatInterval: DEFAULTS.HEARTBEAT_INTERVAL,
      maxConnectionsPerIP: DEFAULTS.MAX_CONNECTIONS_PER_IP,
      maxTotalConnections: DEFAULTS.MAX_TOTAL_CONNECTIONS
    };
  }

  async start() {
    if (this.isRunning) return;

    if (!this.server) {
      WebSocketUtils.warn('Server not initialized, skipping start');
      return;
    }

    const port = this.getConfig('port', DEFAULTS.PORT);
    const host = this.getConfig('host', DEFAULTS.HOST);
    const enabled = this.getConfig('enabled', DEFAULTS.ENABLED);

    if (!this.shouldStartServer(enabled)) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.server.listen(port, host, (error) => {
        if (error) {
          WebSocketUtils.handleError(`starting server on ${host}:${port}`, error);
          reject(error);
        } else {
          this.onServerStart(port, host);
          resolve();
        }
      });
    });
  }

  shouldStartServer(enabled) {
    const isTestEnvironment = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined);
    return (enabled ?? !isTestEnvironment) ? true : (WebSocketUtils.debug('Server is disabled, skipping start'), false);
  }

  onServerStart(port, host) {
    this.isRunning = true;
    this.startTime = Date.now();
    WebSocketUtils.debug(`Server running on ws://${host}:${port}`);
    this.onStart?.();
  }

  async stop() {
    if (!this.isRunning) return;

    return new Promise((resolve) => {
      try {
        this.closeAllClients();
        this.closeServers(() => {
          this.onServerStop();
          resolve();
        });
      } catch (error) {
        WebSocketUtils.handleError('stopping server', error);
        resolve(); // Don't block shutdown on errors
      }
    });
  }

  closeAllClients() {
    for (const [clientId, client] of this.clients) {
      client.ws?.close(1000, 'Server shutting down');
    }
    this.clients.clear();
  }

  closeServers(callback) {
    if (this.wss) {
      this.wss.close(() => {
        if (this.server) {
          this.server.close(() => {
            callback();
          });
        } else {
          callback();
        }
      });
    } else if (this.server) {
      this.server.close(() => {
        callback();
      });
    } else {
      callback();
    }
  }

  onServerStop() {
    this.isRunning = false;
    this.cleanup();
    WebSocketUtils.debug('Server stopped');
    this.onStop?.();
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (WebSocketUtils.isValidClient(client)) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        WebSocketUtils.handleError('sending message', error, clientId);
      }
    }
  }

  broadcast(message, excludeClients = []) {
    const excludeSet = new Set(excludeClients);

    for (const [clientId, client] of this.clients) {
      if (!excludeSet.has(clientId) && WebSocketUtils.isValidClient(client)) {
        try {
          client.ws.send(JSON.stringify(message));
        } catch (error) {
          WebSocketUtils.handleError('broadcasting', error, clientId);
        }
      }
    }
  }

  sendToClientType(clientType, message) {
    for (const [clientId, client] of this.clients) {
      if (client.type === clientType && WebSocketUtils.isValidClient(client)) {
        try {
          client.ws.send(JSON.stringify(message));
        } catch (error) {
          WebSocketUtils.handleError(`sending to client type ${clientType}`, error, clientId);
        }
      }
    }
  }

  getClient(clientId) {
    return this.clients.get(clientId);
  }

  getClientsByType(clientType) {
    return Array.from(this.clients.values()).filter(client => client.type === clientType);
  }

  getValidClients() {
    return Array.from(this.clients.values()).filter(WebSocketUtils.isValidClient);
  }

  subscribeToTaskStream(clientId, taskId) {
    if (this.streamManager) {
      return this.streamManager.subscribeToTaskStream(clientId, taskId);
    }
    // Fallback for servers without StreamManager
    return this._fallbackSubscribeToTaskStream(clientId, taskId);
  }

  publishTaskUpdate(taskId, updateData) {
    if (this.streamManager) {
      return this.streamManager.publishTaskUpdate(taskId, updateData);
    }
    // Fallback for servers without StreamManager
    return this._fallbackPublishTaskUpdate(taskId, updateData);
  }
  
  _fallbackSubscribeToTaskStream(clientId, taskId) {
    if (!this.taskStreams.has(taskId)) {
      this.taskStreams.set(taskId, {
        id: taskId,
        participants: new Set(),
        history: [],
        createdAt: new Date(),
        isActive: true
      });
    }
    const stream = this.taskStreams.get(taskId);
    stream.participants.add(clientId);
    return true;
  }

  _fallbackPublishTaskUpdate(taskId, updateData) {
    const stream = this.taskStreams.get(taskId);
    if (!WebSocketUtils.isActiveStream(stream)) return false;

    const update = {
      type: 'update',
      data: updateData,
      timestamp: new Date(),
      action: updateData.action || 'update'
    };

    stream.history.push(update);

    if (stream.history.length > (stream.options?.bufferSize || DEFAULTS.TASK_STREAM_BUFFER_SIZE)) {
      stream.history = stream.history.slice(-stream.history.length);
    }

    const updateMessage = WebSocketUtils.createTaskMessage('task_stream_update', taskId, updateData);
    WebSocketUtils.broadcastToParticipants(this, stream.participants, updateMessage);
    return true;
  }

  publishEvent(eventType, data, filters = {}) {
    const eventMessage = WebSocketUtils.createEventMessage(eventType, data, filters);

    for (const [clientId, subscription] of this.subscriptions) {
      if (this.matchesSubscription(subscription, eventType, filters) &&
          this.clients.has(clientId)) {
        this.sendToClient(clientId, eventMessage);
      }
    }
  }

  matchesSubscription(subscription, eventType, eventFilters) {
    const hasEventType = subscription.eventTypes?.has(eventType) || subscription.eventTypes?.has('*');
    if (!hasEventType) return false;

    return WebSocketUtils.checkEventFilters(subscription.filters || {}, eventFilters);
  }

  getStats() {
    return {
      isRunning: this.isRunning,
      uptime: this.isRunning ? Date.now() - (this.startTime || Date.now()) : 0,
      clientCount: this.clients.size,
      subscriptionCount: this.subscriptions.size,
      taskStreamCount: this.taskStreams.size,
      streamCount: this.streams.size
    };
  }

  cleanup() {
    this.clients.clear();
    this.subscriptions.clear();
    this.taskStreams.clear();
    this.streams.clear();
  }
}

export default BaseServer;