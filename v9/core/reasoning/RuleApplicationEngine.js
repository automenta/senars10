import { Logger } from '../base/utilities.js';

export class RuleApplicationEngine {
  constructor(ruleManager) {
    this.ruleManager = ruleManager;
  }

  async applyRules(focusSet, derivedTasks, ruleContext, filterFn = () => true) {
    const enabledRules = this.ruleManager.getEnabledRules();
    if (!enabledRules.length) return;

    for (const task of focusSet) {
      const context = { ...ruleContext, premise: { task } };

      for (const rule of enabledRules) {
        if (filterFn(rule) && rule.canApply(context)) {
          const result = await this._applyRule(rule, context);
          if (result?.length) derivedTasks.push(...result);
        }
      }
    }
  }

  async applyDualPremiseRules(focusSet, derivedTasks, ruleContext) {
    const enabledRules = this.ruleManager.getEnabledRules();
    if (!enabledRules.length) return;

    for (let i = 0; i < focusSet.length; i++) {
      for (let j = i + 1; j < focusSet.length; j++) {
        const task1 = focusSet[i], task2 = focusSet[j];
        const context = {
          ...ruleContext,
          premise: { task: task1 },
          secondaryPremise: { task: task2 }
        };

        for (const rule of enabledRules) {
          if (rule?.type !== 'nal' || !rule.canApply(context)) continue;

          const result = await this._applyRule(rule, context);
          if (result?.length) derivedTasks.push(...result);
        }
      }
    }
  }

  async _applyRule(rule, context) {
    const startTime = Date.now();
    try {
      const result = await rule.apply(context);
      this.ruleManager.updateMetrics(rule.id, true, Date.now() - startTime);
      return result ? (Array.isArray(result) ? result : [result]) : null;
    } catch (error) {
      Logger.error(`Rule ${rule.id} failed: ${error.message}`);
      this.ruleManager.updateMetrics(rule.id, false, Date.now() - startTime);
      return null;
    }
  }
}