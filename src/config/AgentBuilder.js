import { Agent } from '../Agent.js';
import { NAR } from '../nar/NAR.js';
import { PrologParser } from '../PrologParser.js';
import { FunctorRegistry } from '../reasoning/Functor.js';
import { RuleEngine } from '../reasoning/RuleEngine.js';
import { MetricsMonitor } from '../reasoning/MetricsMonitor.js';
import { LM } from '../lm/LM.js';
import { ToolIntegration } from '../tools/ToolIntegration.js';
import { EmbeddingLayer } from '../lm/EmbeddingLayer.js';
import { SystemConfig } from './SystemConfig.js';
import { PluginManager } from '../util/Plugin.js';

export class AgentBuilder {
    constructor() {
        this.config = {
            subsystems: {
                metrics: true,
                embeddingLayer: false,
                functors: ['core-arithmetic', 'set-operations'],
                rules: ['syllogistic-core', 'temporal'],
                tools: false,
                lm: false
            },
            memory: {
                enableMemoryValidation: true,
                memoryValidationInterval: 30000
            },
            lm: {
                circuitBreaker: {
                    failureThreshold: 5,
                    timeout: 60000,
                    resetTimeout: 30000
                }
            }
        };
        this.dependencies = new Map();
    }

    /**
     * Create an agent with the specified configuration (factory method)
     */
    static createAgent(config = {}) {
        const builder = new AgentBuilder();
        
        if (config) {
            if (config.metrics !== undefined) builder.withMetrics(config.metrics);
            if (config.embeddingLayer !== undefined) builder.withEmbeddings(config.embeddingLayer);
            if (config.functors !== undefined) builder.withFunctors(config.functors);
            if (config.rules !== undefined) builder.withRules(config.rules);
            if (config.tools !== undefined) builder.withTools(config.tools);
            if (config.lm !== undefined) builder.withLM(config.lm);
            
            if (config.plugins) {
                builder.withConfig({ subsystems: { ...builder.config.subsystems, plugins: config.plugins } });
            }
            
            builder.withConfig(config);
        }
        
        return builder.build();
    }

    /**
     * Create a basic agent with default configuration (factory method)
     */
    static createBasicAgent() {
        return AgentBuilder.createAgent({
            subsystems: {
                metrics: true,
                embeddingLayer: false,
                functors: ['core-arithmetic'],
                rules: ['syllogistic-core'],
                tools: false,
                lm: false
            }
        });
    }

    /**
     * Create an advanced agent with LM and tools enabled (factory method)
     */
    static createAdvancedAgent(config = {}) {
        return AgentBuilder.createAgent({
            subsystems: {
                metrics: true,
                embeddingLayer: true,
                functors: ['core-arithmetic', 'set-operations'],
                rules: ['syllogistic-core', 'temporal'],
                tools: true,
                lm: { enabled: true }
            },
            ...config
        });
    }

    /**
     * Set the base configuration
     * @param {Object} config - Configuration object
     * @returns {AgentBuilder} - This builder instance
     */
    withConfig(config) {
        this.config = { ...this.config, ...config };
        return this;
    }

    /**
     * Enable or disable metrics subsystem
     * @param {boolean|Object} metricsConfig - Whether to enable metrics or configuration object
     * @returns {AgentBuilder} - This builder instance
     */
    withMetrics(metricsConfig = true) {
        this.config.subsystems.metrics = metricsConfig;
        return this;
    }

    /**
     * Configure embedding layer subsystem
     * @param {boolean|Object} embeddingConfig - Whether to enable embeddings or configuration object
     * @returns {AgentBuilder} - This builder instance
     */
    withEmbeddings(embeddingConfig = true) {
        this.config.subsystems.embeddingLayer = embeddingConfig;
        return this;
    }

    /**
     * Configure functor collections
     * @param {string[]|Object} functorConfig - Functor names or configuration object
     * @returns {AgentBuilder} - This builder instance
     */
    withFunctors(functorConfig) {
        this.config.subsystems.functors = Array.isArray(functorConfig) ? functorConfig : functorConfig;
        return this;
    }

    /**
     * Configure rule sets
     * @param {string[]|Object} ruleConfig - Rule names or configuration object
     * @returns {AgentBuilder} - This builder instance
     */
    withRules(ruleConfig) {
        this.config.subsystems.rules = Array.isArray(ruleConfig) ? ruleConfig : ruleConfig;
        return this;
    }

    /**
     * Configure tool subsystem
     * @param {boolean|Object} toolConfig - Whether to enable tools or configuration object
     * @returns {AgentBuilder} - This builder instance
     */
    withTools(toolConfig = true) {
        this.config.subsystems.tools = toolConfig;
        return this;
    }

    /**
     * Configure language model subsystem
     * @param {boolean|Object} lmConfig - Whether to enable LM or configuration object
     * @returns {AgentBuilder} - This builder instance
     */
    withLM(lmConfig = true) {
        this.config.subsystems.lm = lmConfig;
        return this;
    }

    /**
     * Register a custom dependency
     * @param {string} name - Dependency name
     * @param {*} dependency - Dependency instance
     * @returns {AgentBuilder} - This builder instance
     */
    registerDependency(name, dependency) {
        this.dependencies.set(name, dependency);
        return this;
    }

    /**
     * Build the Agent instance with configured subsystems
     * @returns {Agent} - Configured Agent instance
     */
    build() {
        // Create system configuration
        const systemConfig = SystemConfig.from(this._extractSystemConfig(this.config));
        
        // Build NAR with configured subsystems
        const narConfig = this._buildNARConfig();
        
        // Create the NAR instance
        const nar = new NAR(narConfig);
        
        // Create the agent with the configured NAR
        const agent = new Agent({
            nar,
            ...this.config.agent
        });

        // Create and set up plugin manager
        const pluginManager = new PluginManager({
            nar,
            agent,
            eventBus: nar._eventBus || nar.eventBus
        });
        
        // Register plugins if configured
        if (this.config.subsystems.plugins) {
            this._registerPlugins(pluginManager, this.config.subsystems.plugins);
        }
        
        // Store the plugin manager in the agent
        agent._pluginManager = pluginManager;

        // Register configured functors
        if (this.config.subsystems.functors) {
            // Since we're registering functors on the agent, we need to get the evaluator from the NAR
            const evaluator = nar._evaluator || nar.getEvaluator?.();
            if (evaluator) {
                this._registerFunctors(evaluator.getFunctorRegistry(), this.config.subsystems.functors);
            }
        }

        // Register configured rules
        if (this.config.subsystems.rules) {
            const ruleEngine = nar._ruleEngine || nar.getRuleEngine?.();
            if (ruleEngine) {
                this._registerRules(ruleEngine, this.config.subsystems.rules);
            }
        }

        // Initialize configured subsystems
        this._initializeSubsystems(agent, nar);

        return agent;
    }

    /**
     * Build NAR configuration based on subsystems
     * @returns {Object} - NAR configuration object
     */
    _buildNARConfig() {
        const narConfig = {
            ...this.config.nar,
            lm: { enabled: !!this.config.subsystems.lm },
            tools: { enabled: !!this.config.subsystems.tools }
        };

        // Add metrics monitor configuration if enabled
        if (this.config.subsystems.metrics) {
            narConfig.metricsMonitor = typeof this.config.subsystems.metrics === 'object' 
                ? this.config.subsystems.metrics 
                : {};
        }

        // Add embedding layer configuration if enabled
        if (this.config.subsystems.embeddingLayer) {
            narConfig.embeddingLayer = typeof this.config.subsystems.embeddingLayer === 'object'
                ? this.config.subsystems.embeddingLayer
                : { enabled: true };
        }

        return narConfig;
    }

    /**
     * Extract system-level configuration from the main config
     * @param {Object} config - Full configuration object
     * @returns {Object} - System configuration
     */
    _extractSystemConfig(config) {
        return {
            system: config.system || {},
            memory: config.memory || {},
            cycle: config.cycle || {},
            performance: config.performance || {},
            logging: config.logging || {},
            errorHandling: config.errorHandling || {}
        };
    }

    /**
     * Register functors with the functor registry
     * @param {FunctorRegistry} registry - Functor registry instance
     * @param {string[]|Object} functorConfig - Functor configuration
     */
    _registerFunctors(registry, functorConfig) {
        if (Array.isArray(functorConfig)) {
            // Register default functor collections
            functorConfig.forEach(collection => {
                this._registerFunctorCollection(registry, collection);
            });
        } else if (typeof functorConfig === 'object') {
            // Register functors based on more detailed configuration
            this._registerFunctorCollections(registry, functorConfig);
        }
    }

    /**
     * Register a functor collection
     * @param {FunctorRegistry} registry - Functor registry instance
     * @param {string} collectionName - Name of the functor collection
     */
    _registerFunctorCollection(registry, collectionName) {
        const collectionMap = {
            'core-arithmetic': () => this._registerArithmeticFunctors(registry),
            'set-operations': () => this._registerSetOperationFunctors(registry),
        };

        const registerFn = collectionMap[collectionName];
        if (registerFn) {
            registerFn();
        } else {
            console.warn(`Unknown functor collection: ${collectionName}`);
        }
    }

    /**
     * Register functor collections based on detailed configuration
     * @param {FunctorRegistry} registry - Functor registry instance
     * @param {Object} collectionsConfig - Collections configuration object
     */
    _registerFunctorCollections(registry, collectionsConfig) {
        Object.entries(collectionsConfig)
            .filter(([, enabled]) => enabled)
            .forEach(([collectionName]) => this._registerFunctorCollection(registry, collectionName));
    }

    /**
     * Register arithmetic functors
     * @param {FunctorRegistry} registry - Functor registry instance
     */
    _registerArithmeticFunctors(registry) {
        const arithmeticOps = [
            { name: 'add', fn: (a, b) => a + b, commutative: true, associative: true, desc: 'Addition operation' },
            { name: 'subtract', fn: (a, b) => a - b, commutative: false, associative: false, desc: 'Subtraction operation' },
            { name: 'multiply', fn: (a, b) => a * b, commutative: true, associative: true, desc: 'Multiplication operation' },
            { name: 'divide', fn: (a, b) => b !== 0 ? a / b : null, commutative: false, associative: false, desc: 'Division operation' }
        ];
        
        arithmeticOps.forEach(op => {
            // Only register if it doesn't already exist
            if (!registry.has(op.name)) {
                registry.registerFunctorDynamic(op.name, op.fn, { 
                    arity: 2, 
                    isCommutative: op.commutative, 
                    isAssociative: op.associative,
                    description: op.desc
                });
            }
        });
    }

    /**
     * Register set operation functors
     * @param {FunctorRegistry} registry - Functor registry instance
     */
    _registerSetOperationFunctors(registry) {
        const setOps = [
            { 
                name: 'union', 
                fn: (a, b) => Array.isArray(a) && Array.isArray(b) ? [...new Set([...a, ...b])] : null,
                commutative: true,
                desc: 'Set union operation'
            },
            { 
                name: 'intersection', 
                fn: (a, b) => Array.isArray(a) && Array.isArray(b) ? a.filter(x => b.includes(x)) : null,
                commutative: true,
                desc: 'Set intersection operation'
            }
        ];
        
        setOps.forEach(op => {
            // Only register if it doesn't already exist
            if (!registry.has(op.name)) {
                registry.registerFunctorDynamic(op.name, op.fn, { 
                    arity: 2, 
                    isCommutative: op.commutative,
                    description: op.desc
                });
            }
        });
    }

    /**
     * Register rules with the rule engine
     * @param {RuleEngine} ruleEngine - Rule engine instance
     * @param {string[]|Object} ruleConfig - Rule configuration
     */
    _registerRules(ruleEngine, ruleConfig) {
        if (Array.isArray(ruleConfig)) {
            // Register default rule sets
            ruleConfig.forEach(ruleSetName => {
                this._registerRuleSet(ruleEngine, ruleSetName);
            });
        } else if (typeof ruleConfig === 'object') {
            // Register rules based on more detailed configuration
            this._registerRuleSets(ruleEngine, ruleConfig);
        }
    }

    /**
     * Register a rule set
     * @param {RuleEngine} ruleEngine - Rule engine instance
     * @param {string} ruleSetName - Name of the rule set
     */
    _registerRuleSet(ruleEngine, ruleSetName) {
        const ruleSetMap = {
            'syllogistic-core': () => this._registerSyllogisticRules(ruleEngine),
            'temporal': () => this._registerTemporalRules(ruleEngine),
        };

        const registerFn = ruleSetMap[ruleSetName];
        if (registerFn) {
            registerFn();
        } else {
            console.warn(`Unknown rule set: ${ruleSetName}`);
        }
    }

    /**
     * Register rule sets based on detailed configuration
     * @param {RuleEngine} ruleEngine - Rule engine instance
     * @param {Object} ruleSetsConfig - Rule sets configuration object
     */
    _registerRuleSets(ruleEngine, ruleSetsConfig) {
        Object.entries(ruleSetsConfig)
            .filter(([, enabled]) => enabled)
            .forEach(([ruleSetName]) => this._registerRuleSet(ruleEngine, ruleSetName));
    }

    /**
     * Register syllogistic rules
     * @param {RuleEngine} ruleEngine - Rule engine instance
     */
    _registerSyllogisticRules(ruleEngine) {
        // This would typically import and register actual syllogistic rules
        // For now, we'll assume they're available in the system
        // Implementation would go here based on existing rule imports
    }

    /**
     * Register temporal rules
     * @param {RuleEngine} ruleEngine - Rule engine instance
     */
    _registerTemporalRules(ruleEngine) {
        // Implementation would go here based on existing temporal rule imports
    }

    /**
     * Initialize configured subsystems
     * @param {Agent} agent - Agent instance
     * @param {NAR} nar - NAR instance
     */
    /**
     * Register plugins with the plugin manager
     * @param {PluginManager} pluginManager - Plugin manager instance
     * @param {Array|Object} pluginConfig - Plugin configuration
     */
    _registerPlugins(pluginManager, pluginConfig) {
        if (Array.isArray(pluginConfig)) {
            pluginConfig.forEach(pluginSpec => {
                if (pluginSpec && pluginSpec.instance) {
                    pluginManager.registerPlugin(pluginSpec.instance);
                } else if (pluginSpec && pluginSpec.constructor) {
                    const plugin = new pluginSpec.constructor(
                        pluginSpec.id || pluginSpec.constructor.name.toLowerCase(), 
                        pluginSpec.config || {}
                    );
                    pluginManager.registerPlugin(plugin);
                }
            });
        } else if (typeof pluginConfig === 'object') {
            Object.entries(pluginConfig)
                .filter(([, config]) => config && config.enabled !== false)
                .forEach(([pluginId, config]) => {
                    if (config.instance) {
                        pluginManager.registerPlugin(config.instance);
                    } else if (config.constructor) {
                        const plugin = new config.constructor(pluginId, config.config || {});
                        pluginManager.registerPlugin(plugin);
                    }
                });
        }
    }

    _initializeSubsystems(agent, nar) {
        if (this.config.subsystems.tools) {
            agent.getNAR().initializeTools().catch(() => {});
        }
        
        if (agent._pluginManager) {
            agent._pluginManager.initializeAll().then(success => {
                if (success) {
                    agent._pluginManager.startAll().catch(error => {
                        console.error('Failed to start plugins:', error);
                    });
                } else {
                    console.error('Failed to initialize plugins');
                }
            }).catch(error => {
                console.error('Failed to initialize plugins:', error);
            });
        }
    }
}