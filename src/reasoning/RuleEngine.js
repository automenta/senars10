import {Logger} from '../util/Logger.js';
import {Rule} from './Rule.js';
import {LMRule} from './LMRule.js';
import {RuleSet} from './RuleSet.js';
import {Metrics as MetricsUtil} from '../util/Metrics.js';
import {sortByProperty} from '../util/collections.js';

export class RuleEngine {
    constructor(config = {}, lm = null) {
        this._config = config;
        this._rules = new Map();
        this._ruleSets = new Map();
        this._lm = lm;
        this.logger = Logger;
        this._metrics = MetricsUtil.create();
        this._typeMetrics = {lmRuleApplications: 0, nalRuleApplications: 0};
    }

    get rules() {
        return [...this._rules.values()];
    }

    get ruleSets() {
        return [...this._ruleSets.values()];
    }

    get metrics() {
        return {...this._metrics, ...this._typeMetrics};
    }

    get lm() {
        return this._lm;
    }

    setLM(lm) {
        this._lm = lm;
        this.rules.forEach(rule => {
            if (rule instanceof LMRule && rule.lm !== lm) {
                this._rules.set(rule.id, rule.clone({lm}));
            }
        });
    }

    register(rule) {
        if (!(rule instanceof Rule)) throw new Error('Invalid rule type');

        if (rule instanceof LMRule && !rule.lm && this._lm) {
            this._rules.set(rule.id, rule.clone({lm: this._lm}));
        } else {
            this._rules.set(rule.id, rule);
        }
        return this;
    }

    unregister = (ruleId) => (this._rules.delete(ruleId), this);
    getRule = (ruleId) => this._rules.get(ruleId);
    getSet = (name) => this._ruleSets.get(name);

    createSet(name, ruleIds = []) {
        const rules = ruleIds.map(this.getRule).filter(Boolean);
        const ruleSet = new RuleSet(name, rules);
        this._ruleSets.set(name, ruleSet);
        return ruleSet;
    }

    getApplicableRules(task, ruleType = null) {
        let applicable = this.rules.filter(rule => rule.canApply(task));
        if (ruleType) {
            applicable = applicable.filter(r => (ruleType === 'lm' ? r instanceof LMRule : !(r instanceof LMRule)));
        }
        return sortByProperty(applicable, 'priority', true);
    }

    applyRule(rule, task) {
        if (!rule || !this._rules.has(rule.id)) return {results: [], rule};

        const startTime = Date.now();
        let success = false;

        try {
            const {results, rule: updatedRule} = rule.apply(task);
            this._rules.set(rule.id, updatedRule);
            success = true;
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
        const rulesToApply = ruleIds ? ruleIds.map(this.getRule).filter(Boolean) : this.getApplicableRules(task, ruleType);
        return rulesToApply.flatMap(rule => {
            try {
                return this.applyRule(rule, task).results;
            } catch (error) {
                this.logger.warn(`Rule ${rule.id} failed:`, error);
                return [];
            }
        });
    }

    applyLMRules = (task, ruleIds = null) => this.applyRules(task, ruleIds, 'lm');
    applyNALRules = (task, ruleIds = null) => this.applyRules(task, ruleIds, 'nal');

    _toggleRule = (ruleId, enable) => {
        const rule = this.getRule(ruleId);
        if (rule) this._rules.set(ruleId, enable ? rule.enable() : rule.disable());
        return this;
    };

    enableRule = (ruleId) => this._toggleRule(ruleId, true);
    disableRule = (ruleId) => this._toggleRule(ruleId, false);

    clear() {
        this._rules.clear();
        this._ruleSets.clear();
        return this;
    }

    _updateMetrics(success, time) {
        this._metrics = MetricsUtil.update(this._metrics, success, time);
    }
}
