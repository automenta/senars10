import Memory from './Memory.js';
import { Focus } from './Focus.js';
import { RuleManager as Reasoner } from './reasoning/RuleManager.js';
import { Logger } from './base/utilities.js';
import { HighResolutionClock } from './Clock.js';
import LM from './lm/LM.js';
import { TaskManager } from './TaskManager.js';
import { CycleManager } from './CycleManager.js';
import { StatisticsManager } from './StatisticsManager.js';
import { RuleManager } from './NARRuleManager.js';

export class NAR {
  constructor(config = {}) {
    this._initialize(config);
    Logger.debug('NAR initialized with integrated memory and reasoning components');
  }

  async initialize() {
    await this.ruleManager.loadReasoningRules();
    return this;
  }

  async initializeWithDefaults(lmProvider = null, options = {}) {
    await this.initialize();

    if (lmProvider) {
      this.lm.registerProvider('default', lmProvider);
    } else {
      const DummyProvider = (await import('./lm/DummyProvider.js')).default;
      this.lm.registerProvider('default', new DummyProvider());
    }

    return this;
  }

  _initialize(config) {
    this.config = { cycleInterval: 100, ...config };

    this.clock = new HighResolutionClock();
    this.focus = new Focus();
    this.memory = new Memory(this.focus);
    this.lm = new LM();
    this.reasoner = new Reasoner(this.lm);

    this.focus.createFocusSet('default');
    this.focus.setFocus('default');

    this.taskManager = new TaskManager(this.memory, this.focus, this.clock);
    this.cycleManager = new CycleManager(this.reasoner, this.memory, this.focus, this.clock, this.config);
    this.statisticsManager = new StatisticsManager();
    this.ruleManager = new RuleManager(this.reasoner);
  }

  input(taskData) {
    const task = this.taskManager.input(taskData);
    this.statisticsManager.recordInput();
    Logger.debug(`Task input: ${task.toString()}`);
    return task;
  }

  believe(content, truth = { frequency: 0.9, confidence: 0.9 }) {
    return this.taskManager.believe(content, truth);
  }

  want(content, truth = { frequency: 0.9, confidence: 0.9 }) {
    return this.taskManager.want(content, truth);
  }

  async think(taskContent) {
    const task = this.input(taskContent);
    await this.runCycle();
    return task;
  }

  async thinkAndRespond(taskContent, options = {}) {
    const task = this.input(taskContent);
    const derivedTasks = await this.runCycle();

    if (options.returnDerived !== false) {
      return {
        input: task,
        derived: derivedTasks,
        tasks: this.getTasksByPriority()
      };
    }

    return { input: task, derived: derivedTasks };
  }


  ask(questionData) { return this.taskManager.ask(questionData); }
  getTasks() { return this.taskManager.getTasks(); }
  getTasksByPriority() { return this.taskManager.getTasksByPriority(); }
  getTasksByTime() { return this.taskManager.getTasksByTime(); }
  getBeliefs() { return this.taskManager.getBeliefs(); }
  getGoals() { return this.taskManager.getGoals(); }
  getQuestions() { return this.taskManager.getQuestions(); }
  findTasksByTerm(termPattern) { return this.taskManager.findTasksByTerm(termPattern); }
  getTaskByHash(taskHash) { return this.taskManager.getTaskByHash(taskHash); }
  removeTask(taskHash) { return this.taskManager.removeTask(taskHash); }

  async runCycle() {
    const derivedTasks = await this.cycleManager.runCycle();
    this.statisticsManager.recordCycle();
    this.statisticsManager.recordDerived(derivedTasks.length);
    return derivedTasks;
  }

  start() {
    if (this.cycleManager.start()) {
      this.statisticsManager.setBirthdate(this.clock.getTime());
      Logger.debug('NAR started continuous reasoning cycle');
      return true;
    }
    Logger.warn('NAR is already running');
    return false;
  }

  stop() {
    if (this.cycleManager.stop()) {
      Logger.debug('NAR stopped continuous reasoning cycle');
      return true;
    }
    Logger.warn('NAR is not running');
    return false;
  }

  async runCyclesSafe(count, options = {}) {
    return await this.cycleManager.runCyclesSafe(count, options);
  }

  async runCycleWithRules(ruleIds) {
   return await this.cycleManager.runCycleWithRules(ruleIds);
  }

  getRuleCounts() { return this.ruleManager.getRuleCounts(); }
  getRulesSummary() { return this.ruleManager.getRulesSummary(); }

  getStats() {
    return this.statisticsManager.getFullStats(this.reasoner, this.memory, this.clock.getTime());
  }

  getDetailedReasoningReport() {
    return this.statisticsManager.getDetailedReasoningReport(this.reasoner);
  }


  getMemoryState() {
    return {
        totalTasks: this.getTasks().length,
        beliefs: this.getBeliefs().length,
        goals: this.getGoals().length,
        questions: this.getQuestions().length,
        concepts: this.memory.conceptStorage.size,
        focusTasks: this.focus.getFocusItems().length,
        longTermTasks: this.memory.getAllTasks().size
      };
    }

  getHighestPriorityTask() {
    return this.getTasksByPriority()[0] || null;
  }

  getConcepts() {
    return Array.from(this.memory.conceptStorage.values());
  }

  getConceptByTerm(termName) {
    for (const [hash, concept] of this.memory.conceptStorage) {
      if (concept.term && concept.term.name === termName) {
        return concept;
      }
    }
    return null;
  }

  reset() {
    this._initialize(this.config);
    Logger.debug('NAR reset to initial state');
  }


  isRunning() { return this.cycleManager.isRunning(); }

  enableRule(ruleId) { this.ruleManager.enableRule(ruleId); }
  disableRule(ruleId) { this.ruleManager.disableRule(ruleId); }
  enableRuleType(type) { this.ruleManager.enableRuleType(type); }
  disableRuleType(type) { this.ruleManager.disableRuleType(type); }
  getRulesByType(type) { return this.ruleManager.getRulesByType(type); }
  validateAllRules() { return this.ruleManager.validateAllRules(); }

  async runCycleWithTracing() {
    return await this.cycleManager.runCycleWithTracing();
  }

  async runCycles(count) {
    return await this.cycleManager.runCycles(count);
  }
}