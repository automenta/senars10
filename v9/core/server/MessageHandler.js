import { WebSocketUtils, MESSAGE_TYPES } from './WebSocketUtils.js';
import ErrorHandler from './errorHandler.js';

class MessageHandler {
  constructor(webSocketServer) {
    this.wss = webSocketServer;
    this.handlers = new Map();
    this._registerDefaultHandlers();
  }

  _registerDefaultHandlers() {
    this.register('identify', this._handleIdentify.bind(this));
    this.register('heartbeat', this._handleHeartbeat.bind(this));
    this.register('subscribe', this._handleSubscription.bind(this));
    this.register('unsubscribe', this._handleUnsubscription.bind(this));
    this.register('task_stream', this._handleTaskStream.bind(this));
    this.register('stream_request', this._handleStreaming.bind(this));
    this.register('subscribe_to_task', this._handleTaskSubscription.bind(this));
    this.register('unsubscribe_from_task', this._handleTaskUnsubscription.bind(this));
    this.register('command', this._handleCommand.bind(this));
  }

  register(type, handler) {
    this.handlers.set(type, handler);
  }

  unregister(type) {
    this.handlers.delete(type);
  }

  handle(clientId, message) {
    const handler = this.handlers.get(message.type);

    if (handler) {
      handler(clientId, message);
    } else {
      this._handleCustomMessage(clientId, message);
    }
  }

  _handleIdentify(clientId, message) {
    const client = this.wss.clients.get(clientId);
    if (!client) return;

    Object.assign(client, {
      type: message.clientType || 'unknown',
      version: message.version || 'unknown',
      capabilities: message.capabilities || []
    });

    WebSocketUtils.debug(`Client ${clientId} identified as: ${client.type} v${client.version}`);
  }

  _handleHeartbeat(clientId, message) {
    // Heartbeat response - no action needed
  }

  _handleSubscription(clientId, message) {
    const { eventTypes = [], filters = {} } = message;

    if (!this.wss.subscriptions.has(clientId)) {
      this.wss.subscriptions.set(clientId, {
        eventTypes: new Set(),
        filters: {},
        subscribedAt: new Date()
      });
    }

    const subscription = this.wss.subscriptions.get(clientId);
    eventTypes.forEach(eventType => subscription.eventTypes.add(eventType));
    Object.assign(subscription.filters, filters);
    subscription.lastUpdated = new Date();

    this.wss.sendToClient(clientId, WebSocketUtils.createMessage(
      MESSAGE_TYPES.SUBSCRIPTION_CONFIRMED,
      { eventTypes: Array.from(subscription.eventTypes) }
    ));
  }

  _handleUnsubscription(clientId, message) {
    const { eventTypes = [] } = message;

    if (!this.wss.subscriptions.has(clientId)) return;

    const subscription = this.wss.subscriptions.get(clientId);

    eventTypes.length === 0 ?
      this.wss.subscriptions.delete(clientId) :
      (eventTypes.forEach(eventType => subscription.eventTypes.delete(eventType)),
       subscription.eventTypes.size === 0 && this.wss.subscriptions.delete(clientId));
  }

  _handleTaskStream(clientId, message) {
    const { taskId, action, data, streamType = 'task' } = message;

    // Delegate to StreamManager for consistent stream handling
    this.wss.streamManager.handleTaskStreamMessage(clientId, {
      taskId,
      action,
      data,
      streamType
    });
  }

  _handleStreaming(clientId, message) {
    const { streamId, action, data, streamType } = message;

    const actionHandlers = {
      'subscribe': () => this._handleStreamSubscription(clientId, streamId, streamType, data),
      'unsubscribe': () => this._handleStreamUnsubscription(clientId, streamId),
      'publish': () => this._handleStreamPublish(clientId, streamId, data),
      'broadcast': () => this._handleStreamBroadcast(clientId, streamType, data)
    };

    const handler = actionHandlers[action];
    handler 
      ? handler()
      : WebSocketUtils.warn(`Unknown streaming action: ${action}`);
  }

  _handleTaskSubscription(clientId, message) {
    const success = this.wss.streamManager.subscribeToTaskStream(clientId, message.taskId);
    if (success) {
      this.wss.sendToClient(clientId, WebSocketUtils.createMessage(
        MESSAGE_TYPES.SUBSCRIPTION_SUCCESS,
        { taskId: message.taskId }
      ));
    }
  }

  _handleTaskUnsubscription(clientId, message) {
    this.wss.streamManager.unsubscribeFromTaskStream(clientId, message.taskId);
  }

  _handleCommand(clientId, message) {
    const { command, data } = message;

    if (!this.wss.core?.messages) {
      WebSocketUtils.warn('Core messages component not available - command ignored');
      ErrorHandler.handleConnectionError(this.wss, clientId, message.command || 'unknown', 'Core not available');
      return;
    }

    const commandMap = {
      'start': 'cycle.start',
      'stop': 'cycle.stop',
      'pause': 'cycle.pause',
      'resume': 'cycle.resume',
      'step': 'cycle.step',
      'reset': 'cycle.reset',
      'throttle': 'cycle.throttle'
    };

    const internalCommand = commandMap[command];

    if (!internalCommand) {
      WebSocketUtils.warn(`Unknown command: ${command}`);
      return;
    }

    try {
      this._executeCommand(internalCommand, data);
      this.wss.sendToClient(clientId, WebSocketUtils.createSuccessResponse(command));
    } catch (error) {
      ErrorHandler.handleConnectionError(this.wss, clientId, command, error);
    }
  }

  _executeCommand(command, data) {
    try {
      if (command === 'cycle.throttle' && data && this.wss.core.cycle) {
        WebSocketUtils.debug(`Throttle request: ${data.value}%`);
      } else if (command === 'cycle.reset' && this.wss.core.cycle) {
        this.wss.core.cycle.cycleCount = 0;
        this.wss.core.messages.emit('cycle.stats', {
          cycles: this.wss.core.cycle.cycleCount,
          timestamp: Date.now()
        });
      } else {
        this.wss.core.messages.execute(command, data);
      }
    } catch (error) {
      WebSocketUtils.error(`Error executing internal command ${command}:`, error);
      throw error;
    }
  }

  _handleStreamSubscription(clientId, streamId, streamType, options = {}) {
    try {
      this.wss.streamManager.subscribeToStream(clientId, streamId, streamType, options);
    } catch (error) {
      ErrorHandler.handleStreamError(this.wss, clientId, streamId, 'subscribe', error);
    }
  }

  _handleStreamUnsubscription(clientId, streamId) {
    try {
      this.wss.streamManager.unsubscribeFromStream(clientId, streamId);
    } catch (error) {
      ErrorHandler.handleStreamError(this.wss, clientId, streamId, 'unsubscribe', error);
    }
  }

  _handleStreamPublish(clientId, streamId, data) {
    try {
      this.wss.streamManager.publishToStream(clientId, streamId, data);
    } catch (error) {
      ErrorHandler.handleStreamError(this.wss, clientId, streamId, 'publish', error);
    }
  }

  _handleStreamBroadcast(clientId, streamType, data) {
    if (!this.wss.streams) return;

    for (const [fullStreamId, stream] of this.wss.streams) {
      if (stream.type === streamType && stream.isActive) {
        this._handleStreamPublish(clientId, stream.id, data);
      }
    }

    if (this.wss.core?.messages?.emit) {
      this.wss.core.messages.emit(`stream.broadcast.${streamType}`, {
        source: clientId,
        data,
        streamType,
        timestamp: new Date().toISOString()
      });
    }
  }

  _handleCustomMessage(clientId, message) {
    this.wss.emit('message', {
      clientId,
      clientType: this.wss.clients.get(clientId)?.type,
      message,
      timestamp: new Date()
    });
  }
}

export default MessageHandler;