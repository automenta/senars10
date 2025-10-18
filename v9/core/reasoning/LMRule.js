import { Rule } from './Rule.js';
import { Logger } from '../base/utilities.js';

/**
 * An LM-based reasoning rule that interacts with a Language Model.
 * This class is designed to be highly configurable and declarative,
 * allowing for the easy creation of new rules with minimal boilerplate.
 */
export class LMRule extends Rule {
  constructor(id, lm, config = {}) {
    super(id, { ...config, type: 'lm' });
    this.lm = lm;
    this.config = {
      // Default condition: always true if an LM is available
      condition: (context) => !!this.lm,
      // Default prompt: throws an error if not overridden
      prompt: (context) => { throw new Error(`Prompt generation not implemented for rule: ${this.id}`); },
      // Default process: returns the raw LM output
      process: (lmResponse, context) => lmResponse,
      // Default generate: returns an empty array
      generate: (processedOutput, context) => [],
      // Default LM options
      lm_options: {
        temperature: 0.7,
        max_tokens: 1000,
      },
      ...config,
    };
    this.lmStats = { tokens: 0, calls: 0, avgTime: 0 };
  }

  static create(config) {
    const { id, lm, ...rest } = config;
    if (!id || !lm) {
      throw new Error('LMRule.create: `id` and `lm` are required to create an LMRule.');
    }
    return new LMRule(id, lm, rest);
  }

  canApply(context) {
    return this.config.condition(context);
  }

  generatePrompt(context) {
    return this.config.prompt(context);
  }

  processLMOutput(lmResponse, context) {
    return this.config.process(lmResponse, context);
  }

  generateTasks(processedOutput, context) {
    return this.config.generate(processedOutput, context);
  }

  async apply(context) {
    const startTime = Date.now();
    try {
      if (!this.canApply(context)) {
        this.updateMetrics(false, Date.now() - startTime);
        return [];
      }

      const prompt = this.generatePrompt(context);
      const lmResponse = await this.executeLM(prompt);

      if (!lmResponse) {
        this.updateMetrics(false, Date.now() - startTime);
        return [];
      }

      const processedOutput = this.processLMOutput(lmResponse, context);
      const newTasks = this.generateTasks(processedOutput, context);

      this.updateMetrics(true, Date.now() - startTime);
      return newTasks;
    } catch (error) {
      Logger.error(`Error in LMRule ${this.id}:`, { error, context });
      this.updateMetrics(false, Date.now() - startTime);
      return []; // Return empty array on error to prevent cascading failures
    }
  }

  async executeLM(prompt) {
    if (!this.lm) {
      throw new Error(`LM unavailable for rule ${this.id}`);
    }

    const startTime = Date.now();
    const response = await this.lm.process(prompt, this.config.lm_options);
    const time = Date.now() - startTime;

    this._updateLMStats(prompt.length + (response?.length || 0), time);
    return response;
  }

  _updateLMStats(tokens, time) {
    const s = this.lmStats;
    s.calls++;
    s.tokens += tokens;
    s.avgTime = (s.avgTime * (s.calls - 1) + time) / s.calls;
  }

  getLMStats() {
    return { ...this.lmStats };
  }
}