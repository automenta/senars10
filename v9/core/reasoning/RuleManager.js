import { Logger } from '../base/utilities.js';

export class RuleManager {
  constructor(lm = null, config = {}) {
    this.lm = lm;
    this.rules = new Map();
    this.ruleGroups = new Map();
    this.enabledRuleIds = new Set();
    this.performanceMetrics = new Map();
    this.ruleValidation = new Map();
    this.config = {
      enableMetrics: true,
      enableGroups: true,
      enableValidation: true,
      maxRules: 1000,
      validateOnAdd: true,
      ...config
    };
  }

  addRule(rule, group = 'general') {
    if (!rule?.id) {
      const error = new Error('Invalid rule: must have an ID');
      Logger.error('Rule registration failed:', error.message);
      throw error;
    }
    
    if (this.rules.size >= this.config.maxRules) {
      const error = new Error(`Maximum rule limit (${this.config.maxRules}) reached`);
      Logger.error('Rule registration failed:', error.message);
      throw error;
    }

    // Validate rule structure
    if (this.config.enableValidation && this.config.validateOnAdd) {
      try {
        this._validateRule(rule);
      } catch (validationError) {
        Logger.error(`Rule validation failed for rule ${rule.id}:`, validationError.message);
        throw validationError;
      }
    }

    this.rules.set(rule.id, rule);
    this.config.enableGroups && this._updateGroups(rule.id, group);
    // Ensure enabled state is properly set - default to true if not specified
    const shouldBeEnabled = rule.enabled !== false;
    if (shouldBeEnabled) {
      this.enabledRuleIds.add(rule.id);
    } else {
      this.enabledRuleIds.delete(rule.id); // Explicitly disable if enabled is explicitly false
    }
    this.config.enableMetrics && this._initMetrics(rule.id);

    // Track rule type for better organization
    this._trackRuleType(rule);
    
    Logger.debug(`Rule added: ${rule.id} to group ${group}, enabled: ${shouldBeEnabled}`);
  }

  enable(idOrGroup) { this._toggle(idOrGroup, true); }
  disable(idOrGroup) { this._toggle(idOrGroup, false); }

  _toggle(idOrGroup, enable) {
    const ruleIds = this.rules.has(idOrGroup)
      ? [idOrGroup]
      : this.ruleGroups.get(idOrGroup) || [];
    ruleIds.forEach(id => (enable ? this.enabledRuleIds.add(id) : this.enabledRuleIds.delete(id)));
  }

  disableAllRules() {
    this.enabledRuleIds.clear();
  }

  _updateGroups(ruleId, group) {
    if (!this.config.enableGroups) return;
    const groupSet = this.ruleGroups.get(group) || new Set();
    groupSet.add(ruleId);
    this.ruleGroups.set(group, groupSet);
  }

  _initMetrics(ruleId) {
    this.performanceMetrics.set(ruleId, {
      executions: 0,
      successes: 0,
      failures: 0,
      avgTime: 0,
      lastRun: null,
      lastError: null
    });
  }

  _validateRule(rule) {
    const errors = this._collectValidationErrors(rule);

    if (errors.length > 0) {
      const error = new Error(`Rule validation failed: ${errors.join(', ')}`);
      Logger.error('Rule validation failed:', error.message);
      throw error;
    }

    this.ruleValidation.set(rule.id, { validated: true, timestamp: Date.now(), errors: [] });
  }

  _collectValidationErrors(rule) {
    const errors = [];

    this._validateBasicRuleProperties(rule, errors);
    this._validateRuleTypeSpecific(rule, errors);

    return errors;
  }

  _validateBasicRuleProperties(rule, errors) {
    if (!rule.id || typeof rule.id !== 'string') {
      errors.push('Rule must have a valid string ID');
    }

    if (this.rules.has(rule.id)) {
      errors.push(`Rule with ID '${rule.id}' already exists`);
    }

    if (typeof rule.apply !== 'function') {
      errors.push('Rule must have an apply method');
    }

    if (rule.type && !this._isValidRuleType(rule.type)) {
      errors.push(`Rule type must be 'nal', 'lm', or 'general', got '${rule.type}'`);
    }
  }

  _validateRuleTypeSpecific(rule, errors) {
    if (rule.type === 'nal' && typeof rule.apply !== 'function' && typeof rule.performInference !== 'function') {
      errors.push('NAL rule must have either performInference or apply method');
    }

    if (rule.type === 'lm' && typeof rule.apply !== 'function' && typeof rule.executeLM !== 'function') {
      errors.push('LM rule must have either executeLM or apply method');
    }
  }

  _isValidRuleType(type) {
    return ['nal', 'lm', 'general'].includes(type);
  }

  _trackRuleType(rule) {
    if (!rule.type) return;

    const typeSet = this.ruleGroups.get(`type:${rule.type}`) || new Set();
    typeSet.add(rule.id);
    this.ruleGroups.set(`type:${rule.type}`, typeSet);
  }

  updateMetrics(ruleId, success, time, error = null) {
    if (!this.config.enableMetrics) return;

    const metrics = this.performanceMetrics.get(ruleId);
    if (!metrics) return;

    metrics.executions++;
    if (success) {
      metrics.successes++;
    } else {
      metrics.failures++;
      if (error) {
        metrics.lastError = error;
      }
    }
    metrics.avgTime = (metrics.avgTime * (metrics.executions - 1) + time) / metrics.executions;
    metrics.lastRun = Date.now();
  }

  getEnabledRules() {
    return Array.from(this.enabledRuleIds).map(id => this.rules.get(id)).filter(Boolean);
  }

  getRulesByType(type) {
    const typeGroup = this.ruleGroups.get(`type:${type}`);
    if (!typeGroup) return [];
    return Array.from(typeGroup).map(id => this.rules.get(id)).filter(Boolean);
  }

  getStats() {
    const ruleTypes = [...new Set(Array.from(this.rules.values()).map(r => r.type).filter(Boolean))];
    const typeCounts = {};

    ruleTypes.forEach(type => {
      const typeGroup = this.ruleGroups.get(`type:${type}`);
      typeCounts[type] = typeGroup ? typeGroup.size : 0;
    });

    return {
      totalRules: this.rules.size,
      enabledRules: this.enabledRuleIds.size,
      ruleTypes,
      ruleTypeCounts: typeCounts,
      ruleGroups: Array.from(this.ruleGroups.keys()),
      validationEnabled: this.config.enableValidation,
      validatedRules: this.ruleValidation.size,
      performance: this._aggregateMetrics()
    };
  }

  getRuleValidationStatus(ruleId) {
    return this.ruleValidation.get(ruleId) || { validated: false };
  }

  validateAllRules() {
    const results = [];
    for (const [id, rule] of this.rules) {
      try {
        this._validateRule(rule);
        results.push({ id, status: 'valid' });
      } catch (error) {
        results.push({ id, status: 'invalid', error: error.message });
      }
    }
    return results;
  }

  _aggregateMetrics() {
    const stats = {
      totalExecutions: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      avgExecutionTime: 0,
      successRate: 0
    };
    let count = 0;

    for (const metrics of this.performanceMetrics.values()) {
      stats.totalExecutions += metrics.executions;
      stats.totalSuccesses += metrics.successes;
      stats.totalFailures += metrics.failures;
      stats.avgExecutionTime += metrics.avgTime;
      count++;
    }

    stats.avgExecutionTime = count > 0 ? stats.avgExecutionTime / count : 0;
    stats.successRate = stats.totalExecutions > 0
      ? (stats.totalSuccesses / stats.totalExecutions) * 100
      : 0;

    return stats;
  }

  async reason(focusSet, memory, context) {
    if (!focusSet?.length || !memory || !context) {
      const reason = !focusSet?.length ? 'No focus set provided' : 'Missing memory or context';
      Logger.debug(`${reason}, returning empty derived tasks`);
      return [];
    }

    const derivedTasks = [];
    const enabledRules = this.getEnabledRules();

    for (const rule of enabledRules) {
      if (!rule?.id) {
        Logger.warn('Skipping invalid rule without ID');
        continue;
      }

      await this._applyRule(rule, focusSet, memory, context, derivedTasks);
    }

    Logger.debug(`Reasoning cycle completed with ${derivedTasks.length} derived tasks from ${focusSet.length} premises using ${enabledRules.length} enabled rules`);
    return derivedTasks;
  }

  async _applyRule(rule, focusSet, memory, context, derivedTasks) {
    const startTime = Date.now();

    try {
      for (const premise of focusSet) {
        if (!premise) continue;

        const canApply = !rule.canApply || rule.canApply({ premise, memory, context });
        if (!canApply) {
          this.updateMetrics(rule.id, false, Date.now() - startTime, 'Rule condition not met');
          continue;
        }

        const result = await rule.apply({ premise, memory, context });
        const endTime = Date.now();

        this._processRuleResult(rule, result, endTime - startTime, derivedTasks);
      }
    } catch (error) {
      Logger.error(`Rule ${rule.id} encountered critical error:`, error);
      this.updateMetrics(rule.id, false, 0, error.message);
    }
  }

  _processRuleResult(rule, result, executionTime, derivedTasks) {
    if (!result?.length) {
      this.updateMetrics(rule.id, false, executionTime, 'No results produced');
      return;
    }

    const validResults = result.filter(task => task?.term);
    if (!validResults.length) {
      Logger.warn(`Rule ${rule.id} produced invalid task without term`);
      this.updateMetrics(rule.id, false, executionTime, 'No valid results produced');
      return;
    }

    derivedTasks.push(...validResults);
    this.updateMetrics(rule.id, true, executionTime);
  }
}