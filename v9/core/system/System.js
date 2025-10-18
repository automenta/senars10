import createCore from '../orchestration/createCore.js';
import { Logger } from '../base/utilities.js';
import { DEFAULTS } from '../base/constants.js';
import { Task, Punctuation, TruthValue } from '../Task.js';
import { Term } from '../Term.js';

class System {
  constructor(config = {}) {
    this.config = config;
    this.core = null;
    this.isRunning = false;
    this.startTime = null;
    this.taskCount = 0;
    this.eventHandlers = new Map();
  }

  _requireRunning(operation) {
    if (!this.core) {
      throw new Error(`${this.constructor.name}: System is not running. Call start() before ${operation}.`);
    }
  }

  _logError(message, error) {
    Logger.error(`${this.constructor.name}: ${message}`, error);
  }

  async start() {
    if (this.core) {
      Logger.warn(`${this.constructor.name}: System is already running.`);
      return;
    }

    try {
      this.core = await createCore(this.config);
      await this.core.start();
      this.isRunning = true;
      this.startTime = Date.now();

      this._setupDefaultEventHandlers();

      Logger.debug(`${this.constructor.name}: System started successfully`);

      // Emit system start event
      if (this.core.messages) {
        this.core.messages.emit('system.started', {
          timestamp: this.startTime
        });
      }
    } catch (error) {
      Logger.error(`${this.constructor.name}: Failed to start system`, error);
      throw error;
    }
  }

  async stop() {
    if (!this.core) return;

    try {
      await this.core.stop();
      await this.core.destroy();
      this.isRunning = false;

      // Emit system stop event BEFORE nullifying core
      if (this.core.messages) {
        this.core.messages.emit('system.stopped', {
          timestamp: Date.now(),
          uptime: this.startTime ? Date.now() - this.startTime : 0
        });
      }

      this.core = null;
      this.eventHandlers.clear();

      Logger.debug(`${this.constructor.name}: System stopped`);
    } catch (error) {
      this._logError('Error stopping system', error);
      throw error;
    }
  }

  input(task) {
    this._requireRunning('inputting tasks');

    if (!task || typeof task !== 'object') {
      throw new Error(`${this.constructor.name}: Task must be an object`);
    }

    if (!task.term || typeof task.term !== 'string') {
      throw new Error(`${this.constructor.name}: Task must have a valid term`);
    }

    const enhancedTask = {
      term: task.term,
      punctuation: task.punctuation || '.',
      truth: task.truth || { frequency: DEFAULTS.DEFAULT_FREQUENCY, confidence: DEFAULTS.DEFAULT_CONFIDENCE },
      priority: task.priority || DEFAULTS.DEFAULT_PRIORITY,
      timestamp: Date.now(),
      accessedAt: Date.now(),
      createdAt: Date.now(),
      ...task
    };

    this.taskCount++;
    this.core.messages.emit('task.input', enhancedTask);

    // Add to focus to make it available for processing during cycles
    if (this.core.focus) {
      try {
        const priority = enhancedTask.priority || 0.5;
        this.core.focus.addTaskToFocus(enhancedTask, priority);
      } catch (error) {
        console.error('Error adding task to focus:', error);
      }
    }

    // Add to memory for long-term storage
    if (this.core.memory) {
      try {
        this.core.memory.addTask(enhancedTask, Date.now());
      } catch (error) {
        console.error('Error adding task to memory:', error);
      }
    }

    return enhancedTask;
  }


  on(event, handler) {
    this._requireRunning('registering event handlers');

    if (typeof handler !== 'function') {
      throw new Error(`${this.constructor.name}: Event handler must be a function`);
    }

    const wrappedHandler = (...args) => {
      try {
        return handler(...args);
      } catch (error) {
        this._logError(`Error in event handler for '${event}'`, error);
      }
    };

    this.core.messages.on(event, wrappedHandler);
    this.eventHandlers.set(handler, { event, wrappedHandler });

    return this; // For method chaining
  }

  off(event, handler) {
    if (!this.core) {
      return this; // Fail silently if trying to unregister from a stopped system
    }

    const handlerInfo = this.eventHandlers.get(handler);
    if (handlerInfo) {
      this.core.messages.off(handlerInfo.event, handlerInfo.wrappedHandler);
      this.eventHandlers.delete(handler);
    }

    return this; // For method chaining
  }

  async ask(question, options = {}) {
    this._requireRunning('asking questions');

    const questionTask = {
      term: question,
      punctuation: '?',
      priority: options.priority ?? DEFAULTS.QUESTION_PRIORITY,
      timeout: options.timeout ?? DEFAULTS.QUESTION_TIMEOUT
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off('answer', answerHandler);
        reject(new Error('Question timeout'));
      }, questionTask.timeout);

      const answerHandler = (answer) => {
        clearTimeout(timeout);
        this.off('answer', answerHandler);
        resolve(answer);
      };

      this.on('answer', answerHandler);
      this.input(questionTask);
    });
  }

  remember(statement, truth = { frequency: DEFAULTS.DEFAULT_FREQUENCY, confidence: DEFAULTS.DEFAULT_CONFIDENCE }) {
    this._requireRunning('remembering statements');

    const beliefTask = {
      term: statement,
      punctuation: '.',
      truth,
      priority: DEFAULTS.BELIEF_PRIORITY
    };

    return this.input(beliefTask);
  }

  want(goal, priority = DEFAULTS.GOAL_PRIORITY) {
    this._requireRunning('setting goals');

    const goalTask = {
      term: goal,
      punctuation: '!',
      truth: { frequency: DEFAULTS.DEFAULT_FREQUENCY, confidence: DEFAULTS.DEFAULT_CONFIDENCE },
      priority
    };

    return this.input(goalTask);
  }

  getHealth() {
    if (!this.core) {
      return { status: 'stopped', uptime: 0, tasksProcessed: 0 };
    }

    const coreHealth = {
      config: this.core.config?.getHealth?.() || { status: 'unknown' },
      messages: this.core.messages?.getHealth?.() || { status: 'unknown' },
      rules: this.core.rules?.getHealth?.() || { status: 'unknown' },
      memory: this.core.memory?.getHealth?.() || { status: 'unknown' },
      reasoning: this.core.reasoning?.getStats?.() || { status: 'unknown' },
      webSocketServer: this.core.webSocketServer?.getStats?.() || { status: 'unknown' }
    };

    return {
      status: this.isRunning ? 'running' : 'stopped',
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      tasksProcessed: this.taskCount,
      coreHealth,
      eventHandlers: this.eventHandlers.size
    };
  }

  getStatus() {
    const health = this.getHealth();

    return {
      ...health,
      config: this.config,
      timestamp: Date.now(),
      memoryUsage: this._getMemoryUsage()
    };
  }

  _getMemoryUsage() {
    const BYTES_TO_MB = 1024 * 1024;
    return process.memoryUsage ? {
      rss: Math.round(process.memoryUsage().rss / BYTES_TO_MB),
      heapUsed: Math.round(process.memoryUsage().heapUsed / BYTES_TO_MB),
      heapTotal: Math.round(process.memoryUsage().heapTotal / BYTES_TO_MB)
    } : null;
  }

  getMetrics() {
    if (!this.core) {
      return {};
    }

    return {
      system: {
        uptime: this.getHealth().uptime,
        tasksProcessed: this.taskCount,
        eventHandlers: this.eventHandlers.size,
        isRunning: this.isRunning
      },
      components: {
        config: this.core.config?.getMetrics?.() || {},
        messages: this.core.messages?.getStats?.() || {},
        rules: this.core.rules?.getStats?.() || {},
        memory: this.core.memory?.getStats?.() || {},
        reasoning: this.core.reasoning?.getStats?.() || {}
      }
    };
  }

  async execute(command, data = {}) {
    this._requireRunning('executing commands');

    try {
      return await this.core.messages.execute(command, data);
    } catch (error) {
      this._logError(`Error executing command '${command}'`, error);
      throw error;
    }
  }

  async process(message) {
    this._requireRunning('processing messages');

    try {
      return await this.core.messages.process(message);
    } catch (error) {
      this._logError('Error processing message', error);
      throw error;
    }
  }

  _setupDefaultEventHandlers() {
    this.on('task.input', (task) => {
      Logger.debug(`${this.constructor.name}: Task input:`, task.term);
    });

    this.on('reasoning_error', (error) => {
      Logger.error(`${this.constructor.name}: Reasoning error`, error);
    });

    this.on('memory.full', (info) => {
      Logger.warn(`${this.constructor.name}: Memory capacity reached`, info);
    });

    this.on('task.processed', (result) => {

    });
  }

  removeAllListeners() {
    for (const [handler, info] of this.eventHandlers) {
      this.off(info.event, handler);
    }
    return this;
  }
}

export default System;