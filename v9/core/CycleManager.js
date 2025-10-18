import { CycleContext } from './Cycle.js';

export class CycleManager {
  constructor(reasoner, memory, focus, clock, config = {}) {
    this.reasoner = reasoner;
    this.memory = memory;
    this.focus = focus;
    this.clock = clock;
    this.config = { cycleInterval: 100, ...config };
    this._isRunning = false;
    this.cycleTimer = null;
  }

  async runCycle() {
    const currentTime = this.clock.getTime();
    const context = new CycleContext(currentTime);
    const focusItems = this.focus.getFocusItems();

    if (focusItems.length === 0) return [];

    const focusSet = focusItems.map(item => {
      const taskData = item[1];
      const task = taskData.task || taskData;
      task.setAccessedAt(context.currentTime);
      return task;
    });

    const derivedTasks = await this.reasoner.reason(focusSet, this.memory, context);
    derivedTasks.forEach(task => this.memory.addTask(task, context.currentTime));
    this.memory.consolidate(context.currentTime);

    return derivedTasks;
  }

  async runCycleWithTracing() {
    const currentTime = this.clock.getTime();
    const context = new CycleContext(currentTime);
    const focusItems = this.focus.getFocusItems();

    if (focusItems.length === 0) return { derivedTasks: [], trace: [] };

    const focusSet = focusItems.map(item => {
      const taskData = item[1];
      const task = taskData.task || taskData;
      task.setAccessedAt(context.currentTime);
      return task;
    });

    const trace = [];
    const originalReason = this.reasoner.reason.bind(this.reasoner);

    this.reasoner.reason = async function(focusSet, memory, context) {
      const derivedTasks = [];
      const enabledRules = this.getEnabledRules();

      for (const rule of enabledRules) {
        const ruleStartTime = Date.now();
        const ruleResults = [];

        for (const premise of focusSet) {
          try {
            const result = await rule.apply({ premise, memory, context });
            if (result?.length) ruleResults.push(...result);
          } catch (error) {
            trace.push({
              type: 'rule_error',
              ruleId: rule.id,
              error: error.message,
              timestamp: Date.now()
            });
          }
        }

        const ruleEndTime = Date.now();
        if (ruleResults.length > 0) {
          derivedTasks.push(...ruleResults);
          trace.push({
            type: 'rule_success',
            ruleId: rule.id,
            derivedCount: ruleResults.length,
            executionTime: ruleEndTime - ruleStartTime,
            timestamp: Date.now()
          });
        }
      }

      return derivedTasks;
    }.bind(this.reasoner);

    const derivedTasks = await this.reasoner.reason(focusSet, this.memory, context);
    derivedTasks.forEach(task => this.memory.addTask(task, context.currentTime));
    this.memory.consolidate(context.currentTime);

    this.reasoner.reason = originalReason;
    return { derivedTasks, trace };
  }

  async runCycles(count) {
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(await this.runCycle());
    }
    return results;
  }

  async runCyclesSafe(count, options = {}) {
    const results = [];
    const { delayBetweenCycles = 0, onError = null } = options;

    for (let i = 0; i < count; i++) {
      try {
        const result = await this.runCycle();
        results.push(result);

        if (delayBetweenCycles > 0 && i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenCycles));
        }
      } catch (error) {
        Logger.error(`Error in reasoning cycle ${i + 1}:`, error);
        if (onError) onError(error, i);
        else results.push([]);
      }
    }

    return results;
  }

  async runCycleWithRules(ruleIds) {
    const originalEnabledIds = new Set(this.reasoner.enabledRuleIds);

    try {
      this.reasoner.enabledRuleIds.clear();
      ruleIds.forEach(id => {
        if (this.reasoner.rules.has(id)) {
          this.reasoner.enabledRuleIds.add(id);
        }
      });

      return await this.runCycle();
    } finally {
      this.reasoner.enabledRuleIds = originalEnabledIds;
    }
  }

  start() {
    if (this._isRunning) return false;

    this._isRunning = true;
    const cycleFn = async () => {
      if (!this._isRunning) return;
      try {
        await this.runCycle();
      } catch (error) {
        Logger.error('Error in reasoning cycle:', error);
      }
      if (this._isRunning) {
        this.cycleTimer = setTimeout(cycleFn, this.config.cycleInterval);
      }
    };

    cycleFn();
    return true;
  }

  stop() {
    if (!this._isRunning) return false;

    this._isRunning = false;
    if (this.cycleTimer) {
      clearTimeout(this.cycleTimer);
      this.cycleTimer = null;
    }
    return true;
  }

  isRunning() { return this._isRunning; }
}