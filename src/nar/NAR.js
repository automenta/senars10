import {SystemConfig} from './SystemConfig.js';
import {TermFactory} from '../term/TermFactory.js';
import {Memory} from '../memory/Memory.js';
import {TaskManager} from '../task/TaskManager.js';
import {Cycle} from './Cycle.js';
import {NarseseParser} from '../parser/NarseseParser.js';
import {EventBus} from '../util/EventBus.js';
import {RuleEngine} from '../reasoning/RuleEngine.js';
import {SyllogisticRule} from '../reasoning/rules/syllogism.js';
import {ModusPonensRule} from '../reasoning/rules/modusponens.js';
import {PRIORITY} from '../config/constants.js';
import {Logger} from '../util/Logger.js';
import {NaiveExhaustiveStrategy} from '../reasoning/NaiveExhaustiveStrategy.js';
import {CoordinatedReasoningStrategy} from '../reasoning/CoordinatedReasoningStrategy.js';
import {Focus} from '../memory/Focus.js';
import {LM} from '../lm/LM.js';
import {Task} from '../task/Task.js';
import {Truth} from '../Truth.js';
import {ToolIntegration} from '../tools/ToolIntegration.js';
import {ExplanationService} from '../tools/ExplanationService.js';

export class NAR {
    constructor(config = {}) {
        // Store the desired LM state early before config processing
        const desiredLmEnabled = config.lm?.enabled === true;

        this._config = SystemConfig.from(config);
        this.logger = Logger;

        this._termFactory = new TermFactory();
        this._memory = new Memory(this._config.memory);
        this._parser = new NarseseParser(this._termFactory);
        this._eventBus = new EventBus();

        this._focus = new Focus(this._config.focus);

        this._taskManager = new TaskManager(this._memory, this._focus, this._config.taskManager);

        // Initialize LM if enabled in config
        this._lm = null;

        // Use the pre-stored LM enabled state to avoid potential config processing issues
        if (desiredLmEnabled) {
            this._lm = new LM();
            this._ruleEngine = new RuleEngine(this._config.ruleEngine || {}, this._lm);
        } else {
            this._ruleEngine = new RuleEngine(this._config.ruleEngine || {});
        }

        this._setupDefaultRules();

        // Use coordinated reasoning strategy if LM is enabled, otherwise use naive strategy
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
            termFactory: this._termFactory
        });

        // Initialize tool integration
        this._tools = null;
        this._toolIntegration = null;
        this._explanationService = null;
        
        // Initialize tool integration if enabled
        if (config.tools?.enabled !== false) {
            this._toolIntegration = new ToolIntegration(config.tools || {});
            this._toolIntegration.connectToReasoningCore(this);
            
            // Initialize explanation service with LM if available
            const explanationConfig = {
                lm: this._lm || null,
                ...config.tools?.explanation
            };
            this._explanationService = new ExplanationService(explanationConfig);
        }

        this._isRunning = false;
        this._cycleInterval = null;
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

    _setupDefaultRules() {
        try {
            this._ruleEngine.register(SyllogisticRule.create(this._termFactory));
            this._ruleEngine.register(ModusPonensRule.create(this._termFactory));
        } catch (error) {
            this.logger.warn('Error setting up default rules:', error);
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

    start() {
        if (this._isRunning) return false;

        this._isRunning = true;
        this._processPendingTasks();

        this._cycleInterval = setInterval(async () => {
            try {
                const result = await this._cycle.execute();
                this._eventBus.emit('cycle.completed', result);
            } catch (error) {
                this.logger.error('Error in reasoning cycle:', error);
                this._eventBus.emit('cycle.error', {error: error.message});
            }
        }, this._config.get('cycle.delay'));

        this._eventBus.emit('system.started', {timestamp: Date.now()});
        return true;
    }

    stop() {
        if (!this._isRunning) return false;

        this._isRunning = false;
        if (this._cycleInterval) {
            clearInterval(this._cycleInterval);
            this._cycleInterval = null;
        }

        this._eventBus.emit('system.stopped', {timestamp: Date.now()});
        return true;
    }

    async step() {
        try {
            await this._processPendingTasks();
            const result = await this._cycle.execute();
            this._eventBus.emit('cycle.completed', result);
            return result;
        } catch (error) {
            this._eventBus.emit('cycle.error', {error: error.message});
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

    query(queryTerm) {
        return this._memory.getConcept(queryTerm)?.getTasksByType('BELIEF') || [];
    }

    getBeliefs(queryTerm = null) {
        return queryTerm ? this.query(queryTerm) :
            Array.from(this._memory.getAllConcepts()).flatMap(concept => concept.getTasksByType('BELIEF'));
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

        if (!truthValue) {
            return basePriority;
        }

        const priorityConfig = this.config.taskManager?.priority || {};
        const confidenceMultiplier = priorityConfig.confidenceMultiplier || 0.3; // Default value
        const goalBoost = priorityConfig.goalBoost || 0.2; // Default value
        const questionBoost = priorityConfig.questionBoost || 0.1; // Default value

        const confidenceBoost = (truthValue.confidence || 0) * confidenceMultiplier;
        const typeBoost = {
            'GOAL': goalBoost,
            'QUESTION': questionBoost
        }[taskType] || 0;

        return Math.min(1.0, basePriority + confidenceBoost + typeBoost);
    }

    async _processPendingTasks() {
        for (const task of this._taskManager.processPendingTasks(Date.now())) {
            this._eventBus.emit('task.added', {task});
        }
    }
    
    // Tool Integration Methods
    get tools() {
        return this._toolIntegration;
    }
    
    async initializeTools() {
        if (this._toolIntegration) {
            await this._toolIntegration.initializeTools(this);
            this.logger.info('Tools initialized successfully');
            return true;
        }
        return false;
    }
    
    _ensureToolIntegration() {
        if (!this._toolIntegration) throw new Error('Tool integration is not enabled');
    }
    
    async executeTool(toolId, params, context = {}) {
        this._ensureToolIntegration();
        
        // Track tool execution performance
        const startTime = Date.now();
        try {
            const result = await this._toolIntegration.executeTool(toolId, params, {
                nar: this,
                memory: this._memory,
                timestamp: Date.now(),
                ...context
            });
            
            // Log performance if it took longer than threshold
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
    
    // Tool Explanation Methods
    get explanationService() {
        return this._explanationService;
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
