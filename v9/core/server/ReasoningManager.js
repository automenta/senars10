import { WebSocketUtils } from './WebSocketUtils.js';

/**
 * Unified reasoning cycle management with consolidated functionality.
 * Combines patterns from ReasoningManager and ReasoningCycleManager for DRY compliance.
 */
class ReasoningManager {
  constructor(core = null) {
    this.core = core;
    this.memory = null;
    this.reasoner = null;
    this.selector = null;
    this.reasoningInterval = null;
    this.cycleCallback = null;
  }

  async initialize() {
    // Support both external core injection and internal initialization
    if (this.core) {
      this.memory = this.core.memory;
      this.reasoner = this.core.reasoner;
      this.selector = this.core.selector;
    } else {
      await this.initializeInternalComponents();
    }
  }

  async initializeInternalComponents() {
    try {
      // Dynamic imports to avoid circular dependencies
      const { default: Memory } = await import('../Memory.js');
      const { default: Reasoner } = await import('../Reasoner.js');
      const { default: FocusSetSelector } = await import('../FocusSetSelector.js');

      this.memory = new Memory();
      this.reasoner = new Reasoner();
      this.selector = new FocusSetSelector();

      // Register reasoning rules
      const { DeductiveSyllogismRule, InductionRule, AbductionRule } = await import('./reasoning/nal/SyllogisticRules.js');
      this.reasoner.addRule(new DeductiveSyllogism());
      this.reasoner.addRule(new Induction());
      this.reasoner.addRule(new Abduction());

      WebSocketUtils.debug('Reasoning components initialized');
    } catch (error) {
      WebSocketUtils.error('Failed to initialize reasoning components:', error);
      throw error;
    }
  }

  startReasoningCycle(interval = 1000, callback = null) {
    if (!this.areComponentsReady()) {
      WebSocketUtils.warn('Reasoning components not ready');
      return false;
    }

    this.stopReasoningCycle(); // Clear any existing interval
    this.cycleCallback = callback;

    this.loadInitialTasks();

    this.reasoningInterval = setInterval(() => {
      this.executeReasoningCycle();
    }, interval);

    return true;
  }

  executeReasoningCycle() {
    try {
      if (!this.areComponentsReady()) return;

      // Use the core cycle method if available
      if (this.core?.cycle?.step) {
        this.core.cycle.step();
      } else {
        WebSocketUtils.warn('Core cycle not available, cannot execute reasoning cycle');
      }

      if (this.cycleCallback) {
        this.cycleCallback();
      }
    } catch (error) {
      WebSocketUtils.error('Error in reasoning cycle:', error);
    }
  }

  areComponentsReady() {
    return this.memory && this.reasoner && this.selector;
  }

  loadInitialTasks() {
    try {
      const initialTasks = this.getInitialTasks();

      for (const taskData of initialTasks) {
        if (!taskData.content) {
          WebSocketUtils.warn('Task missing content, skipping:', taskData);
          continue;
        }

        this.createAndAddTask(taskData);
      }
    } catch (error) {
      WebSocketUtils.error('Error loading initial tasks:', error);
    }
  }

  createAndAddTask(taskData) {
    try {
      const task = this._createTask(taskData);
      this._addTaskToMemory(task, Date.now());
      WebSocketUtils.debug(`Loaded task: ${taskData.content}`);
    } catch (taskError) {
      WebSocketUtils.error('Error creating task:', taskError, taskData);
    }
  }

  _createTask(taskData) {
    const memory = this.core?.memory || this.memory;
    return memory?.createTask ? memory.createTask(taskData) : taskData;
  }

  _addTaskToMemory(task, timestamp) {
    const memory = this.core?.memory || this.memory;
    memory.addTask(task, timestamp);
  }

  parseTaskContent(content, truthValue = null) {
    const cleanContent = content.replace(/[.!?:]+$/, '').trim();

    const impMatch = cleanContent.match(/\(([^(]+)-->([^)]+)\)/);
    if (impMatch) {
      return this.createInheritanceTerm(impMatch[1].trim(), impMatch[2].trim(), truthValue);
    }

    return this.createAtomicTerm(cleanContent, truthValue);
  }

  _getMemory() {
    return this.core?.memory || this.memory;
  }

  _createTermWithFallback(createTermFn, fallbackTerm, truthValue, defaultFreq, defaultConf) {
    const memory = this._getMemory();

    if (memory?.[createTermFn.name]) {
      return memory[createTermFn.name](...createTermFn.arguments);
    }

    try {
      if (typeof Term !== 'undefined' && typeof TermType !== 'undefined') {
        const term = createTermFn(Term, TermType);
        const truth = this._normalizeTruthValue(truthValue, defaultFreq, defaultConf);
        return { term, truth };
      }
    } catch (error) {
      // Safe fallback
    }

    return { term: fallbackTerm, truth: truthValue };
  }

  createInheritanceTerm(subject, predicate, truthValue) {
    return this._createTermWithFallback(
      () => [subject, predicate],
      `(${subject}-->${predicate})`,
      truthValue,
      0.8,
      0.8
    );
  }

  createAtomicTerm(content, truthValue) {
    return this._createTermWithFallback(
      () => [content],
      content,
      truthValue,
      0.5,
      0.5
    );
  }

  _normalizeTruthValue(truthValue, defaultFreq, defaultConf) {
    const memory = this._getMemory();

    if (memory?.normalizeTruthValue) {
      return memory.normalizeTruthValue(truthValue, defaultFreq, defaultConf);
    }

    if (!truthValue) {
      return typeof TruthValue !== 'undefined'
        ? new TruthValue(defaultFreq, defaultConf)
        : { frequency: defaultFreq, confidence: defaultConf };
    }

    if (typeof truthValue === 'object' && !truthValue.hasOwnProperty('frequency')) {
      return typeof TruthValue !== 'undefined'
        ? new TruthValue(truthValue.frequency || defaultFreq, truthValue.confidence || defaultConf)
        : {
            frequency: truthValue.frequency || defaultFreq,
            confidence: truthValue.confidence || defaultConf
          };
    }

    return truthValue;
  }

  inferPunctuation(content) {
    if (content.endsWith('!')) return '!';
    if (content.endsWith('?')) return '?';
    return '.';
  }

  getInitialTasks() {
    // If we have access to core memory, use its initial tasks
    if (this.core?.memory?.getInitialTasks) {
      return this.core.memory.getInitialTasks();
    } else if (this.memory?.getInitialTasks) {
      return this.memory.getInitialTasks();
    }
    
    // Fallback to default tasks if available
    return [];
  }

  stopReasoningCycle() {
    if (this.reasoningInterval) {
      clearInterval(this.reasoningInterval);
      this.reasoningInterval = null;
    }
  }

  reset() {
    this.stopReasoningCycle();
    if (this.memory?.reset) {
      this.memory.reset();
    }
    this.loadInitialTasks();
  }

  getStats() {
    return {
      isRunning: !!this.reasoningInterval,
      interval: this.reasoningInterval ? 1000 : null,
      hasCallback: !!this.cycleCallback,
      componentsReady: this.areComponentsReady()
    };
  }
}

export default ReasoningManager;