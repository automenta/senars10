/**
 * @file core/lm/LangChainProvider.js
 * @description LangChain provider for connecting to various LLMs, including local Ollama.
 */

import { ChatOllama } from '@langchain/ollama';
import { HumanMessage } from '@langchain/core/messages';

class LangChainProvider {
  /**
   * @param {object} config - Configuration for the LangChain provider.
   * @param {string} [config.modelName='gpt-3.5-turbo'] - The model to use.
   * @param {string} [config.baseURL='http://localhost:11434/v1'] - The base URL for the LLM API.
   * @param {string} [config.apiKey] - The API key (optional for local models).
   * @param {number} [config.temperature=0.7] - The sampling temperature.
   * @param {number} [config.maxTokens=1000] - The maximum number of tokens to generate.
   */
  constructor(config = {}) {
    this.modelName = config.modelName || 'gpt-3.5-turbo';
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'http://localhost:11434/v1'; // Default for Ollama
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 1000;

    // Automatically format URL if needed
    if (this.baseURL.includes(':11434') && !this.baseURL.startsWith('http')) {
      this.baseURL = `http://${this.baseURL}`;
    }

    this.chatModel = new ChatOllama({
      model: this.modelName,
      baseUrl: this.baseURL,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
    });
  }

  /**
   * Generates text using the configured LangChain model.
   * @param {string} prompt - The prompt to send to the model.
   * @param {object} [options={}] - Generation options to override defaults.
   * @returns {Promise<string>} The generated text.
   */
  async generateText(prompt, options = {}) {
    const messages = [new HumanMessage(prompt)];
    const response = await this.chatModel.call(messages, {
      temperature: options.temperature ?? this.temperature,
      max_tokens: options.maxTokens ?? this.maxTokens,
      ...options,
    });
    return response.content;
  }

  /**
   * Generates an embedding for a given text.
   * @param {string} text - The text to embed.
   * @returns {Promise<Array<number>>} A placeholder embedding.
   */
  async generateEmbedding(text) {
    console.warn("Embeddings not fully supported for local Ollama provider via LangChain.");
    // Placeholder to maintain API compatibility.
    // In a real scenario, you might use a separate embedding model.
    return Array(768).fill(0);
  }
}

export default LangChainProvider;