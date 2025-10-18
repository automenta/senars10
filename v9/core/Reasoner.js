import { Logger } from './base/utilities.js';
import { DEFAULTS } from './base/constants.js';
import { Component } from './components/Component.js';
import { RuleManager } from './reasoning/RuleManager.js';
import { RuleApplicationEngine } from './reasoning/RuleApplicationEngine.js';
import { NALRule } from './reasoning/NALRule.js';

// Export NALRule for backward compatibility with other modules
export { NALRule };

export class Reasoner extends Component {
  constructor(lm = null, strategyRegistry = null, systemContext = null) {
    super();

    this.strategyRegistry = strategyRegistry;
    this.systemContext = systemContext;
    this.defaultStrategy = 'basic_reasoning';
    this.overlapCheckingEnabled = true;

    this.lm = lm;
    this.ruleManager = new RuleManager(this.lm);
    this.applicationEngine = new RuleApplicationEngine(this.ruleManager);
    this.winnowing = null;
    this.derivation = null;
    this.memory = null;
    this.strategies = new Map();
    this.reasoningHistory = [];
    this.maxHistorySize = DEFAULTS.MAX_HISTORY_SIZE;

    this._initialize();
    strategyRegistry && this._registerWithStrategyRegistry();
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this._resetState();
    this.maxHistorySize = config.maxHistorySize ?? DEFAULTS.MAX_HISTORY_SIZE;
  }

  _initialize() { this._resetState(); }
  _resetState() {
    this.strategies.clear();
    this.reasoningHistory = [];
    this.ruleManager = new RuleManager(this.lm);
    this.applicationEngine = new RuleApplicationEngine(this.ruleManager);
  }

  addRule(rule, group = 'general') {
    this.ruleManager.addRule(rule, group);
  }

  enableRule(idOrGroup) {
    this.ruleManager.enable(idOrGroup);
  }

  disableRule(idOrGroup) {
    this.ruleManager.disable(idOrGroup);
  }

  _registerWithStrategyRegistry() {
    if (!this.strategyRegistry) return;

    this.strategyRegistry.registerStrategy(this.defaultStrategy, {
      execute: (focusSet, memory, context) => this.reason(focusSet, memory, context)
    }, {
      description: 'Basic reasoning using unified rule engine',
      type: 'reasoning',
      group: 'default'
    });
  }

  setMemory(memory) {
    this.memory = memory;
  }

  async reason(focusSet, memory, context = {}) {
    this.memory = memory;
    if (!focusSet?.length) return [];

    const derivedTasks = [];
    const ruleContext = { memory, tasks: focusSet, context };

    Logger.info(`Applying rules to focus set of size ${focusSet.length}`);
    await this.applicationEngine.applyRules(focusSet, derivedTasks, ruleContext);
    await this.applicationEngine.applyDualPremiseRules(focusSet, derivedTasks, ruleContext);
    Logger.info(`Derived ${derivedTasks.length} new tasks`);

    return derivedTasks;
  }

  reasonWithStrategy(focusSet, memory, context) {
    return this.strategyRegistry
      ? this.strategyRegistry.executeStrategy(this._selectReasoningStrategy(focusSet, memory, context), focusSet, memory, context)
      : this.reason(focusSet, memory, context);
  }

  _selectReasoningStrategy(focusSet, memory, context) { return this.defaultStrategy; }

  _hasOverlap(taskA, taskB) { return taskA?.stamp?.overlaps(taskB?.stamp) || false; }

  async performTemporalReasoning(scenario, timepoints = [], context = {}) {
    return await this._performAdvancedReasoning('temporal', scenario, { timepoints }, context);
  }

  async performCounterfactualReasoning(scenario, context = {}) {
    return await this._performAdvancedReasoning('counterfactual', scenario, {}, context);
  }

  async performCausalReasoning(cause, effect, context = {}) {
    return await this._performAdvancedReasoning('causal', `${cause}_leads_to_${effect}`, { cause, effect }, context);
  }

  async _performAdvancedReasoning(type, scenario, metadata = {}, context = {}) {
    const config = this._getReasoningConfig(type);
    const task = this._createReasoningTask(type, scenario, config, metadata);

    this.memory && await this.memory.input(task);

    return {
      original: `${this._getReasoningDescription(type)}: ${scenario}`,
      type,
      scenario,
      timestamp: Date.now(),
      ...metadata
    };
  }

  _getReasoningConfig(type) {
    const configs = {
      temporal: { frequency: 0.8, confidence: 0.7, priority: 0.6 },
      counterfactual: { frequency: 0.7, confidence: 0.6, priority: 0.5 },
      causal: { frequency: 0.8, confidence: 0.7, priority: 0.6 }
    };
    return configs[type] || configs.temporal;
  }

  _createReasoningTask(type, scenario, config, metadata) {
    return {
      term: `${type}_analysis_of_${scenario.replace(/ /g, '_')}`,
      punctuation: '.',
      truth: { frequency: config.frequency, confidence: config.confidence },
      priority: config.priority,
      metadata: { ...metadata, reasoningType: type }
    };
  }

  _getReasoningDescription(type) {
    return ({
      temporal: 'Temporal analysis initiated',
      counterfactual: 'Counterfactual analysis initiated',
      causal: 'Causal analysis initiated'
    })[type] || 'Analysis initiated';
  }

  addStrategy(strategy) {
    if (!strategy?.id || typeof strategy.execute !== 'function') {
      throw new Error('Invalid strategy: must have an id and execute function');
    }
    this.strategies.set(strategy.id, strategy);
  }

  setOverlapChecking(enabled) { this.overlapCheckingEnabled = enabled; }
  isOverlapCheckingEnabled() { return this.overlapCheckingEnabled; }

  getStats() {
    return {
      ...this.ruleManager.getStats(),
      reasoningHistorySize: this.reasoningHistory.length,
      hasLM: !!this.lm,
      hasMemory: !!this.memory
    };
  }

  getReasoningHistory(limit = this.maxHistorySize) {
    return this.reasoningHistory.slice(-limit);
  }
}

// RuleEngine is the same as Reasoner for compatibility
export const RuleEngine = Reasoner;
