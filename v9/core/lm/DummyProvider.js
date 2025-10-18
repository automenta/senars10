/**
 * @file core/lm/DummyProvider.js
 * @description A dummy LM provider for testing and debugging purposes.
 */

import { Logger } from '../base/utilities.js';

class DummyProvider {
  constructor(config = {}) {
    this.modelName = config.modelName || 'dummy-model';
    this.responses = config.responses || {};
    Logger.info('DummyProvider initialized', { model: this.modelName });
  }

  /**
   * Generates a predictable text response based on the prompt.
   * If a specific response is configured for the prompt, it returns that.
   * Otherwise, it returns a default response.
   * @param {string} prompt - The input prompt.
   * @param {object} options - Generation options (ignored).
   * @returns {Promise<string>} The dummy response.
   */
  async generateText(prompt, options = {}) {
    Logger.info('DummyProvider.generateText called', { prompt });

    // Check for a configured response for this specific prompt
    if (this.responses[prompt]) {
      return this.responses[prompt];
    }

    // Default response for goal decomposition
    if (prompt.includes('Decompose the following high-level goal')) {
      return `
1. Sub-goal one from dummy provider.
2. Sub-goal two from dummy provider.
3. Sub-goal three from dummy provider.
      `.trim();
    }

    // Default response for clarification
    if (prompt.includes('ambiguous or lacks detail')) {
        return `
  1. What is the primary objective?
  2. What are the key constraints?
        `.trim();
      }

    // Generic default response
    return `This is a dummy response for the prompt: "${prompt.substring(0, 50)}..."`;
  }

  /**
   * Alias for generateText to comply with the process interface.
   */
  async process(prompt, options = {}) {
    return this.generateText(prompt, options);
  }

  /**
   * Generates a placeholder embedding.
   * @param {string} text - The text to embed (ignored).
   * @returns {Promise<number[]>} A placeholder embedding array.
   */
  async generateEmbedding(text) {
    Logger.info('DummyProvider.generateEmbedding called');
    return Array(1536).fill(0.1);
  }

  /**
   * Generates a placeholder hypothesis.
   * @param {string[]} observations - The observations (ignored).
   * @param {object} options - Generation options (ignored).
   * @returns {Promise<string>} A placeholder hypothesis.
   */
  async generateHypothesis(observations, options = {}) {
    Logger.info('DummyProvider.generateHypothesis called');
    return 'This is a dummy hypothesis based on the provided observations.';
  }
}

export default DummyProvider;