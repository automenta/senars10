import { Logger, ObjectUtils } from './utilities.js';
import { ErrorHandler } from './validation.js';
import { STATES } from './constants.js';

class Component {
  constructor() {
    this.status = STATES.UNINITIALIZED;
    this.flags = { initialized: false, started: false };
    this.config = {};
  }

  async initialize(config = {}) {
    this._setState(STATES.INITIALIZING);
    this.config = { ...this.getDefaultConfig(), ...config };
    await this._safeExecute(async () => await this._doInitialize(this.config), 'initialize');
    this._setState(STATES.INITIALIZED, { initialized: true });
  }

  async _doInitialize() {}

  async start() {
    await this._safeExecute(async () => await this._doStart(), 'start');
    this._setState(STATES.RUNNING, { started: true });
  }

  async _doStart() {}

  async stop() {
    await this._safeExecute(async () => await this._doStop(), 'stop');
    this._setState(STATES.STOPPED, { started: false });
  }

  async _doStop() {}

  async destroy() {
    await this._safeExecute(async () => await this._doDestroy(), 'destroy');
    this._setState(STATES.DESTROYED, { initialized: false, started: false });
  }

  async _doDestroy() {}

  _setState(status, flags) {
    this.status = status;
    Object.assign(this.flags, flags);
  }

  getHealth() { return { status: 'healthy', issues: [] }; }
  getMetrics() { return {}; }
  getStatus() { return { status: this.status }; }

  on(event, handler) {
    this._requireMessages().on(event, handler);
  }

  off(event, handler) {
    this._requireMessages().off(event, handler);
  }

  emit(event, data) {
    this._requireMessages().emit(event, data);
  }

  _requireMessages() {
    if (!this.core?.messages) {
      // During initialization, messages might not be available yet
      if (this.status === STATES.UNINITIALIZED || this.status === STATES.INITIALIZING) {
        throw new Error(`${this.constructor.name}: Cannot access messages during initialization. Component may not be fully initialized yet.`);
      }
      throw new Error(`${this.constructor.name}: Messages component not available on core.`);
    }
    return this.core.messages;
  }

  _handleError(error, context = '') {
    const errorBoundary = ErrorHandler.createErrorBoundary(this.constructor.name, this.core?.messages);
    return errorBoundary.wrap(() => { throw error })();
  }

  async _safeExecute(operation, operationName) {
    try {
      return await operation();
    } catch (error) {
      return ErrorHandler.handle(error, `${this.constructor.name}:${operationName}`, this.core?.messages);
    }
  }

  registerCommand(command, handler) {
    this._requireMessages().registerCommand(command, handler);
  }

  executeCommand(command, data) {
    return this._requireMessages().execute(command, data);
  }

  registerProcessor(name, processor, options = {}) {
    this._requireMessages().registerProcessor(name, processor, options);
  }

  async processMessage(message, options = {}) {
    return this._requireMessages().process(message, options);
  }

  registerErrorHandler(errorType, handler) {
    this._requireMessages().registerErrorHandler(errorType, handler);
  }

  setRetryPolicy(operation, policy) {
    this._requireMessages().setRetryPolicy(operation, policy);
  }

  getPerformanceStats() {
    return Object.assign(this.getHealth(), this.getMetrics(), this.getStatus(), {
      component: this.constructor.name,
      timestamp: new Date().toISOString()
    });
  }

  // Common configuration methods to reduce duplication
  getDefaultConfig() {
    return {};
  }

  getConfig() {
    return { ...this.config };
  }

  updateConfig(config) {
    if (!config) return;
    this.config = ObjectUtils.mergeDeep(this.config, config);
  }

  // Common statistics method with base implementation
  getStats() {
    return {
      status: this.status,
      initialized: this.flags.initialized,
      started: this.flags.started
    };
  }
}

export default Component;