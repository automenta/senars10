import { WebSocketUtils } from './WebSocketUtils.js';

class Logger {
  static DEBUG = 'debug';
  static INFO = 'info';
  static WARN = 'warn';
  static ERROR = 'error';

  static logLevel = this.INFO; // Default log level

  static setLogLevel(level) {
    const levels = [this.DEBUG, this.INFO, this.WARN, this.ERROR];
    if (levels.includes(level)) {
      this.logLevel = level;
    }
  }

  static shouldLog(level) {
    const levels = [this.DEBUG, this.INFO, this.WARN, this.ERROR];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  static formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    return `${prefix} ${message}${args.length > 0 ? ' | ' + JSON.stringify(args) : ''}`;
  }

  static debug(message, ...args) {
    if (this.shouldLog(this.DEBUG)) {
      console.debug(this.formatMessage(this.DEBUG, message, ...args));
    }
  }

  static info(message, ...args) {
    if (this.shouldLog(this.INFO)) {
      console.info(this.formatMessage(this.INFO, message, ...args));
    }
  }

  static warn(message, ...args) {
    if (this.shouldLog(this.WARN)) {
      console.warn(this.formatMessage(this.WARN, message, ...args));
    }
  }

  static error(message, ...args) {
    if (this.shouldLog(this.ERROR)) {
      console.error(this.formatMessage(this.ERROR, message, ...args));
    }
  }

  // Server-specific logging methods
  static server(message, ...args) {
    this.info(`[SERVER] ${message}`, ...args);
  }

  static client(clientId, message, ...args) {
    this.debug(`[CLIENT:${clientId}] ${message}`, ...args);
  }

  static connection(clientId, message, ...args) {
    this.info(`[CONNECTION:${clientId}] ${message}`, ...args);
  }

  static stream(streamId, message, ...args) {
    this.debug(`[STREAM:${streamId}] ${message}`, ...args);
  }

  static task(taskId, message, ...args) {
    this.debug(`[TASK:${taskId}] ${message}`, ...args);
  }

  static command(command, message, ...args) {
    this.debug(`[COMMAND:${command}] ${message}`, ...args);
  }

  static performance(operation, duration, ...args) {
    this.debug(`[PERF:${operation}] Completed in ${duration}ms`, ...args);
  }
}

export default Logger;