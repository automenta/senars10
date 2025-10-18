import Component from '../base/Component.js';
import { Logger } from '../base/utilities.js';
import { DEFAULTS } from '../base/constants.js';

class Cycle extends Component {
  constructor() {
    super();
    this.isRunning = false;
    this.isPaused = true; // Start in paused state by default
    this.cycleTimer = null;
    this.cycleIntervalMs = DEFAULTS.CYCLE_INTERVAL;
    this.cycleCount = 0; // Track the number of cycles executed
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.cycleIntervalMs = config.cycleIntervalMs ?? this.cycleIntervalMs;
    
    // Register commands for cycle control
    if (this.core && this.core.messages) {
      this.core.messages.registerCommand('cycle.start', () => this.start());
      this.core.messages.registerCommand('cycle.stop', () => this.stop());
      this.core.messages.registerCommand('cycle.pause', () => this.pause());
      this.core.messages.registerCommand('cycle.resume', () => this.resume());
      this.core.messages.registerCommand('cycle.step', () => this.step());
      this.core.messages.registerCommand('cycle.reset', () => this.reset());
      this.core.messages.registerCommand('cycle.getStatus', () => this.getDetailedStats());
    }
  }

  async start() {
    if (this.isRunning) {
      Logger.warn('Cycle is already running');
      return;
    }

    this.isRunning = true;
    this.isPaused = false;
    this.cycleTimer = setInterval(() => this._runCycle(), this.cycleIntervalMs);

    Logger.debug(`Cycle started with interval: ${this.cycleIntervalMs}ms`);
    await super.start();
  }

  async stop() {
    if (!this.isRunning) {
      Logger.warn('Cycle is not running');
      return;
    }

    this.isRunning = false;
    this.isPaused = true;
    if (this.cycleTimer) {
      clearInterval(this.cycleTimer);
      this.cycleTimer = null;
    }

    Logger.debug('Cycle stopped');
    await super.stop();
  }

  async pause() {
    if (!this.isRunning || this.isPaused) {
      Logger.warn('Cycle is already paused or not running');
      return;
    }

    this.isPaused = true;
    Logger.debug('Cycle paused');
  }

  async resume() {
    if (!this.isRunning || !this.isPaused) {
      Logger.warn('Cycle is not paused or not running');
      return;
    }

    this.isPaused = false;
    Logger.debug('Cycle resumed');
  }

  async step() {
    // Run a single cycle even if paused
    await this._runCycle();
    Logger.debug('Single cycle executed (step)');
  }

  async reset() {
    this.cycleCount = 0;
    Logger.debug('Cycle count reset to 0');
  }

  async _runCycle() {
    // Only run the cycle if not paused (except when called via step command)
    if (this.isPaused && this.isRunning) {
      return;
    }

    if (!this.core) {
      Logger.error('Core not available in Cycle component');
      return;
    }

    try {
      const focusSet = await this._selectFocusSet();

      // Use reasoning component if available (previously called reasoner)
      if (this.core.reasoning) {
        const derivedTasks = await this.core.reasoning.reason(focusSet);
        if (derivedTasks.length > 0 && this.core.memory) {
          // Add derived tasks to memory if the method exists, otherwise add them one by one
          if (typeof this.core.memory.addTasks === 'function') {
            await this.core.memory.addTasks(derivedTasks);
          } else {
            // Add each task individually
            for (const task of derivedTasks) {
              if (task) {
                // Add to memory - this might require creating proper Task objects
                if (this.core.memory.addTask) {
                  this.core.memory.addTask(task, Date.now());
                }
                
                // Emit task.derived event for derived tasks
                if (this.core.messages) {
                  this.core.messages.emit('task.derived', {
                    id: task.id || `task_${Date.now()}`,
                    content: task.term?.toString?.() || task.toString?.() || task.content || task.term,
                    status: 'derived',
                    timestamp: Date.now()
                  });
                }
                
                // Also emit task.processed event for consistency
                if (this.core.messages) {
                  this.core.messages.emit('task.processed', {
                    id: task.id || `task_${Date.now()}`,
                    content: task.term?.toString?.() || task.toString?.() || task.content || task.term,
                    status: 'processed',
                    timestamp: Date.now()
                  });
                }
              }
            }
          }
        }
      }
      // For backward compatibility, check for old reasoner property too
      else if (this.core.reasoner) {
        const derivedTasks = await this.core.reasoner.reason(focusSet);
        if (derivedTasks.length > 0 && this.core.memory) {
          // Add derived tasks to memory if the method exists, otherwise add them one by one
          if (typeof this.core.memory.addTasks === 'function') {
            await this.core.memory.addTasks(derivedTasks);
          } else {
            // Add each task individually
            for (const task of derivedTasks) {
              if (task) {
                // Add to memory
                if (this.core.memory.addTask) {
                  this.core.memory.addTask(task, Date.now());
                }
                
                // Emit task.derived event for derived tasks
                if (this.core.messages) {
                  this.core.messages.emit('task.derived', {
                    id: task.id || `task_${Date.now()}`,
                    content: task.term?.toString?.() || task.toString?.() || task.content || task.term,
                    status: 'derived',
                    timestamp: Date.now()
                  });
                }
                
                // Also emit task.processed event for consistency
                if (this.core.messages) {
                  this.core.messages.emit('task.processed', {
                    id: task.id || `task_${Date.now()}`,
                    content: task.term?.toString?.() || task.toString?.() || task.content || task.term,
                    status: 'processed',
                    timestamp: Date.now()
                  });
                }
              }
            }
          }
        }
      }

      // Consolidate knowledge if memory component is available
      if (this.core.memory) {
        await this.core.memory.consolidate(Date.now());
      }

      // Increment cycle count
      this.cycleCount++;
      
      // Broadcast cycle stats if messaging is available
      if (this.core.messages) {
        this.core.messages.emit('cycle.stats', {
          cycles: this.cycleCount,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      Logger.error('Error in cycle execution', error);
      // Emit error event if messaging is available
      if (this.core.messages) {
        this.core.messages.emit('cycle:error', {
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
  }

  async _selectFocusSet() {
    if (!this.core || !this.core.memory) {
      Logger.warn('Core or Memory component not available for focus set selection');
      return [];
    }

    try {
      // Get all tasks from memory - using the correct method name
      let allTasks = this.core.memory.getAllTasks ? this.core.memory.getAllTasks() : [];
      if (!Array.isArray(allTasks)) {
        Logger.warn('Memory.getAllTasks did not return an array');
        return [];
      }

      // Sort by creation time (newest first)
      allTasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      // Limit to focus set size from config
      const focusSetSize = this.core.config.get('core.focusSetSize', 10);
      return allTasks.slice(0, focusSetSize);
    } catch (error) {
      Logger.error('Error selecting focus set', error);
      return [];
    }
  }

  getStats() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      interval: this.cycleIntervalMs,
      timerActive: this.cycleTimer !== null,
      cycles: this.cycleCount
    };
  }

  getDetailedStats() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      interval: this.cycleIntervalMs,
      timerActive: this.cycleTimer !== null,
      cycles: this.cycleCount,
      timestamp: Date.now()
    };
  }
}

export default Cycle;