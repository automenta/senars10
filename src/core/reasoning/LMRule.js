import {Logger} from '../../util/Logger.js';
import {Rule} from './Rule.js';

/**
 * An LM-based reasoning rule that interacts with a Language Model.
 * This class is designed to be highly configurable and declarative,
 * allowing for the easy creation of new rules with minimal boilerplate.
 */
export class LMRule extends Rule {
    constructor(id, lm, promptTemplate, responseProcessor, priority = 1.0, config = {}) {
        super(id, 'lm', priority, config);
        this.lm = lm; // Reference to the LM instance
        this._promptTemplate = promptTemplate;
        this._responseProcessor = responseProcessor;
        this.logger = Logger;
        this._lmConfig = {
            temperature: 0.7,  // Default temperature
            maxTokens: 1000,   // Default max tokens
            model: 'default',  // Default model
            ...config.lm
        };

        // Initialize metrics for LM operations
        this.lmStats = {
            tokens: 0,
            calls: 0,
            avgTime: 0
        };

        this._freeze();
    }

    get promptTemplate() {
        return this._promptTemplate;
    }

    get responseProcessor() {
        return this._responseProcessor;
    }

    get lmConfig() {
        return {...this._lmConfig};
    }

    /**
     * Checks if this rule can be applied to the given task
     */
    _matches(task) {
        // Check if LM is available and task is relevant
        return this._enabled && this.lm && this._isRelevant(task);
    }

    /**
     * Determines if the task is relevant for this rule
     */
    _isRelevant(task) {
        // Basic relevance check - can be overridden by subclasses
        return true;
    }

    /**
     * Applies the rule to the given task
     */
    async _apply(task) {
        const startTime = Date.now();
        try {
            if (!this.lm) {
                throw new Error(`LM unavailable for rule ${this.id}`);
            }

            const prompt = this._buildPrompt(task);
            const response = await this._callLanguageModel(prompt);
            const processedResponse = await this._responseProcessor(response, task);

            // Update LM stats
            this._updateLMStats(prompt.length + (response?.length || 0), Date.now() - startTime);

            return Array.isArray(processedResponse) ? processedResponse : [processedResponse];
        } catch (error) {
            this.logger.warn(`LM rule ${this.id} failed:`, error);
            this._updateLMStats(0, Date.now() - startTime);
            return [];
        }
    }

    /**
     * Builds the prompt for the language model based on the task
     */
    _buildPrompt(task) {
        const templateVars = {
            taskTerm: task.term?.toString() || 'unknown',
            taskType: task.type || 'unknown',
            taskTruth: task.truth ?
                `(${task.truth.f?.toFixed(2) || task.truth.f || 0.5}, ${task.truth.c?.toFixed(2) || task.truth.c || 0.5})` :
                'no truth',
            context: this._getContext(task)
        };

        return this._promptTemplate.replace(/\{\{(\w+)\}\}/g, (match, key) =>
            templateVars[key] !== undefined ? templateVars[key] : match
        );
    }

    /**
     * Gets context for prompt building
     */
    _getContext(task) {
        return `Task: ${task.term?.toString() || 'unknown'}, Type: ${task.type || 'unknown'}`;
    }

    /**
     * Calls the language model with the constructed prompt
     */
    async _callLanguageModel(prompt) {
        if (!this.lm) {
            throw new Error(`LM unavailable for rule ${this.id}`);
        }

        const startTime = Date.now();
        const response = await this.lm.process(prompt, this._lmConfig);
        const time = Date.now() - startTime;

        this._updateLMStats(prompt.length + (response?.length || 0), time);
        return response;
    }

    /**
     * Updates language model statistics
     */
    _updateLMStats(tokens, time) {
        const s = this.lmStats;
        s.calls++;
        s.tokens += tokens;
        s.avgTime = (s.avgTime * (s.calls - 1) + time) / s.calls;
    }

    /**
     * Gets the current LM statistics for this rule
     */
    getLMStats() {
        return {...this.lmStats};
    }

    // Override _clone to handle LMRule-specific constructor signature
    _clone(overrides = {}, newConfig = null) {
        const configArg = newConfig || {...this._config, ...overrides};
        return new LMRule(this._id, this.lm, this._promptTemplate, this._responseProcessor, this._priority, configArg);
    }

    withConfig(newConfig) {
        return this._clone({...newConfig});
    }

    withTemperature(temperature) {
        return this.withConfig({lm: {...this._lmConfig, temperature}});
    }

    withMaxTokens(maxTokens) {
        return this.withConfig({lm: {...this._lmConfig, maxTokens}});
    }

    withModel(model) {
        return this.withConfig({lm: {...this._lmConfig, model}});
    }
}