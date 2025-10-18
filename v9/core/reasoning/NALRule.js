import { Rule } from './Rule.js';
import { Logger } from '../base/utilities.js';

/**
 * A NAL-based reasoning rule that performs logical inference.
 */
export class NALRule extends Rule {
  constructor(id, options = {}) {
    super(id, { ...options, type: 'nal' });
    this.truthFn = options.truthFn;
    this.inferenceFn = options.inferenceFn;
  }

  applyTruth(...args) {
    return this.truthFn ? this.truthFn(...args) : { frequency: 0.9, confidence: 0.8 };
  }

  async performInference(context) {
    if (!this.inferenceFn) {
      throw new Error(`No inference function for rule ${this.id}`);
    }
    return this.inferenceFn(context);
  }

  async apply(context) {
    const startTime = Date.now();
    try {
      const result = await this.performInference(context);
      this.updateMetrics(true, Date.now() - startTime);
      return result;
    } catch (error) {
      Logger.error(`Error in NALRule ${this.id}:`, { error, context });
      this.updateMetrics(false, Date.now() - startTime);
      throw error;
    }
  }
}