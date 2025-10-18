import path from 'path';
import { loadRules, validateLoadedRules } from './reasoning/RuleLoader.js';
import { RuleFactory } from './reasoning/RuleFactory.js';
import { Logger } from './base/utilities.js';

export class RuleManager {
  constructor(reasoner) {
    this.reasoner = reasoner;
  }

  async loadReasoningRules() {
    const [lmRules, nalRules] = await Promise.all([
      this._loadLMRules(),
      this._loadNALRules()
    ]);

    const allRules = [...lmRules.valid, ...nalRules.valid];
    const successfullyAdded = this._registerRules(allRules);

    Logger.info(`Loaded ${lmRules.all.length} LM rules and ${nalRules.all.length} NAL rules, with ${successfullyAdded} successfully registered`);

    if (nalRules.errors.length > 0) {
      Logger.error(`Failed to create ${nalRules.errors.length} NAL rules:`, nalRules.errors);
    }

    return { lmRules, nalRules, successfullyAdded };
  }

  async _loadLMRules() {
    const lmRuleDir = path.join(path.dirname(import.meta.url.replace('file://', '')), 'reasoning', 'lm', 'rules');
    const rules = await loadRules(lmRuleDir, { lm: this.reasoner.lm });
    const validation = validateLoadedRules(rules);

    if (validation.invalidCount > 0) {
      Logger.warn(`LM rule validation issues: ${validation.invalidCount} invalid rules found`);
    }

    return { all: rules, valid: validation.valid };
  }

  async _loadNALRules() {
    const nalRuleTypes = RuleFactory.getAvailableNALRules();
    const rules = [];
    const errors = [];

    for (const type of nalRuleTypes) {
      try {
        rules.push(RuleFactory.createNALRule(type));
      } catch (error) {
        const errorInfo = { type, error: error.message };
        Logger.error(`Failed to create NAL rule of type ${type}:`, error.message);
        errors.push(errorInfo);
      }
    }

    const validation = validateLoadedRules(rules);
    if (validation.invalidCount > 0) {
      Logger.warn(`NAL rule validation issues: ${validation.invalidCount} invalid rules found`);
    }

    return { all: rules, valid: validation.valid, errors };
  }

 _registerRules(rules) {
   let count = 0;
   for (const rule of rules) {
     try {
       this.reasoner.addRule(rule);
       count++;
     } catch (error) {
       Logger.error(`Failed to add rule ${rule.id}:`, error.message);
     }
   }
   return count;
 }

  enableRule(ruleId) { this.reasoner.enable(ruleId); }
  disableRule(ruleId) { this.reasoner.disable(ruleId); }
  enableRuleType(type) { this.reasoner.enable(`type:${type}`); }
  disableRuleType(type) { this.reasoner.disable(`type:${type}`); }
  getRulesByType(type) { return this.reasoner.getRulesByType(type); }
  validateAllRules() { return this.reasoner.validateAllRules(); }

  getRuleCounts() {
    const stats = this.reasoner.getStats();
    return stats.ruleTypeCounts;
  }

  getRulesSummary() {
    const stats = this.reasoner.getStats();
    return {
      total: stats.totalRules,
      enabled: stats.enabledRules,
      types: stats.ruleTypes,
      byType: stats.ruleTypeCounts,
      validated: stats.validatedRules
    };
  }
}