import {SystemConfig} from './SystemConfig.js';
import {TermFactory} from '../term/TermFactory.js';
import {Memory} from '../memory/Memory.js';
import {TaskManager} from '../task/TaskManager.js';
import {Cycle} from './Cycle.js';
import {NarseseParser} from '../parser/NarseseParser.js';
import {RuleEngine} from '../reasoning/RuleEngine.js';
import {SyllogisticRule} from '../reasoning/rules/syllogism.js';
import {ModusPonensRule} from '../reasoning/rules/modusponens.js';
import {PRIORITY} from '../config/constants.js';
import {BaseComponent} from '../util/BaseComponent.js';
import {ComponentManager} from '../util/ComponentManager.js';
import {NaiveExhaustiveStrategy} from '../reasoning/NaiveExhaustiveStrategy.js';
import {CoordinatedReasoningStrategy} from '../reasoning/CoordinatedReasoningStrategy.js';
import {Focus} from '../memory/Focus.js';
import {LM} from '../lm/LM.js';
import {Task} from '../task/Task.js';
import {Truth} from '../Truth.js';
import {ToolIntegration} from '../tools/ToolIntegration.js';
import {ExplanationService} from '../tools/ExplanationService.js';
import {MetricsMonitor} from '../reasoning/MetricsMonitor.js';
import {TermLayer} from '../memory/TermLayer.js';
import {ReasoningAboutReasoning} from '../reasoning/ReasoningAboutReasoning.js';

export class NAR extends BaseComponent {
    constructor(config = {}) {
        super(config, 'NAR');

        const desiredLmEnabled = config.lm?.enabled === true;

        this._config = SystemConfig.from(config);
        this._componentManager = new ComponentManager({}, this._eventBus);

        // Initialize components
        this._termFactory = new TermFactory();
        this._memory = new Memory(this._config.memory);
        this._parser = new NarseseParser(this._termFactory);
        this._focus = new Focus(this._config.focus);
        this._taskManager = new TaskManager(this._memory, this._focus, this._config.taskManager);

        // Initialize LM if enabled
        this._lm = desiredLmEnabled ? new LM() : null;
        this._ruleEngine = new RuleEngine(this._config.ruleEngine || {}, this._lm, this._termFactory);

        // Use coordinated reasoning strategy if LM is enabled, otherwise naive strategy
        const reasoningStrategy = desiredLmEnabled
            ? new CoordinatedReasoningStrategy(this._ruleEngine, this._config.reasoning || {})
            : new NaiveExhaustiveStrategy(this._config.reasoning || {});

        this._cycle = new Cycle({
            memory: this._memory,
            focus: this._focus,
            ruleEngine: this._ruleEngine,
            taskManager: this._taskManager,
            config: this._config.get('cycle'),
            reasoningStrategy: reasoningStrategy,
            termFactory: this._termFactory,
            nar: this  // Pass the NAR instance to the cycle for TermLayer access
        });

        // Initialize tool integration if enabled
        this._toolIntegration = config.tools?.enabled !== false
            ? new ToolIntegration(config.tools || {})
            : null;

        if (this._toolIntegration) {
            this._toolIntegration.connectToReasoningCore(this);
            this._explanationService = new ExplanationService({
                lm: this._lm || null,
                ...config.tools?.explanation
            });
        }

        // Initialize MetricsMonitor for self-optimization
        this._metricsMonitor = new MetricsMonitor({
            eventBus: this._eventBus,
            nar: this,
            ...config.metricsMonitor
        });

        // Initialize TermLayer for associative reasoning
        const termLayerConfig = {
            capacity: config.termLayer?.capacity || 1000, // Default capacity for AIKR compliance
            ...config.termLayer
        };
        this._termLayer = new TermLayer(termLayerConfig);

        // Initialize ReasoningAboutReasoning component for meta-cognitive reasoning
        this._reasoningAboutReasoning = new ReasoningAboutReasoning(this, {
            ...config.reasoningAboutReasoning
        });

        this._isRunning = false;
        this._cycleInterval = null;

        // Register all components with the component manager
        this._registerComponents();
    }

    get config() {
        return this._config;
    }

    get memory() {
        return this._memory;
    }

    get isRunning() {
        return this._isRunning;
    }

    get cycleCount() {
        return this._cycle.cycleCount;
    }

    get lm() {
        return this._lm;
    }

    get tools() {
        return this._toolIntegration;
    }

    get explanationService() {
        return this._explanationService;
    }

    get componentManager() {
        return this._componentManager;
    }

    /**
     * Get the MetricsMonitor instance
     */
    get metricsMonitor() {
        return this._metricsMonitor;
    }

    /**
     * Get the TermLayer instance for associative reasoning
     */
    get termLayer() {
        return this._termLayer;
    }

    /**
     * Get the ReasoningAboutReasoning instance for meta-cognitive reasoning
     */
    get reasoningAboutReasoning() {
        return this._reasoningAboutReasoning;
    }

    _registerComponents() {
        // Register core components with dependencies
        this._componentManager.registerComponent('termFactory', {
            initialize: () => Promise.resolve(true),
            start: () => Promise.resolve(true),
            stop: () => Promise.resolve(true),
            dispose: () => Promise.resolve(true),
            isInitialized: true,
            isStarted: true,
            isDisposed: false
        });

        this._componentManager.registerComponent('memory', this._memory);
        this._componentManager.registerComponent('focus', this._focus, ['memory']);
        this._componentManager.registerComponent('taskManager', this._taskManager, ['memory', 'focus']);
        this._componentManager.registerComponent('ruleEngine', this._ruleEngine);

        if (this._lm) {
            this._componentManager.registerComponent('lm', this._lm);
        }

        if (this._toolIntegration) {
            this._componentManager.registerComponent('toolIntegration', this._toolIntegration);
            if (this._explanationService) {
                this._componentManager.registerComponent('explanationService', this._explanationService, ['toolIntegration']);
            }
        }

        this._componentManager.registerComponent('cycle', this._cycle, ['memory', 'focus', 'taskManager', 'ruleEngine']);

        // MetricsMonitor, TermLayer, and ReasoningAboutReasoning are features that don't follow
        // the ComponentManager lifecycle interface, so they're not registered with it.
        // They're initialized directly in the constructor and managed separately.
    }

    _setupDefaultRules() {
        try {
            this._ruleEngine.register(SyllogisticRule.create(this._termFactory));
            this._ruleEngine.register(ModusPonensRule.create(this._termFactory));
        } catch (error) {
            this.logWarn('Error setting up default rules:', error);
        }
    }

    async input(narseseString) {
        try {
            const parsed = this._parser.parse(narseseString);
            if (!parsed?.term) throw new Error('Invalid parse result');

            const task = this._createTask(parsed);
            const added = this._taskManager.addTask(task);

            if (added) {
                this._eventBus.emit('task.input', {task, source: 'user', originalInput: narseseString, parsed});
                await this._processPendingTasks();
            }
            return added;
        } catch (error) {
            this._eventBus.emit('input.error', {error: error.message, input: narseseString});
            throw error;
        }
    }

    _createTask(parsed) {
        const {term, truthValue, punctuation} = parsed;
        const budget = {priority: this._calculateInputPriority(parsed)};

        return new Task({
            term,
            punctuation,
            truth: truthValue ? new Truth(truthValue.frequency, truthValue.confidence) : null,
            budget,
        });
    }

    async initialize() {
        // Initialize all registered components
        const success = await this._componentManager.initializeAll();
        if (success) {
            // Set up default rules after initialization
            this._setupDefaultRules();
        }
        return success;
    }

    start() {
        if (this._isRunning) {
            this.logWarn('NAR already running');
            return false;
        }

        // Start all registered components asynchronously but return immediately
        this._startComponentsAsync();

        this._isRunning = true;
        this._processPendingTasks();

        this._cycleInterval = setInterval(async () => {
            try {
                const result = await this._cycle.execute();
                this._eventBus.emit('cycle.completed', result);
            } catch (error) {
                this.logError('Error in reasoning cycle:', error);
                this._eventBus.emit('cycle.error', {error: error.message});
            }
        }, this._config.get('cycle.delay'));

        this._eventBus.emit('system.started', {timestamp: Date.now()});
        this.logInfo('NAR started successfully');
        return true;
    }

    async _startComponentsAsync() {
        try {
            const success = await this._componentManager.startAll();
            if (!success) {
                this.logError('Failed to start all components');
            }
        } catch (error) {
            this.logError('Error during component start:', error);
        }
    }

    stop() {
        if (!this._isRunning) {
            this.logWarn('NAR not running');
            return false;
        }

        this._isRunning = false;
        this._cycleInterval && clearInterval(this._cycleInterval) && (this._cycleInterval = null);

        // Stop all registered components asynchronously but return immediately
        this._stopComponentsAsync();

        this._eventBus.emit('system.stopped', {timestamp: Date.now()});
        this.logInfo('NAR stopped successfully');
        return true;
    }

    async _stopComponentsAsync() {
        try {
            const success = await this._componentManager.stopAll();
            if (!success) {
                this.logError('Failed to stop all components');
            }
        } catch (error) {
            this.logError('Error during component stop:', error);
        }
    }

    async step() {
        try {
            await this._processPendingTasks();
            const result = await this._cycle.execute();
            this._eventBus.emit('cycle.completed', result);
            return result;
        } catch (error) {
            this._eventBus.emit('cycle.error', {error: error.message});
            this.logError('Error in reasoning step:', error);
            throw error;
        }
    }

    async runCycles(count) {
        const results = [];
        for (let i = 0; i < count; i++) {
            try {
                results.push(await this.step());
            } catch (error) {
                results.push({error: error.message, cycleNumber: i + 1});
            }
        }
        return results;
    }

    async dispose() {
        // Dispose all registered components
        const success = await this._componentManager.disposeAll();
        await super.dispose();
        return success;
    }

    query(queryTerm) {
        return this._memory.getConcept(queryTerm)?.getTasksByType('BELIEF') || [];
    }

    getBeliefs(queryTerm = null) {
        return queryTerm
            ? this.query(queryTerm)
            : Array.from(this._memory.getAllConcepts()).flatMap(concept => concept.getTasksByType('BELIEF'));
    }

    getGoals() {
        return this._taskManager.findTasksByType('GOAL');
    }

    getQuestions() {
        return this._taskManager.findTasksByType('QUESTION');
    }

    reset() {
        this.stop();
        this._memory.clear();
        this._taskManager.clearPendingTasks();
        this._cycle.reset();
        this._eventBus.emit('system.reset', {timestamp: Date.now()});
        this.logInfo('NAR reset completed');
    }

    on(eventName, callback) {
        this._eventBus.on(eventName, callback);
    }

    off(eventName, callback) {
        this._eventBus.off(eventName, callback);
    }

    getStats() {
        return {
            isRunning: this._isRunning,
            cycleCount: this._cycle.cycleCount,
            memoryStats: this._memory.getDetailedStats(),
            taskManagerStats: typeof this._taskManager.getTaskStats === 'function'
                ? this._taskManager.getTaskStats()
                : this._taskManager.stats,
            cycleStats: this._cycle.stats,
            config: this._config.toJSON(),
            lmStats: this._lm ? this._lm.getMetrics() : undefined
        };
    }

    _ensureLMEnabled() {
        if (!this._lm) throw new Error('Language Model is not enabled in this NAR instance');
    }

    // LM-related methods
    registerLMProvider(id, provider) {
        this._ensureLMEnabled();
        this._lm.registerProvider(id, provider);
        return this;
    }

    async generateWithLM(prompt, options = {}) {
        this._ensureLMEnabled();
        return await this._lm.generateText(prompt, options);
    }

    translateToNarsese(text) {
        this._ensureLMEnabled();
        return this._lm.translateToNarsese(text);
    }

    translateFromNarsese(narsese) {
        this._ensureLMEnabled();
        return this._lm.translateFromNarsese(narsese);
    }

    _calculateInputPriority(parsed) {
        const {truthValue, taskType} = parsed;
        const basePriority = this.config.taskManager?.defaultPriority || PRIORITY.DEFAULT;

        if (!truthValue) return basePriority;

        const priorityConfig = this.config.taskManager?.priority || {};
        const {confidenceMultiplier = 0.3, goalBoost = 0.2, questionBoost = 0.1} = priorityConfig;

        const confidenceBoost = (truthValue.confidence || 0) * confidenceMultiplier;
        const typeBoost = {GOAL: goalBoost, QUESTION: questionBoost}[taskType] || 0;

        return Math.min(1.0, basePriority + confidenceBoost + typeBoost);
    }

    async _processPendingTasks() {
        for (const task of this._taskManager.processPendingTasks(Date.now())) {
            this._eventBus.emit('task.added', {task});
        }
    }

    async initializeTools() {
        if (this._toolIntegration) {
            await this._toolIntegration.initializeTools(this);
            this.logger.info('Tools initialized successfully');
            return true;
        }
        return false;
    }

    /**
     * Get current metrics from the MetricsMonitor
     */
    getMetrics() {
        return this._metricsMonitor ? this._metricsMonitor.getMetricsSnapshot() : null;
    }

    /**
     * Perform manual self-optimization
     */
    performSelfOptimization() {
        if (this._metricsMonitor) {
            this._metricsMonitor._performSelfOptimization();
        }
    }

    /**
     * Solve an equation for a variable
     */
    async solveEquation(leftTerm, rightTerm, variableName, context = null) {
        // We need to create an evaluation engine to solve the equation
        // For now, we'll use the existing rule engine's context or create a simple one
        const evaluationContext = context || {
            memory: this._memory,
            termFactory: this._termFactory
        };

        // Use the Cycle's operation evaluation engine if available
        if (this._cycle && this._cycle.operationEvaluationEngine) {
            return await this._cycle.operationEvaluationEngine.solveEquation(
                leftTerm,
                rightTerm,
                variableName,
                evaluationContext
            );
        }

        // If no operation evaluation engine is directly available on the cycle,
        // we'll need to create one or use the rule engine's associated components
        // This is a simplified approach - in a full implementation, the NAR would
        // have direct access to the OperationEvaluationEngine
        return {
            result: SYSTEM_ATOMS.Null,
            success: false,
            message: 'No operation evaluation engine available'
        };
    }

    /**
     * Get current reasoning state for introspection
     */
    getReasoningState() {
        if (this._reasoningAboutReasoning) {
            return this._reasoningAboutReasoning.getReasoningState();
        }
        return null;
    }

    /**
     * Perform meta-cognitive reasoning about the system's state
     */
    async performMetaCognitiveReasoning() {
        if (this._reasoningAboutReasoning) {
            return await this._reasoningAboutReasoning.performMetaCognitiveReasoning();
        }
        return null;
    }

    /**
     * Perform system self-correction based on meta-cognitive analysis
     */
    async performSelfCorrection() {
        if (this._reasoningAboutReasoning) {
            return await this._reasoningAboutReasoning.performSelfCorrection();
        }
        return null;
    }

    /**
     * Query the system's reasoning state for specific information
     */
    querySystemState(query) {
        if (this._reasoningAboutReasoning) {
            return this._reasoningAboutReasoning.querySystemState(query);
        }
        return null;
    }

    /**
     * Get the reasoning trace for introspection
     */
    getReasoningTrace() {
        if (this._reasoningAboutReasoning) {
            return this._reasoningAboutReasoning.getReasoningTrace();
        }
        return [];
    }

    _ensureToolIntegration() {
        if (!this._toolIntegration) throw new Error('Tool integration is not enabled');
    }

    async executeTool(toolId, params, context = {}) {
        this._ensureToolIntegration();

        const startTime = Date.now();
        try {
            const result = await this._toolIntegration.executeTool(toolId, params, {
                nar: this,
                memory: this._memory,
                timestamp: Date.now(),
                ...context
            });

            const duration = Date.now() - startTime;
            if (duration > 1000) { // Log if > 1 second
                this.logger.warn(`Slow tool execution: ${toolId} took ${duration}ms`, {
                    toolId,
                    duration,
                    paramsSize: JSON.stringify(params).length
                });
            }

            return result;
        } catch (error) {
            this.logger.error(`Tool execution failed: ${toolId}`, {
                toolId,
                error: error.message,
                duration: Date.now() - startTime
            });
            throw error;
        }
    }

    async executeTools(toolCalls, context = {}) {
        this._ensureToolIntegration();
        return await this._toolIntegration.executeTools(toolCalls, {
            nar: this,
            memory: this._memory,
            timestamp: Date.now(),
            ...context
        });
    }

    getAvailableTools() {
        return this._toolIntegration ? this._toolIntegration.getAvailableTools() : [];
    }

    _ensureExplanationService() {
        if (!this._explanationService) throw new Error('Explanation service is not enabled');
    }

    async explainToolResult(toolResult, context = {}) {
        this._ensureExplanationService();
        return await this._explanationService.explainToolResult(toolResult, {
            nar: this,
            memory: this._memory,
            timestamp: Date.now(),
            ...context
        });
    }

    async explainToolResults(toolResults, context = {}) {
        this._ensureExplanationService();
        return await this._explanationService.explainToolResults(toolResults, {
            nar: this,
            memory: this._memory,
            timestamp: Date.now(),
            ...context
        });
    }

    async summarizeToolExecution(toolResults, context = {}) {
        this._ensureExplanationService();
        return await this._explanationService.summarizeToolExecution(toolResults, {
            nar: this,
            memory: this._memory,
            timestamp: Date.now(),
            ...context
        });
    }

    async assessToolResults(toolResults, context = {}) {
        this._ensureExplanationService();
        return await this._explanationService.assessToolResults(toolResults, {
            nar: this,
            memory: this._memory,
            timestamp: Date.now(),
            ...context
        });
    }
}
