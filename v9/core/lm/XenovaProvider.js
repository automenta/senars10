/**
 * @file core/lm/XenovaProvider.js
 * @description Xenova/Transformers.js-based LM provider that runs locally in the browser or Node.js.
 */

import { Logger } from '../base/utilities.js';

class XenovaProvider {
  constructor(config = {}) {
    this.modelName = config.modelName || 'Xenova/distilgpt2';
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 100;
    this.device = config.device || 'webgpu'; // 'webgpu' is a good default for modern browsers

    this.generator = null;
    this.initialized = false;
    Logger.info('XenovaProvider created', { model: this.modelName, device: this.device });
  }

  /**
   * Initializes the text generation pipeline from Transformers.js.
   * This is called on the first generation request to avoid up-front loading.
   */
  async _ensureInitialized() {
    if (this.initialized) return;

    try {
      const { pipeline } = await import('@xenova/transformers');
      this.generator = await pipeline('text-generation', this.modelName, {
        device: this.device,
      });
      this.initialized = true;
      Logger.info('XenovaProvider pipeline initialized successfully.');
    } catch (error) {
      Logger.error('Failed to initialize XenovaProvider pipeline', { error });
      throw new Error('XenovaProvider initialization failed.');
    }
  }

  /**
   * Generates text using the initialized pipeline.
   * @param {string} prompt - The input prompt.
   * @param {object} options - Generation options.
   * @returns {Promise<string>} The generated text.
   */
  async generateText(prompt, options = {}) {
    await this._ensureInitialized();
    if (!this.generator) {
      throw new Error('Generator not available.');
    }

    const temperature = options.temperature ?? this.temperature;
    const maxTokens = options.maxTokens ?? this.maxTokens;

    const result = await this.generator(prompt, {
      max_new_tokens: maxTokens,
      temperature: temperature,
      do_sample: temperature > 0,
      pad_token_id: 50256, // Standard padding token ID for GPT-2 models
    });

    return result[0].generated_text;
  }

  /**
   * Alias for generateText to comply with the standard `process` method.
   */
  async process(prompt, options = {}) {
    return this.generateText(prompt, options);
  }

  /**
   * Generates embeddings using a feature-extraction pipeline.
   * @param {string} text - The text to embed.
   * @returns {Promise<number[]>} The embedding vector.
   */
  async generateEmbedding(text) {
    await this._ensureInitialized();

    try {
      const { pipeline: embeddingPipeline } = await import('@xenova/transformers');
      const embedder = await embeddingPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        device: this.device,
      });

      const output = await embedder(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    } catch (error) {
      Logger.error('Failed to generate embedding with XenovaProvider', { error });
      throw new Error('XenovaProvider embedding generation failed.');
    }
  }

  /**
   * Generates a hypothesis based on a set of observations.
   * @param {string[]} observations - A list of observations.
   * @param {object} options - Generation options.
   * @returns {Promise<string>} The generated hypothesis.
   */
  async generateHypothesis(observations, options = {}) {
    const observationsText = observations.join('\n');
    const prompt = `Based on these observations:\n${observationsText}\n\nGenerate a hypothesis about what might be happening:`;
    return this.generateText(prompt, options);
  }
}

export default XenovaProvider;