import { Agent } from '../Agent.js';
import { NAR } from '../nar/NAR.js';
import { FunctorRegistry } from '../reasoning/Functor.js';
import { RuleEngine } from '../reasoning/RuleEngine.js';
import { ToolIntegration } from '../tools/ToolIntegration.js';
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

    withConfig(config) {
        this.config = { ...this.config, ...config };
        return this;
    }

    withMetrics(metricsConfig = true) {
        this.config.subsystems.metrics = metricsConfig;
        return this;
    }

    withEmbeddings(embeddingConfig = true) {
        this.config.subsystems.embeddingLayer = embeddingConfig;
        return this;
    }

    withFunctors(functorConfig) {
        this.config.subsystems.functors = Array.isArray(functorConfig) ? functorConfig : functorConfig;
        return this;
    }

    withRules(ruleConfig) {
        this.config.subsystems.rules = Array.isArray(ruleConfig) ? ruleConfig : ruleConfig;
        return this;
    }

    withTools(toolConfig = true) {
        this.config.subsystems.tools = toolConfig;
        return this;
    }

    withLM(lmConfig = true) {
        this.config.subsystems.lm = lmConfig;
        return this;
    }

    registerDependency(name, dependency) {
        this.dependencies.set(name, dependency);
        return this;
    }

    build() {
        const systemConfig = SystemConfig.from(this._extractSystemConfig(this.config));
        
        const narConfig = this._buildNARConfig();
        
        const nar = new NAR(narConfig);
        
        const agent = new Agent({
            nar,
            ...this.config.agent
        });

        const pluginManager = new PluginManager({
            nar,
            agent,
            eventBus: nar._eventBus || nar.eventBus
        });
        
        if (this.config.subsystems.plugins) {
            this._registerPlugins(pluginManager, this.config.subsystems.plugins);
        }
        
        agent._pluginManager = pluginManager;

        if (this.config.subsystems.functors) {
            const evaluator = nar._evaluator || nar.getEvaluator?.();
            if (evaluator) {
                this._registerFunctors(evaluator.getFunctorRegistry(), this.config.subsystems.functors);
            }
        }

        if (this.config.subsystems.rules) {
            const ruleEngine = nar._ruleEngine || nar.getRuleEngine?.();
            if (ruleEngine) {
                this._registerRules(ruleEngine, this.config.subsystems.rules);
            }
        }

        this._initializeSubsystems(agent, nar);

        return agent;
    }

    _buildNARConfig() {
        const narConfig = {
            ...this.config.nar,
            lm: { enabled: !!this.config.subsystems.lm },
            tools: { enabled: !!this.config.subsystems.tools }
        };

        if (this.config.subsystems.metrics) {
            narConfig.metricsMonitor = typeof this.config.subsystems.metrics === 'object' 
                ? this.config.subsystems.metrics 
                : {};
        }

        if (this.config.subsystems.embeddingLayer) {
            narConfig.embeddingLayer = typeof this.config.subsystems.embeddingLayer === 'object'
                ? this.config.subsystems.embeddingLayer
                : { enabled: true };
        }

        return narConfig;
    }

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

    _registerFunctors(registry, functorConfig) {
        if (Array.isArray(functorConfig)) {
            functorConfig.forEach(collection => {
                this._registerFunctorCollection(registry, collection);
            });
        } else if (typeof functorConfig === 'object') {
            this._registerFunctorCollections(registry, functorConfig);
        }
    }

    _registerFunctorCollection(registry, collectionName) {
        const collectionMap = {
            'core-arithmetic': () => this._registerArithmeticFunctors(registry),
            'set-operations': () => this._registerSetOperationFunctors(registry),
        };

        const registerFn = collectionMap[collectionName];
        if (registerFn) {
            registerFn();
        } else {
            this.logger?.warn(`Unknown functor collection: ${collectionName}`);
        }
    }

    _registerFunctorCollections(registry, collectionsConfig) {
        Object.entries(collectionsConfig)
            .filter(([, enabled]) => enabled)
            .forEach(([collectionName]) => this._registerFunctorCollection(registry, collectionName));
    }

    _registerArithmeticFunctors(registry) {
        const arithmeticOps = [
            { name: 'add', fn: (a, b) => a + b, commutative: true, associative: true, desc: 'Addition operation' },
            { name: 'subtract', fn: (a, b) => a - b, commutative: false, associative: false, desc: 'Subtraction operation' },
            { name: 'multiply', fn: (a, b) => a * b, commutative: true, associative: true, desc: 'Multiplication operation' },
            { name: 'divide', fn: (a, b) => b !== 0 ? a / b : null, commutative: false, associative: false, desc: 'Division operation' }
        ];
        
        arithmeticOps.forEach(op => {
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
            if (!registry.has(op.name)) {
                registry.registerFunctorDynamic(op.name, op.fn, { 
                    arity: 2, 
                    isCommutative: op.commutative,
                    description: op.desc
                });
            }
        });
    }

    _registerRules(ruleEngine, ruleConfig) {
        if (Array.isArray(ruleConfig)) {
            ruleConfig.forEach(ruleSetName => {
                this._registerRuleSet(ruleEngine, ruleSetName);
            });
        } else if (typeof ruleConfig === 'object') {
            this._registerRuleSets(ruleEngine, ruleConfig);
        }
    }

    _registerRuleSet(ruleEngine, ruleSetName) {
        const ruleSetMap = {
            'syllogistic-core': () => this._registerSyllogisticRules(ruleEngine),
            'temporal': () => this._registerTemporalRules(ruleEngine),
        };

        const registerFn = ruleSetMap[ruleSetName];
        if (registerFn) {
            registerFn();
        } else {
            this.logger?.warn(`Unknown rule set: ${ruleSetName}`);
        }
    }

    _registerRuleSets(ruleEngine, ruleSetsConfig) {
        Object.entries(ruleSetsConfig)
            .filter(([, enabled]) => enabled)
            .forEach(([ruleSetName]) => this._registerRuleSet(ruleEngine, ruleSetName));
    }

    _registerSyllogisticRules(ruleEngine) {
        // This would typically import and register actual syllogistic rules
        // For now, we'll assume they're available in the system
        // Implementation would go here based on existing rule imports
    }

    _registerTemporalRules(ruleEngine) {
        // Implementation would go here based on existing temporal rule imports
    }

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
                        this.logger?.error('Failed to start plugins:', error);
                    });
                } else {
                    this.logger?.error('Failed to initialize plugins');
                }
            }).catch(error => {
                this.logger?.error('Failed to initialize plugins:', error);
            });
        }
    }
}