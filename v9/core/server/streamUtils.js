import { STREAM_TYPES, DEFAULTS } from './constants.js';

/**
 * Stream management utilities
 * Handles stream creation, buffering, and participant management
 */

export class StreamUtils {
  static hasParticipants(stream) {
    return stream?.participants?.size > 0;
  }

  static isActiveStream(stream) {
    return stream?.isActive && this.hasParticipants(stream);
  }

  static addToStreamBuffer(stream, data, source, maxSize = null) {
    const bufferSize = maxSize || stream.options?.bufferSize || DEFAULTS.STREAM_BUFFER_SIZE;
    stream.buffer.push({ source, data, timestamp: new Date() });

    if (stream.buffer.length > bufferSize) {
      stream.buffer = stream.buffer.slice(-bufferSize);
    }
  }

  static broadcastToParticipants(wss, participants, message, excludeClient = null) {
    const excludeSet = new Set(excludeClient ? [excludeClient] : []);
    participants.forEach(participantId => {
      if (!excludeSet.has(participantId)) {
        wss.sendToClient(participantId, message);
      }
    });
  }

  static createStream(streamId, streamType, options = {}) {
    return {
      id: streamId,
      type: streamType,
      participants: new Set(),
      buffer: [],
      bufferSize: options.bufferSize || DEFAULTS.STREAM_BUFFER_SIZE,
      createdAt: new Date(),
      isActive: true
    };
  }

  static createTaskStream(taskId, options = {}) {
    return {
      id: taskId,
      participants: new Set(),
      history: [],
      options: {
        bufferSize: options.bufferSize || DEFAULTS.TASK_STREAM_BUFFER_SIZE,
        retentionTime: options.retentionTime || DEFAULTS.RETENTION_TIME,
        streamType: options.streamType || STREAM_TYPES.TASK
      },
      createdAt: new Date(),
      isActive: true
    };
  }

  static subscribeToStream(stream, clientId) {
    if (!stream.participants.has(clientId)) {
      stream.participants.add(clientId);
      return true;
    }
    return false;
  }

  static unsubscribeFromStream(stream, clientId) {
    return stream.participants.delete(clientId);
  }

  static publishToStream(stream, data, source = null) {
    if (!this.isActiveStream(stream)) return false;

    const update = {
      type: 'update',
      data,
      source,
      timestamp: new Date(),
      action: data.action || 'update'
    };

    stream.history.push(update);

    if (stream.history.length > (stream.options?.bufferSize || DEFAULTS.TASK_STREAM_BUFFER_SIZE)) {
      stream.history = stream.history.slice(-stream.history.length);
    }

    return update;
  }

  static getStreamStats(stream) {
    return {
      id: stream.id,
      type: stream.type,
      participantCount: stream.participants.size,
      bufferSize: stream.buffer?.length || 0,
      historySize: stream.history?.length || 0,
      isActive: stream.isActive,
      createdAt: stream.createdAt
    };
  }
}

export default StreamUtils;