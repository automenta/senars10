import { DEFAULTS, MESSAGE_TYPES, CLIENT_STATUS, STREAM_TYPES } from './constants.js';
import ErrorHandler from './errorHandler.js';
import MessageUtils from './messageUtils.js';
import ClientUtils from './clientUtils.js';
import StreamUtils from './streamUtils.js';
import ConfigUtils from './configUtils.js';
import Logger from './Logger.js';

// Lazy config manager initialization
let configManager = null;
const getConfigManager = () => configManager ??= import('./ServerConfig.js').then(({ default: ServerConfig }) => (configManager = new ServerConfig()).initialize() && configManager);
class WebSocketUtils {
  static get DEFAULTS() { return DEFAULTS; }
  static get MESSAGE_TYPES() { return MESSAGE_TYPES; }
  static get CLIENT_STATUS() { return CLIENT_STATUS; }
  static get STREAM_TYPES() { return STREAM_TYPES; }

  static generateId(prefix = 'id') {
    return ClientUtils.generateId(prefix);
  }

  static generateClientId() {
    return ClientUtils.generateClientId();
  }

  static generateConnectionId() {
    return ClientUtils.generateConnectionId();
  }

  static getClientIP(request) {
    return ClientUtils.getClientIP(request);
  }

  static isValidClient(client) {
    return ClientUtils.isValidClient(client);
  }

  static isConnectionAllowed(clients, clientIP, config) {
    return ClientUtils.isConnectionAllowed(clients, clientIP, config);
  }

  static isConnectionRateAllowed(connectionRateTracker, clientIP, config) {
    return ClientUtils.isConnectionRateAllowed(connectionRateTracker, clientIP, config);
  }

  static createClientInfo(clientId, ws, request, clientIP) {
    return ClientUtils.createClientInfo(clientId, ws, request, clientIP);
  }

  static getClientsByType(clients, clientType) {
    return ClientUtils.getClientsByType(clients, clientType);
  }

  static getValidClients(clients) {
    return ClientUtils.getValidClients(clients);
  }

  static countByProperty(collection, property) {
    return ClientUtils.countByProperty(collection, property);
  }

  static createMessage(type, payload = {}, timestamp = null) {
    return MessageUtils.createMessage(type, payload, timestamp);
  }

  static createResponse(command, status, data = {}) {
    return MessageUtils.createResponse(command, status, data);
  }

  static createErrorResponse(command, error) {
    return MessageUtils.createErrorResponse(command, error);
  }

  static createSuccessResponse(command, data = {}) {
    return MessageUtils.createSuccessResponse(command, data);
  }

  static createWelcomeMessage(clientId, connectionId) {
    return MessageUtils.createWelcomeMessage(clientId, connectionId);
  }

  static createHeartbeatMessage() {
    return MessageUtils.createHeartbeatMessage();
  }

  static createStreamMessage(type, streamId, data, source = null) {
    return MessageUtils.createStreamMessage(type, streamId, data, source);
  }

  static createTaskMessage(type, taskId, data, source = null) {
    return MessageUtils.createTaskMessage(type, taskId, data, source);
  }

  static createEventMessage(eventType, data, filters = {}) {
    return MessageUtils.createEventMessage(eventType, data, filters);
  }

  static createTypedMessage(messageType, payload, context = {}) {
    return MessageUtils.createTypedMessage(messageType, payload, context);
  }

  static validateMessage(data) {
    return MessageUtils.validateMessage(data);
  }

  static formatTaskData(task) {
    return MessageUtils.formatTaskData(task);
  }

  static formatConceptData(concept) {
    return MessageUtils.formatConceptData(concept);
  }

  static getTaskStatus(task) {
    return MessageUtils.getTaskStatus(task);
  }

  static getTaskType(task) {
    return MessageUtils.getTaskType(task);
  }

  static hasParticipants(stream) {
    return StreamUtils.hasParticipants(stream);
  }

  static isActiveStream(stream) {
    return StreamUtils.isActiveStream(stream);
  }

  static addToStreamBuffer(stream, data, source, maxSize = null) {
    return StreamUtils.addToStreamBuffer(stream, data, source, maxSize);
  }

  static broadcastToParticipants(wss, participants, message, excludeClient = null) {
    return StreamUtils.broadcastToParticipants(wss, participants, message, excludeClient);
  }

  static createStream(streamId, streamType, options = {}) {
    return StreamUtils.createStream(streamId, streamType, options);
  }

  static createTaskStream(taskId, options = {}) {
    return StreamUtils.createTaskStream(taskId, options);
  }

  static handleError(operation, error, clientId = null) {
    return ErrorHandler.handleError(operation, error, clientId);
  }

  static sendError(wss, clientId, operation, error) {
    return ErrorHandler.sendError(wss, clientId, operation, error);
  }

  static handleAndSendError(wss, operation, error, clientId = null) {
    return ErrorHandler.handleAndSendError(wss, operation, error, clientId);
  }

  static handleContextualError(wss, clientId, operation, error, context = {}) {
    return ErrorHandler.handleContextualError(wss, clientId, operation, error, context);
  }

  static handleConnectionError(wss, clientId, operation, error) {
    return ErrorHandler.handleConnectionError(wss, clientId, operation, error);
  }

  static handleStreamError(wss, clientId, streamId, operation, error) {
    return ErrorHandler.handleStreamError(wss, clientId, streamId, operation, error);
  }

  static handleTaskError(wss, clientId, taskId, operation, error) {
    return ErrorHandler.handleTaskError(wss, clientId, taskId, operation, error);
  }

  static handleGenericError(wss, clientId, operation, error, context = {}) {
    return ErrorHandler.handleGenericError(wss, clientId, operation, error, context);
  }

  static withErrorHandling(operation, wss, operationName, clientId = null) {
    return ErrorHandler.withErrorHandling(operation, wss, operationName, clientId);
  }

  static getConfigValue(config, key, defaultValue) {
    return ConfigUtils.getConfigValue(config, key, defaultValue);
  }

  static mergeConfig(baseConfig, overrides) {
    return ConfigUtils.mergeConfig(baseConfig, overrides);
  }

  static getServerPort() {
    return ConfigUtils.getServerPort(getConfigManager());
  }

  static getServerHost() {
    return ConfigUtils.getServerHost(getConfigManager());
  }

  static getHeartbeatInterval() {
    return ConfigUtils.getHeartbeatInterval(getConfigManager());
  }

  static getConnectionLimits() {
    return ConfigUtils.getConnectionLimits(getConfigManager());
  }

  static getStreamSettings() {
    return ConfigUtils.getStreamSettings(getConfigManager());
  }

  static isFeatureEnabled(feature) {
    return ConfigUtils.isFeatureEnabled(getConfigManager(), feature);
  }

  static extractLegacyConcepts(core) {
    if (!core?.memory?.conceptStorage) return [];

    const concepts = [];
    for (const [hash, concept] of core.memory.conceptStorage) {
      concepts.push({
        id: hash,
        content: concept.term?.toString() || concept.name || 'Unknown Concept',
        priority: concept.taskTable ? concept.taskTable.size : 0,
        type: concept.term?.termType || 'concept'
      });
    }
    return concepts;
  }

  static checkEventFilters(subscriptionFilters, eventFilters) {
    for (const [key, value] of Object.entries(subscriptionFilters)) {
      if (eventFilters[key] !== value) return false;
    }
    return true;
  }

  static getSystemStats(core) {
    return {
      isRunning: false,
      isPaused: true,
      cycles: 0,
      tasks: 0,
      concepts: 0,
      timestamp: Date.now()
    };
  }

  static extractSystemState(core) {
    if (!core?.memory) return { tasks: [], concepts: [], stats: {} };

    const allTasks = core.memory.getAllTasks?.() || [];
    const tasks = allTasks.map(task => this.formatTaskData(task)).filter(Boolean);

    const concepts = core.memory.getTopConcepts ?
      core.memory.getTopConcepts(50).map(c => this.formatConceptData(c)).filter(Boolean) :
      this.extractLegacyConcepts(core);

    return { tasks, concepts, stats: {} };
  }

  static addSystemStatsToState(core, state) {
    state.stats = core.cycle ? {
      isRunning: core.cycle.isRunning,
      isPaused: core.cycle.isPaused,
      cycles: core.cycle.cycleCount,
      tasks: state.tasks.length,
      concepts: state.concepts.length,
      timestamp: Date.now()
    } : core.messages ? this.getSystemStats(core) : state.stats;

    return state;
  }

  static createCompleteStateMessage(core) {
    const state = this.extractSystemState(core);
    this.addSystemStatsToState(core, state);
    return this.createMessage(MESSAGE_TYPES.COMPLETE_STATE, state);
  }

  static log(level, message, ...args) {
    Logger.log(level, message, ...args);
  }

  static debug(message, ...args) {
    Logger.debug(message, ...args);
  }

  static warn(message, ...args) {
    Logger.warn(message, ...args);
  }

  static error(message, ...args) {
    Logger.error(message, ...args);
  }
}

// Export all utilities for external use
export {
  DEFAULTS,
  MESSAGE_TYPES,
  CLIENT_STATUS,
  STREAM_TYPES,
  ErrorHandler,
  MessageUtils,
  ClientUtils,
  StreamUtils,
  ConfigUtils,
  WebSocketUtils
};

export default WebSocketUtils;