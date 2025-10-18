import { WebSocketUtils, DEFAULTS, MESSAGE_TYPES, STREAM_TYPES } from './WebSocketUtils.js';
import ErrorHandler from './errorHandler.js';

class StreamManager {
  constructor(webSocketServer) {
    this.wss = webSocketServer;
    this.taskStreams = new Map();
    this.streams = new Map();
  }

  createTaskStream(taskId, options = {}) {
    if (this.taskStreams.has(taskId)) {
      return this.taskStreams.get(taskId);
    }

    const stream = WebSocketUtils.createTaskStream(taskId, options);
    this.taskStreams.set(taskId, stream);
    return stream;
  }

  subscribeToTaskStream(clientId, taskId) {
    const stream = this.taskStreams.get(taskId) || this.createTaskStream(taskId);
    stream.participants.add(clientId);

    if (stream.history.length > 0) {
      const historyMessage = WebSocketUtils.createTaskMessage(
        MESSAGE_TYPES.TASK_STREAM_HISTORY,
        taskId,
        { history: stream.history.slice(-DEFAULTS.TASK_HISTORY_LIMIT) }
      );
      this.wss.sendToClient(clientId, historyMessage);
    }

    return true;
  }

  publishTaskUpdate(taskId, updateData) {
    const stream = this.taskStreams.get(taskId);
    if (!WebSocketUtils.isActiveStream(stream)) return false;

    const update = {
      type: 'update',
      data: updateData,
      timestamp: new Date(),
      action: updateData.action || 'update'
    };

    stream.history.push(update);

    if (stream.history.length > stream.options.bufferSize) {
      stream.history = stream.history.slice(-stream.options.bufferSize);
    }

    const updateMessage = WebSocketUtils.createTaskMessage(
      MESSAGE_TYPES.TASK_STREAM_UPDATE,
      taskId,
      updateData
    );

    WebSocketUtils.broadcastToParticipants(this.wss, stream.participants, updateMessage);
    return true;
  }

  unsubscribeFromTaskStream(clientId, taskId) {
    const stream = this.taskStreams.get(taskId);
    if (stream) {
      stream.participants.delete(clientId);
    }
  }

  createStream(streamId, streamType, options = {}) {
    if (this.streams.has(streamId)) {
      return this.streams.get(streamId);
    }

    const stream = WebSocketUtils.createStream(streamId, streamType, options);
    this.streams.set(streamId, stream);
    return stream;
  }

  subscribeToStream(clientId, streamId, streamType, options = {}) {
    const fullStreamId = `${streamType}:${streamId}`;
    const stream = this.streams.get(fullStreamId) || this.createStream(fullStreamId, streamType, options);

    stream.participants.add(clientId);

    const confirmMessage = WebSocketUtils.createMessage(
      MESSAGE_TYPES.STREAM_SUBSCRIPTION_CONFIRMED,
      { streamId: fullStreamId, status: 'success' }
    );
    this.wss.sendToClient(clientId, confirmMessage);

    WebSocketUtils.debug(`Client ${clientId} subscribed to stream ${fullStreamId}`);
  }

  unsubscribeFromStream(clientId, streamId) {
    for (const [fullStreamId, stream] of this.streams) {
      if (stream.participants.has(clientId)) {
        stream.participants.delete(clientId);

        if (stream.participants.size === 0 && stream.id === streamId) {
          this.streams.delete(fullStreamId);
        }
      }
    }

    const confirmMessage = WebSocketUtils.createMessage(
      MESSAGE_TYPES.STREAM_UNSUBSCRIBED,
      { streamId, status: 'success' }
    );
    this.wss.sendToClient(clientId, confirmMessage);

    WebSocketUtils.debug(`Client ${clientId} unsubscribed from stream ${streamId}`);
  }

  publishToStream(clientId, streamId, data) {
    try {
      const stream = this.streams.get(streamId);
      if (!WebSocketUtils.isActiveStream(stream)) {
        ErrorHandler.handleStreamError(this.wss, clientId, streamId, 'publish', 'Stream not found or inactive');
        return false;
      }

      WebSocketUtils.addToStreamBuffer(stream, data, clientId, stream.bufferSize);

      const dataMessage = WebSocketUtils.createStreamMessage(
        MESSAGE_TYPES.STREAM_DATA,
        streamId,
        data,
        clientId
      );

      WebSocketUtils.broadcastToParticipants(this.wss, stream.participants, dataMessage, clientId);
      return true;
    } catch (error) {
      ErrorHandler.handleStreamError(this.wss, clientId, streamId, 'publish', error);
      return false;
    }
  }

  broadcastToStreamType(clientId, streamType, data) {
    try {
      for (const [fullStreamId, stream] of this.streams) {
        if (stream.type === streamType && stream.isActive) {
          this.publishToStream(clientId, stream.id, data);
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
    } catch (error) {
      ErrorHandler.handleStreamError(this.wss, clientId, streamType, 'broadcast', error);
    }
  }

  handleTaskStreamMessage(clientId, message) {
    const { taskId, action, data, streamType = STREAM_TYPES.TASK } = message;

    const stream = this.taskStreams.get(taskId) || this.createTaskStream(taskId, { streamType });
    stream.participants.add(clientId);

    const historyEntry = {
      clientId,
      action,
      data,
      timestamp: new Date()
    };
    stream.history.push(historyEntry);

    const broadcastMessage = WebSocketUtils.createTaskMessage(
      MESSAGE_TYPES.TASK_UPDATE,
      taskId,
      data,
      clientId
    );
    this.wss.broadcast(broadcastMessage, [clientId]);
  }

  handleStreamRequest(clientId, message) {
    const { streamId, action, data, streamType } = message;

    const actionHandlers = {
      'subscribe': () => this.subscribeToStream(clientId, streamId, streamType, data),
      'unsubscribe': () => this.unsubscribeFromStream(clientId, streamId),
      'publish': () => this.publishToStream(clientId, streamId, data),
      'broadcast': () => this.broadcastToStreamType(clientId, streamType, data)
    };

    const handler = actionHandlers[action];
    handler ? handler() : WebSocketUtils.warn(`Unknown streaming action: ${action}`);
  }

  getStats() {
    const subscriptionStats = this.getSubscriptionStats();
    const totalStreamParticipants = Array.from(this.streams.values())
      .reduce((sum, stream) => sum + stream.participants.size, 0);

    return {
      taskStreams: this.taskStreams.size,
      totalStreams: this.streams.size,
      totalStreamParticipants,
      subscriptionStats
    };
  }

  getSubscriptionStats() {
    return Array.from(this.wss.subscriptions.values())
      .flatMap(sub => Array.from(sub.eventTypes))
      .reduce((counts, eventType) => ({
        ...counts,
        [eventType]: (counts[eventType] || 0) + 1
      }), {});
  }

  cleanup() {
    this.taskStreams.clear();
    this.streams.clear();
  }

  // Event publishing for external components
  publishEvent(eventType, data, filters = {}) {
    try {
      const eventMessage = WebSocketUtils.createMessage(MESSAGE_TYPES.EVENT, {
        eventType,
        data,
        filters
      });

      for (const [clientId, subscription] of this.wss.subscriptions) {
        if (this.matchesSubscription(subscription, eventType, filters) &&
            this.wss.clients.has(clientId)) {
          this.wss.sendToClient(clientId, eventMessage);
        }
      }
    } catch (error) {
      ErrorHandler.handleStreamError(this.wss, null, eventType, 'publishEvent', error);
    }
  }

  matchesSubscription(subscription, eventType, eventFilters) {
    const hasEventType = subscription.eventTypes.has(eventType) || subscription.eventTypes.has('*');
    if (!hasEventType) return false;

    return WebSocketUtils.checkEventFilters(subscription.filters, eventFilters);
  }
}

export default StreamManager;