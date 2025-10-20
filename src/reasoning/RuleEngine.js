import {Logger} from '../util/Logger.js';
import {Rule} from './Rule.js';
import {LMRule} from './LMRule.js';
import {RuleSet} from './RuleSet.js';
import {Metrics as MetricsUtil} from '../util/Metrics.js';
import {SequentialRuleProcessor} from './SequentialRuleProcessor.js';
import {sortByProperty} from '../util/collections.js';

export class RuleEngine {
    constructor(config = {}, lm = null, termFactory = null, ruleProcessor = null) {
        this._config = config;
        this._rules = new Map();
        this._ruleSets = new Map();
        this._lm = lm;
        this._termFactory = termFactory;
        this.logger = Logger;
        this._metrics = MetricsUtil.create();
        this._typeMetrics = {lmRuleApplications: 0, nalRuleApplications: 0};
        
        // Use provided rule processor or default to SequentialRuleProcessor
        this._ruleProcessor = ruleProcessor || new SequentialRuleProcessor(config.ruleProcessor || {});
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
        this._refreshLMRuleInstances();
    }

    register(rule) {
        if (!(rule instanceof Rule)) throw new Error('Invalid rule type');

        // If this is an LMRule without an LM instance but engine has one, use engine's LM
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
        const rules = this._getValidRules(ruleIds);
        const ruleSet = new RuleSet(name, rules);
        this._ruleSets.set(name, ruleSet);
        return ruleSet;
    }

    getApplicableRules(task, ruleType = null) {
        const applicable = this.rules.filter(rule => rule.canApply(task));
        return this._filterByType(applicable, ruleType)
            .sort((a, b) => b.priority - a.priority); // Sort by priority descending
    }

    applyRule(rule, task, memory = null) {
        if (!rule || !this._rules.has(rule.id)) return {results: [], rule};

        const startTime = Date.now();
        let success = false;

        try {
            const {results, rule: updatedRule} = rule.apply(task, memory, this._termFactory);
            this._rules.set(rule.id, updatedRule);
            success = true;
            this._incrementTypeMetric(rule);
            return {results, rule: updatedRule};
        } catch (error) {
            if (error.rule) this._rules.set(rule.id, error.rule);
            throw error.error || error;
        } finally {
            this._updateMetrics(success, Date.now() - startTime);
        }
    }

    applyRules(task, ruleIds = null, ruleType = null, memory = null) {
        const rulesToApply = ruleIds 
            ? this._getValidRules(ruleIds) 
            : this.getApplicableRules(task, ruleType);
            
        return this._applyRulesWithLogging(rulesToApply, task, memory);
    }

    applyLMRules = (task, ruleIds = null, memory = null) => this.applyRules(task, ruleIds, 'lm', memory);
    applyNALRules = (task, ruleIds = null, memory = null) => this.applyRules(task, ruleIds, 'nal', memory);
    
    /**
     * Applies both LM and NAL rules to a task and returns combined results
     */
    applyHybridRules(task, lmRuleIds = null, nalRuleIds = null, memory = null) {
        const lmResults = this.applyLMRules(task, lmRuleIds, memory);
        const nalResults = this.applyNALRules(task, nalRuleIds, memory);
        return [...lmResults, ...nalResults];
    }
    
    /**
     * Performs coordinated reasoning between LM and NAL rules
     * Applies LM rules first, then NAL rules on the combined results
     */
    async coordinateRules(task, memory = null) {
        // Apply LM rules to original task
        const lmResults = this.applyLMRules(task, null, memory);
        
        // Combine original task results with LM results
        const allTasks = [task, ...lmResults];
        
        // Apply NAL rules to all tasks
        const nalResults = allTasks.flatMap(t => this.applyNALRules(t, null, memory));
        
        // Optionally, apply LM rules to NAL results as well
        const additionalLmResults = nalResults.flatMap(t => this.applyLMRules(t, null, memory));
        
        return {
            initial: [task],
            lmResults,
            nalResults,
            additionalLmResults,
            all: [...lmResults, ...nalResults, ...additionalLmResults]
        };
    }

    /**
     * Process a batch of rules against tasks using the configured rule processor
     */
    async processBatch(rules, tasks, memory = null, termFactory = null) {
        // Use the termFactory if provided, otherwise use the stored one
        const effectiveTermFactory = termFactory || this._termFactory;
        return await this._ruleProcessor.process(rules, tasks, memory, effectiveTermFactory);
    }

    _toggleRule = (ruleId, enable) => {
        const rule = this.getRule(ruleId);
        if (rule) {
            const updatedRule = enable ? rule.enable() : rule.disable();
            this._rules.set(ruleId, updatedRule);
        }
        return this;
    };

    enableRule = (ruleId) => this._toggleRule(ruleId, true);
    disableRule = (ruleId) => this._toggleRule(ruleId, false);

    clear() {
        this._rules.clear();
        this._ruleSets.clear();
        return this;
    }

    // Private helper methods
    _refreshLMRuleInstances() {
        for (const [ruleId, rule] of this._rules.entries()) {
            if (rule instanceof LMRule && rule.lm !== this._lm) {
                this._rules.set(ruleId, rule.clone({lm: this._lm}));
            }
        }
    }

    _getValidRules(ruleIds) {
        return ruleIds.map(this.getRule).filter(Boolean);
    }

    _filterByType(rules, ruleType) {
        return ruleType 
            ? rules.filter(r => (ruleType === 'lm' ? r instanceof LMRule : !(r instanceof LMRule)))
            : rules;
    }

    _incrementTypeMetric(rule) {
        this._typeMetrics[rule instanceof LMRule ? 'lmRuleApplications' : 'nalRuleApplications']++;
    }

    _applyRulesWithLogging(rules, task, memory = null) {
        return rules.flatMap(rule => {
            try {
                return this.applyRule(rule, task, memory).results;
            } catch (error) {
                this.logger.warn(`Rule ${rule.id} failed:`, error);
                return [];
            }
        });
    }

    _updateMetrics(success, time) {
        this._metrics = MetricsUtil.update(this._metrics, success, time);
    }
}
