import {Rule} from './Rule.js';
import {LMRule} from './LMRule.js';
import {RuleSet} from './RuleSet.js';
import {Metrics as MetricsUtil} from '../util/Metrics.js';
import {SequentialRuleProcessor} from './SequentialRuleProcessor.js';
import {ReasoningContext} from './ReasoningContext.js';
import {PerformanceOptimizer} from './PerformanceOptimizer.js';
import {BaseComponent} from '../util/BaseComponent.js';

export class RuleEngine extends BaseComponent {
    constructor(config = {}, lm = null, termFactory = null, ruleProcessor = null) {
        super(config, 'RuleEngine');
        this._config = {autoRegisterLM: true, ...this.config, ...config}; // Use BaseComponent config
        this._rules = new Map();
        this._ruleSets = new Map();
        this._lm = lm;
        this._termFactory = termFactory;
        this._ruleUtilMetrics = MetricsUtil.create();
        this._typeMetrics = {lmRuleApplications: 0, nalRuleApplications: 0};
        this._ruleProcessor = ruleProcessor || new SequentialRuleProcessor(config.ruleProcessor || {});
        this._performanceOptimizer = new PerformanceOptimizer(config.performance || {});
    }

    get rules() {
        return [...this._rules.values()];
    }

    get ruleSets() {
        return [...this._ruleSets.values()];
    }

    get metrics() {
        return {...this._ruleUtilMetrics, ...this._typeMetrics};
    }

    get lm() {
        return this._lm;
    }

    get termFactory() {
        return this._termFactory;
    }

    static create(config = {}) {
        const {lm, termFactory, ruleProcessor} = config;
        return new RuleEngine(config, lm, termFactory, ruleProcessor);
    }

    static createWithRules(rules, config = {}) {
        const engine = new RuleEngine(config);
        engine.registerMany(rules);
        return engine;
    }

    setLM(lm) {
        this._lm = lm;
        this._refreshLMRuleInstances();
    }

    setTermFactory(termFactory) {
        this._termFactory = termFactory;
        return this;
    }

    register(rule) {
        if (!(rule instanceof Rule)) throw new Error('Invalid rule type');

        if (rule instanceof LMRule && !rule.lm && this._lm) {
            rule = rule.clone({lm: this._lm});
        }
        
        this._rules.set(rule.id, rule);
        
        // Index the rule if performance optimizer has indexing enabled
        if (this._performanceOptimizer) {
            this._performanceOptimizer.indexRule(rule);
        }
        
        return this;
    }

    registerMany(rules) {
        for (const rule of rules) this.register(rule);
        return this;
    }

    registerSet(name, ruleIds = []) {
        return this.createSet(name, ruleIds);
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

    createSetByCategory(category) {
        const rules = this.rules.filter(rule => rule.config?.category === category);
        return this.createSet(`${category}-rules`, rules.map(r => r.id));
    }

    getApplicableRules(task, ruleType = null) {
        // If performance optimizer has indexing enabled, use it to find candidates
        let candidateRules;
        if (this._performanceOptimizer) {
            candidateRules = this._performanceOptimizer.getCandidateRules(task, this.rules);
        } else {
            candidateRules = this.rules;
        }
        
        const applicable = candidateRules.filter(rule => rule.canApply(task));
        return this._filterByType(applicable, ruleType).sort((a, b) => b.priority - a.priority);
    }

    applyRule(rule, task, memory = null) {
        if (!rule || !this._rules.has(rule.id)) return {results: [], rule};

        const startTime = Date.now();
        let success = false;

        try {
            const context = new ReasoningContext({
                memory: memory,
                termFactory: this._termFactory,
                ruleEngine: this
            });

            const {results, rule: updatedRule} = rule.apply(task, context);
            this._rules.set(rule.id, updatedRule);
            success = true;
            this._incrementTypeMetric(rule);
            
            // Update rule effectiveness if performance optimizer is available
            if (this._performanceOptimizer) {
                this._performanceOptimizer.updateRuleEffectiveness(rule.id, success, results?.length || 0);
            }
            
            return {results, rule: updatedRule};
        } catch (error) {
            if (error.rule) this._rules.set(rule.id, error.rule);
            throw error.error || error;
        } finally {
            this._updateMetrics(success, Date.now() - startTime);
        }
    }

    applyRules(task, ruleIds = null, ruleType = null, memory = null) {
        const rulesToApply = ruleIds ? this._getValidRules(ruleIds) : this.getApplicableRules(task, ruleType);
        return rulesToApply.flatMap(rule => {
            try {
                return this.applyRule(rule, task, memory).results;
            } catch (error) {
                this.logger.warn(`Rule ${rule.id} failed:`, error);
                return [];
            }
        });
    }

    applyLMRules = (task, ruleIds = null, memory = null) => this.applyRules(task, ruleIds, 'lm', memory);
    applyNALRules = (task, ruleIds = null, memory = null) => this.applyRules(task, ruleIds, 'nal', memory);

    applyHybridRules(task, lmRuleIds = null, nalRuleIds = null, memory = null) {
        const lmResults = this.applyLMRules(task, lmRuleIds, memory);
        const nalResults = this.applyNALRules(task, nalRuleIds, memory);
        return [...lmResults, ...nalResults];
    }

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

    async processBatch(rules, tasks, memory = null, termFactory = null) {
        const context = new ReasoningContext({
            memory: memory || null,
            termFactory: termFactory || this._termFactory,
            ruleEngine: this,
            ...this._config.context
        });

        return await this._ruleProcessor.process(rules, tasks, context);
    }

    async processWithContext(rules, tasks, context) {
        return await this._ruleProcessor.process(rules, tasks, context);
    }

    async processBatchOptimized(rules, tasks, memory = null, termFactory = null) {
        const context = new ReasoningContext({
            memory: memory || null,
            termFactory: termFactory || this._termFactory,
            ruleEngine: this,
            ...this._config.context
        });

        if (this._performanceOptimizer && this._config.performance?.enableBatching) {
            return await this._performanceOptimizer.batchProcess(
                rules,
                tasks,
                context,
                async (ruleBatch, taskBatch, ctx) => await this._ruleProcessor.process(ruleBatch, taskBatch, ctx)
            );
        }

        return await this._ruleProcessor.process(rules, tasks, context);
    }

    async applyRuleOptimized(rule, task, memory = null) {
        if (!rule || !this._rules.has(rule.id)) return {results: [], rule};

        const startTime = Date.now();
        let success = false;

        try {
            const context = new ReasoningContext({
                memory: memory,
                termFactory: this._termFactory,
                ruleEngine: this
            });

            const {
                results,
                rule: updatedRule
            } = await this._performanceOptimizer.applyRuleWithOptimization(rule, task, context);
            this._rules.set(rule.id, updatedRule);
            success = true;
            this._incrementTypeMetric(rule);
            
            // Update rule effectiveness
            if (this._performanceOptimizer) {
                this._performanceOptimizer.updateRuleEffectiveness(rule.id, success, results?.length || 0);
            }
            
            return {results, rule: updatedRule};
        } catch (error) {
            if (error.rule) this._rules.set(rule.id, error.rule);
            throw error.error || error;
        } finally {
            this._updateMetrics(success, Date.now() - startTime);
        }
    }

    async applyRulesOptimized(task, ruleIds = null, ruleType = null, memory = null) {
        const rulesToApply = ruleIds ? this._getValidRules(ruleIds) : this.getApplicableRules(task, ruleType);
        const results = [];

        for (const rule of rulesToApply) {
            try {
                const ruleResult = await this.applyRuleOptimized(rule, task, memory);
                results.push(...ruleResult.results);
            } catch (error) {
                this.logger.warn(`Optimized rule ${rule.id} failed:`, error);
            }
        }

        return results;
    }

    createContext(config = {}) {
        return new ReasoningContext({
            memory: config.memory || null,
            termFactory: config.termFactory || this._termFactory,
            ruleEngine: this,
            ...this._config.context,
            ...config
        });
    }

    getPerformanceStats() {
        return this._performanceOptimizer ? this._performanceOptimizer.getStats() : null;
    }

    clearPerformanceCache() {
        if (this._performanceOptimizer) this._performanceOptimizer.clearCache();
    }

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
        return ruleType ? rules.filter(r => ruleType === 'lm' ? r instanceof LMRule : !(r instanceof LMRule)) : rules;
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
        this._ruleUtilMetrics = MetricsUtil.update(this._ruleUtilMetrics, success, time);
    }
}
