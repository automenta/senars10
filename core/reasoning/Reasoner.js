import {RuleEngine} from './RuleEngine.js';
import {StrategySelector} from './StrategySelector.js';
import {ReasoningContext} from './ReasoningContext.js';
import {Logger} from '../util/Logger.js';

export class Reasoner {
    constructor(config = {}) {
        this.config = {
            enableSymbolicReasoning: true,
            enableTemporalReasoning: true,
            enableModularReasoning: true,
            maxDerivedTasks: Infinity,
            ...config
        };

        // Initialize core components
        this.ruleEngine = config.ruleEngine || new RuleEngine(config.ruleEngine || {});
        this.strategySelector = config.strategySelector || new StrategySelector(config.strategySelector || {});
        this.temporalReasoner = config.temporalReasoner || null;
        this.systemContext = null;

        // Initialize metrics and tracking
        this.metrics = {
            totalInferences: 0,
            symbolicInferences: 0,
            temporalInferences: 0,
            modularInferences: 0,
            startTime: Date.now()
        };

        this.logger = Logger;
    }

    setSystemContext(systemContext) {
        this.systemContext = systemContext;
        return this;
    }

    async performInference(focusSet, options = {}) {
        if (!Array.isArray(focusSet)) {
            throw new Error(`Focus set must be an array, received: ${typeof focusSet}`);
        }

        if (focusSet.length === 0) {
            return [];
        }

        return await this._executeInference(focusSet, options);
    }

    async _executeInference(focusSet, options = {}) {
        const {
            maxDerivedTasks = this.config.maxDerivedTasks,
            enableSymbolicReasoning = this.config.enableSymbolicReasoning,
            enableTemporalReasoning = this.config.enableTemporalReasoning,
            enableModularReasoning = this.config.enableModularReasoning
        } = options;

        this.logger.debug(`Performing inference on ${focusSet.length} tasks with max ${maxDerivedTasks} derived tasks`);

        let allDerivedTasks = [];

        enableSymbolicReasoning && allDerivedTasks.push(...await this._performSymbolicInference(focusSet, maxDerivedTasks - allDerivedTasks.length));

        enableTemporalReasoning && allDerivedTasks.length < maxDerivedTasks && this.temporalReasoner && allDerivedTasks.push(...this._performTemporalInference(focusSet, maxDerivedTasks - allDerivedTasks.length));

        enableModularReasoning && allDerivedTasks.length < maxDerivedTasks && this.systemContext && allDerivedTasks.push(...await this._performModularInference(focusSet, maxDerivedTasks - allDerivedTasks.length));

        const finalTasks = allDerivedTasks.slice(0, maxDerivedTasks);
        this.logger.debug(`Total inference produced ${finalTasks.length} derived tasks`);

        this.metrics.totalInferences += finalTasks.length;

        return finalTasks;
    }

    async _performSymbolicInference(focusSet, maxDerived) {
        const derivedTasks = [];

        this.logger.debug(`Starting symbolic inference with ${this.ruleEngine.rules.length} rules on ${focusSet.length} tasks`);

        // Create context for the rules
        const reasoningContext = this._createReasoningContext();

        // Process all focus set tasks using rule engine with the selected strategy
        const strategy = this.strategySelector.selectStrategy(reasoningContext, focusSet, this.ruleEngine.rules);

        // Apply reasoning strategy to the entire focus set to allow for multi-task rule applications
        const strategyResults = await strategy.execute(
            reasoningContext,
            this.ruleEngine.rules,
            focusSet  // Pass the entire focus set to allow for multi-premise rules
        );

        derivedTasks.push(...strategyResults.slice(0, maxDerived));

        this.metrics.symbolicInferences += derivedTasks.length;
        this.logger.debug(`Symbolic inference produced ${derivedTasks.length} derived tasks`);

        return derivedTasks;
    }

    _performTemporalInference(focusSet, maxTemporalTasks) {
        if (!this.temporalReasoner) {
            this.logger.debug('Temporal reasoner not available, skipping temporal reasoning');
            return [];
        }

        this.logger.debug(`Starting temporal inference on ${focusSet.length} tasks with max ${maxTemporalTasks} derived tasks`);

        try {
            const temporalTasks = this.temporalReasoner.infer(focusSet);
            const limitedTasks = Array.isArray(temporalTasks) ? temporalTasks.slice(0, maxTemporalTasks) : [];

            this.metrics.temporalInferences += limitedTasks.length;
            this.logger.debug(`Temporal inference produced ${limitedTasks.length} derived tasks`);

            return limitedTasks;
        } catch (error) {
            this.logger.warn('Temporal reasoning failed:', error);
            return [];
        }
    }

    async _performModularInference(focusSet, maxModularTasks) {
        if (!this.systemContext) {
            this.logger.debug('System context not available, skipping modular reasoning');
            return [];
        }

        this.logger.debug(`Starting modular inference on ${focusSet.length} tasks with max ${maxModularTasks} derived tasks`);

        const derivedTasks = [];

        for (const task of focusSet) {
            if (derivedTasks.length >= maxModularTasks) {
                break;
            }

            try {
                // Analyze task to determine appropriate strategy
                const taskAnalysis = this.strategySelector.analyzeTasks([task]);
                const strategy = this.strategySelector.selectStrategy(
                    {ruleEngine: this.ruleEngine, systemContext: this.systemContext},
                    [task],
                    []
                );

                // Execute strategy with task
                const result = await strategy.execute(
                    this.systemContext.memory,
                    [],
                    this.systemContext.termFactory
                );

                // Add results to derived tasks
                for (const inferredTask of result) {
                    if (derivedTasks.length >= maxModularTasks) break;
                    derivedTasks.push(inferredTask);
                }
            } catch (error) {
                this.logger.error(`Error executing modular reasoning for task:`, error);
            }
        }

        this.metrics.modularInferences += derivedTasks.length;
        this.logger.debug(`Modular inference produced ${derivedTasks.length} derived tasks`);

        return derivedTasks;
    }

    _createReasoningContext() {
        return new ReasoningContext({
            memory: this.systemContext?.memory || null,
            termFactory: this.systemContext?.termFactory || null,
            ruleEngine: this.ruleEngine,
            systemContext: this.systemContext,
            config: this.config
        });
    }

    async processTask(task) {
        // Add the task to focus set and perform inference
        const focusSet = [task];
        return await this.performInference(focusSet);
    }

    getPerformanceStats() {
        return {
            ...this.metrics,
            uptime: Date.now() - this.metrics.startTime,
            ruleEngineStats: this.ruleEngine.metrics || null,
            strategySelectorStats: this.strategySelector.getPerformanceRecommendation ?
                this.strategySelector.getPerformanceRecommendation() : null
        };
    }

    getRuleStatistics() {
        return {
            totalRules: this.ruleEngine.rules.length,
            ruleNames: this.ruleEngine.rules.map(r => r.id),
            ruleTypes: {
                lmRules: this.ruleEngine.rules.filter(r => r.type === 'lm').length,
                nalRules: this.ruleEngine.rules.filter(r => r.type !== 'lm').length
            },
            ...this.ruleEngine.metrics
        };
    }

    setReasoningMode(mode, enabled) {
        switch (mode) {
            case 'symbolic': this.config.enableSymbolicReasoning = enabled; break;
            case 'temporal': this.config.enableTemporalReasoning = enabled; break;
            case 'modular': this.config.enableModularReasoning = enabled; break;
            default: throw new Error(`Unknown reasoning mode: ${mode}`);
        }
        return this;
    }
}