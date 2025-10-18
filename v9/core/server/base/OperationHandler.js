/**
 * Base operation handler class
 * Provides consistent abstractions for common server operations
 */

import ErrorHandler from '../errorHandler.js';

export class OperationHandler {
  constructor(server) {
    this.server = server;
    this.operations = new Map();
  }

  register(operationName, handler) {
    this.operations.set(operationName, handler);
  }

  unregister(operationName) {
    this.operations.delete(operationName);
  }

  async execute(operationName, clientId, data = {}) {
    const handler = this.operations.get(operationName);

    if (!handler) {
      throw new Error(`Unknown operation: ${operationName}`);
    }

    try {
      return await handler.call(this, clientId, data);
    } catch (error) {
      ErrorHandler.handleGenericError(
        this.server,
        clientId,
        operationName,
        error,
        { operation: operationName, data }
      );
      throw error;
    }
  }

  canExecute(operationName, clientId) {
    const client = this.server.clients.get(clientId);
    return client && this.operations.has(operationName);
  }

  getAvailableOperations() {
    return Array.from(this.operations.keys());
  }
}

export default OperationHandler;