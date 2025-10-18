import { MESSAGE_TYPES } from './constants.js';

/**
 * Message creation and formatting utilities
 * Centralized message handling for consistent communication
 */

export class MessageUtils {
  static createMessage(type, payload = {}, timestamp = null) {
    return {
      type,
      payload,
      timestamp: timestamp || new Date().toISOString()
    };
  }

  static createResponse(command, status, data = {}) {
    return status === 'error' ? this.createErrorResponse(command, data) : this.createSuccessResponse(command, data);
  }

  static createErrorResponse(command, error) {
    return {
      type: 'response',
      command,
      status: 'error',
      error: error.message || error || 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }

  static createSuccessResponse(command, data = {}) {
    return {
      type: 'response',
      command,
      status: 'success',
      data,
      timestamp: new Date().toISOString()
    };
  }

  static createWelcomeMessage(clientId, connectionId) {
    return this.createMessage(MESSAGE_TYPES.WELCOME, {
      clientId,
      serverInfo: {
        version: '2.0.0',
        features: ['nars_protocol', 'realtime_streaming', 'task_sync']
      },
      connectionId
    });
  }

  static createHeartbeatMessage() {
    return this.createMessage(MESSAGE_TYPES.HEARTBEAT);
  }

  static createStreamMessage(type, streamId, data, source = null) {
    return this.createMessage(type, { streamId, data, source });
  }

  static createTaskMessage(type, taskId, data, source = null) {
    return this.createMessage(type, { taskId, data, source });
  }

  static createEventMessage(eventType, data, filters = {}) {
    return this.createMessage(MESSAGE_TYPES.EVENT, { eventType, data, filters });
  }

  static createTypedMessage(messageType, payload, context = {}) {
    return this.createMessage(messageType, { ...payload, ...context });
  }

  static validateMessage(data) {
    try {
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (error) {
      throw new Error(`Invalid message format: ${error.message}`);
    }
  }

  static formatTaskData(task) {
    if (!task) return null;

    return {
      id: task.hashCode?.() || task.id || this.generateId('task'),
      content: task.toString?.() || task.content || 'Unknown Task',
      priority: task.getPriority?.() || task.priority || 0.5,
      status: this.getTaskStatus(task),
      type: this.getTaskType(task),
      createdAt: task.createdAt || Date.now(),
      lastModified: task.getAccessedAt?.() || Date.now(),
      punctuation: task.punctuation || '.',
      truth: task.truth || null,
      occurrenceTime: task.occurrenceTime || Date.now(),
      derivationPath: task.derivationPath || []
    };
  }

  static formatConceptData(concept) {
    if (!concept) return null;

    return {
      id: concept.id,
      content: concept.term?.toString() || concept.concept?.term?.toString() || concept.term || 'Unknown Concept',
      priority: concept.priority || 0,
      taskCount: concept.taskCount || 0,
      type: concept.term?.termType || 'concept'
    };
  }

  static getTaskStatus(task) {
    return !task ? 'Unknown' : task.isBelief?.() ? 'Belief' : task.isGoal?.() ? 'Goal' : task.isQuestion?.() ? 'Question' : 'Derived';
  }

  static getTaskType(task) {
    return !task ? 'Unknown' : task.punctuation === '.' ? 'Belief' : task.punctuation === '!' ? 'Goal' : task.punctuation === '?' ? 'Question' : 'Derived';
  }

  static generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default MessageUtils;