import {Logger} from '../util/Logger.js';
import {Rule} from './Rule.js';
import {LMRule} from './LMRule.js';
import {RuleSet} from './RuleSet.js';
import {Metrics as MetricsUtil} from '../util/Metrics.js';
import {sortByPriority} from '../util/common.js';

export class RuleEngine {
    constructor(config = {}, lm = null) {
        this._config = config;
        this._rules = new Map();
        this._ruleSets = new Map();
        this._lm = lm; // Language Model integration
        this.logger = Logger;
        this._metrics = MetricsUtil.create();
        this._typeMetrics = {
            lmRuleApplications: 0,
            nalRuleApplications: 0
        };
    }

    get rules() {
        return Array.from(this._rules.values());
    }

    get ruleSets() {
        return Array.from(this._ruleSets.values());
    }

    get metrics() {
        return {
            ...this._metrics,
            ...this._typeMetrics
        };
    }

    get lm() {
        return this._lm;
    }

    setLM(lm) {
        this._lm = lm;
        // Update any existing LM rules with the new LM instance
        for (const [id, rule] of this._rules) {
            if (rule instanceof LMRule && rule.lm !== lm) {
                // For LM rules, we need to create a new instance with the updated LM
                const newRule = new LMRule(rule.id, lm, rule._promptTemplate, rule._responseProcessor,
                    rule._priority, rule._config);
                this._rules.set(id, newRule);
            }
        }
    }

    register(rule) {
        if (!(rule instanceof Rule)) throw new Error('Invalid rule type');

        // If this is an LM rule and we have an LM instance but the rule doesn't have one,
        // assign our LM instance to it
        if (rule instanceof LMRule && !rule.lm && this._lm) {
            const newRule = new LMRule(rule.id, this._lm, rule._promptTemplate, rule._responseProcessor,
                rule._priority, rule._config);
            this._rules.set(rule.id, newRule);
        } else {
            this._rules.set(rule.id, rule);
        }
        return this;
    }

    unregister(ruleId) {
        this._rules.delete(ruleId);
        return this;
    }

    getRule(ruleId) {
        return this._rules.get(ruleId);
    }

    getSet(name) {
        return this._ruleSets.get(name);
    }

    createSet(name, ruleIds = []) {
        const rules = ruleIds.map(id => this._rules.get(id)).filter(Boolean);
        return this._ruleSets.set(name, new RuleSet(name, rules)).get(name);
    }

    getApplicableRules(task, ruleType = null) {
        let applicableRules = Array.from(this._rules.values())
            .filter(rule => rule.canApply(task));

        if (ruleType) {
            applicableRules = applicableRules.filter(rule =>
                ruleType === 'lm' ? rule instanceof LMRule : !(rule instanceof LMRule)
            );
        }

        return sortByPriority(applicableRules);
    }

    applyRule(rule, task) {
        if (!rule || !this._rules.has(rule.id)) return {results: [], rule};

        const startTime = Date.now();
        let success = false;

        try {
            const {results, rule: updatedRule} = rule.apply(task);
            this._rules.set(rule.id, updatedRule);
            success = true;

            // Update type-specific metrics
            this._typeMetrics[rule instanceof LMRule ? 'lmRuleApplications' : 'nalRuleApplications']++;

            return {results, rule: updatedRule};
        } catch (error) {
            if (error.rule) this._rules.set(rule.id, error.rule);
            throw error.error || error;
        } finally {
            this._updateMetrics(success, Date.now() - startTime);
        }
    }

    applyRules(task, ruleIds = null, ruleType = null) {
        const rules = ruleIds
            ? ruleIds.map(id => this._rules.get(id)).filter(Boolean)
            : this.getApplicableRules(task, ruleType);

        const allResults = [];
        for (const rule of rules) {
            try {
                const {results} = this.applyRule(rule, task);
                allResults.push(...results);
            } catch (error) {
                this.logger.warn(`Rule ${rule.id} failed:`, error);
            }
        }

        return allResults;
    }

    applyLMRules(task, ruleIds = null) {
        return this.applyRules(task, ruleIds, 'lm');
    }

    applyNALRules(task, ruleIds = null) {
        return this.applyRules(task, ruleIds, 'nal');
    }

    enableRule(ruleId) {
        const rule = this._rules.get(ruleId);
        if (rule) this._rules.set(ruleId, rule.enable());
        return this;
    }

    disableRule(ruleId) {
        const rule = this._rules.get(ruleId);
        if (rule) this._rules.set(ruleId, rule.disable());
        return this;
    }

    clear() {
        this._rules.clear();
        this._ruleSets.clear();
        return this;
    }

    _updateMetrics(success, time) {
        this._metrics = MetricsUtil.update(this._metrics, success, time);
    }
}