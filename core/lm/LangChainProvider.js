/**
 * @file src/lm/LangChainProvider.js
 * @description LangChain provider for connecting to various LLMs, including local Ollama and OpenAI-compatible APIs.
 */

import {ChatOllama} from '@langchain/ollama';
import {ChatOpenAI} from '@langchain/openai';
import {HumanMessage} from '@langchain/core/messages';

/**
 * LangChainProvider - A provider that uses LangChain.js to connect to various LLMs
 */
export class LangChainProvider {
    /**
     * @param {object} config - Configuration for the LangChain provider.
     * @param {string} [config.provider='ollama'] - The provider type ('ollama' or 'openai')
     * @param {string} [config.modelName='llama2'] - The model to use.
     * @param {string} [config.baseURL='http://localhost:11434'] - The base URL for the LLM API.
     * @param {string} [config.apiKey] - The API key (required for OpenAI, optional for local models).
     * @param {number} [config.temperature=0.7] - The sampling temperature.
     * @param {number} [config.maxTokens=1000] - The maximum number of tokens to generate.
     */
    constructor(config = {}) {
        Object.assign(this, {
            providerType: config.provider || 'ollama',
            modelName: config.modelName || 'llama2',
            apiKey: config.apiKey,
            baseURL: config.baseURL || 'http://localhost:11434',
            temperature: config.temperature ?? 0.7,
            maxTokens: config.maxTokens ?? 1000,
            config
        });

        if (this.baseURL.includes(':11434') && !this.baseURL.startsWith('http')) {
            this.baseURL = `http://${this.baseURL}`;
        }

        this._initChatModel();
    }

    _initChatModel() {
        if (this.providerType === 'ollama') {
            this.chatModel = new ChatOllama({
                model: this.modelName,
                baseUrl: this.baseURL,
                temperature: this.temperature,
                num_predict: this.maxTokens,
                ...this.config.ollamaOptions
            });
        } else if (this.providerType === 'openai') {
            if (!this.apiKey) throw new Error('API key is required for OpenAI provider');
            this.chatModel = new ChatOpenAI({
                modelName: this.modelName,
                openAIApiKey: this.apiKey,
                temperature: this.temperature,
                maxTokens: this.maxTokens,
                ...this.config.openaiOptions
            });
        } else {
            throw new Error(`Unsupported provider type: ${this.providerType}. Use 'ollama' or 'openai'.`);
        }
    }

    /**
     * Generates text using the configured LangChain model.
     * @param {string} prompt - The prompt to send to the model.
     * @param {object} [options={}] - Generation options to override defaults.
     * @returns {Promise<string>} The generated text.
     */
    async generateText(prompt, options = {}) {
        try {
            const messages = [new HumanMessage(prompt)];
            const response = await this.chatModel.call(messages, {
                temperature: options.temperature ?? this.temperature,
                max_tokens: options.maxTokens ?? this.maxTokens,
                ...options,
            });
            return response.content;
        } catch (error) {
            throw new Error(`LangChainProvider generateText failed: ${error.message}`);
        }
    }

    /**
     * Generates an embedding for a given text.
     * @param {string} text - The text to embed.
     * @returns {Promise<Array<number>>} The embedding vector.
     */
    async generateEmbedding(text) {
        // Note: LangChain doesn't provide direct embedding methods in the same way for all providers.
        // This is a simplified implementation that could be extended based on specific needs.
        // For this implementation, we'll throw an error indicating this function is not fully supported
        // or provide a basic fallback implementation using simple word vectors.
        throw new Error("Embeddings not fully implemented for LangChainProvider due to LangChain's varied embedding support across providers");
    }

    /**
     * Alias for generateText to comply with the standard `process` method.
     * @param {string} prompt - The prompt to send to the model.
     * @param {object} [options={}] - Generation options to override defaults.
     * @returns {Promise<string>} The generated text.
     */
    async process(prompt, options = {}) {
        return this.generateText(prompt, options);
    }

    /**
     * Generates a hypothesis based on a set of observations.
     * @param {string[]} observations - A list of observations.
     * @param {object} options - Generation options.
     * @returns {Promise<string>} The generated hypothesis.
     */
    async generateHypothesis(observations, options = {}) {
        const prompt = `Based on these observations:\n${observations.join('\n')}\n\nGenerate a hypothesis about what might be happening:`;
        return this.generateText(prompt, options);
    }

    getModelName() {
        return this.modelName;
    }
}