import Logger from './Logger.js';

/**
 * Centralized error handling utilities
 * Provides consistent error handling patterns across the server
 */

export class ErrorHandler {
  static handleError(operation, error, clientId = null) {
    const errorMsg = `Error ${operation}${clientId ? ` for client ${clientId}` : ''}: ${error.message || error}`;
    Logger.error(errorMsg);
    return errorMsg;
  }

  static sendError(wss, clientId, operation, error) {
    const errorResponse = this.createErrorResponse(operation, error);
    wss?.sendToClient?.(clientId, errorResponse);
  }

  static handleAndSendError(wss, operation, error, clientId = null) {
    const errorMsg = this.handleError(operation, error, clientId);
    if (wss && clientId) {
      this.sendError(wss, clientId, operation, error);
    }
    return errorMsg;
  }

  static handleContextualError(wss, clientId, operation, error, context = {}) {
    const contextStr = Object.keys(context).length > 0 ? ` for ${Object.entries(context).map(([k, v]) => `${k}: ${v}`).join(', ')}` : '';
    const errorMsg = `${operation} failed${contextStr}${clientId ? ` (client: ${clientId})` : ''}: ${error.message || error}`;
    Logger.error(errorMsg);

    if (wss && clientId) {
      wss.sendToClient(clientId, this.createErrorResponse(operation, { message: errorMsg, ...context }));
    }
    return errorMsg;
  }

  static handleConnectionError(wss, clientId, operation, error) {
    return this.handleContextualError(wss, clientId, operation, error);
  }

  static handleStreamError(wss, clientId, streamId, operation, error) {
    return this.handleContextualError(wss, clientId, operation, error, { streamId });
  }

  static handleTaskError(wss, clientId, taskId, operation, error) {
    return this.handleContextualError(wss, clientId, operation, error, { taskId });
  }

  static handleGenericError(wss, clientId, operation, error, context = {}) {
    return this.handleContextualError(wss, clientId, operation, error, context);
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

  static withErrorHandling(operation, wss, operationName, clientId = null) {
    try {
      return operation();
    } catch (error) {
      return this.handleAndSendError(wss, operationName, error, clientId);
    }
  }
}

export default ErrorHandler;