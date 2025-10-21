import Joi from 'joi';

/**
 * Configuration validation schema using JOI
 */
const configSchema = Joi.object({
    memory: Joi.object({
        capacity: Joi.number().integer().min(1).max(100000).default(1000),
        consolidationThreshold: Joi.number().min(0).max(1).default(0.1),
        forgettingThreshold: Joi.number().min(0).max(1).default(0.05),
        conceptActivationDecay: Joi.number().min(0).max(1).default(0.95),
        focusSetSize: Joi.number().integer().min(1).max(10000).default(100)
    }).default(),
    
    focus: Joi.object({
        size: Joi.number().integer().min(1).max(10000).default(100),
        setCount: Joi.number().integer().min(1).max(10).default(3),
        attentionDecay: Joi.number().min(0).max(1).default(0.98),
        diversityFactor: Joi.number().min(0).max(1).default(0.3)
    }).default(),
    
    taskManager: Joi.object({
        defaultPriority: Joi.number().min(0).max(1).default(0.5),
        priorityThreshold: Joi.number().min(0).max(1).default(0.1),
        priority: Joi.object({
            confidenceMultiplier: Joi.number().min(0).max(1).default(0.3),
            goalBoost: Joi.number().min(0).max(1).default(0.2),
            questionBoost: Joi.number().min(0).max(1).default(0.1)
        }).default()
    }).default(),
    
    cycle: Joi.object({
        delay: Joi.number().integer().min(1).max(10000).default(50),
        maxTasksPerCycle: Joi.number().integer().min(1).max(1000).default(10),
        ruleApplicationLimit: Joi.number().integer().min(1).max(10000).default(50)
    }).default(),
    
    ruleEngine: Joi.object({
        enableValidation: Joi.boolean().default(true),
        maxRuleApplicationsPerCycle: Joi.number().integer().min(1).max(1000).default(20),
        performanceTracking: Joi.boolean().default(true)
    }).default(),
    
    lm: Joi.object({
        enabled: Joi.boolean().default(false),
        defaultProvider: Joi.string().default('dummy'),
        maxConcurrentRequests: Joi.number().integer().min(1).max(100).default(5),
        timeout: Joi.number().integer().min(100).max(60000).default(10000),
        retryAttempts: Joi.number().integer().min(0).max(10).default(2),
        cacheEnabled: Joi.boolean().default(true),
        cacheSize: Joi.number().integer().min(1).max(10000).default(100)
    }).default(),
    
    performance: Joi.object({
        enableProfiling: Joi.boolean().default(false),
        maxExecutionTime: Joi.number().integer().min(1).max(10000).default(100),
        memoryLimit: Joi.number().integer().min(1024 * 1024).max(8 * 1024 * 1024).default(512 * 1024 * 1024),
        gcThreshold: Joi.number().min(0).max(1).default(0.8)
    }).default(),
    
    logging: Joi.object({
        level: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
        enableConsole: Joi.boolean().default(true),
        enableFile: Joi.boolean().default(false),
        maxFileSize: Joi.number().integer().min(1024).max(100 * 1024 * 1024).default(10 * 1024 * 1024),
        retentionDays: Joi.number().integer().min(1).max(365).default(7)
    }).default(),
    
    errorHandling: Joi.object({
        enableGracefulDegradation: Joi.boolean().default(true),
        maxErrorRate: Joi.number().min(0).max(1).default(0.1),
        enableRecovery: Joi.boolean().default(true),
        recoveryAttempts: Joi.number().integer().min(0).max(10).default(3)
    }).default()
});

/**
 * Validates the configuration against the schema
 * @param {Object} config - Configuration to validate
 * @returns {Object} - Validation result with error and value properties
 */
const validateConfig = (config) => {
    return configSchema.validate(config, { 
        abortEarly: false, 
        allowUnknown: true,
        stripUnknown: false 
    });
};

export { validateConfig, configSchema };