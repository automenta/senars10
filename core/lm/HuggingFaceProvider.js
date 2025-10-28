/**
 * @file src/lm/HuggingFaceProvider.js
 * @description HuggingFace Transformers provider that runs models locally using transformers.js
 */

/**
 * HuggingFaceProvider - A provider that uses HuggingFace Transformers to run models locally
 */
export class HuggingFaceProvider {
    constructor(config = {}) {
        this.modelName = config.modelName || 'sshleifer/distilbart-cnn-12-6'; // Default model
        this.temperature = config.temperature ?? 0.7;
        this.maxTokens = config.maxTokens ?? 100;
        this.device = config.device || 'cpu'; // Default to CPU for broader compatibility
        this.config = config;

        // Initialize model-specific configurations for MobileBERT and SmolLM-135M
        if (this.modelName.includes('MobileBERT')) {
            // MobileBERT specific configuration
            this.modelType = 'mobilebert';
        } else if (this.modelName.includes('SmolLM')) {
            // SmolLM-135M specific configuration
            this.modelType = 'smollm';
        } else {
            this.modelType = 'generic';
        }

        // Initialize the pipeline as null - it will be loaded on first use
        this.pipeline = null;
        this.tokenizer = null;
        this.model = null;
        this.initialized = false;
    }

    /**
     * Initializes the model pipeline - this is called on first use to avoid slow startup
     * @private
     */
    async _initializeModel() {
        if (this.initialized) return;

        try {
            // Dynamically import transformers.js
            const {pipeline, AutoTokenizer, AutoModelForCausalLM} = await import('@xenova/transformers');

            // Initialize appropriate pipeline based on model type
            if (this.modelType === 'smollm') {
                // For text generation tasks (like SmolLM-135M)
                this.pipeline = await pipeline('text-generation', this.modelName, {
                    device: this.device,
                });
            } else if (this.modelType === 'mobilebert') {
                // For MobileBERT which might be better for specific tasks like QA
                this.tokenizer = await AutoTokenizer.from_pretrained(this.modelName);
                this.model = await AutoModelForCausalLM.from_pretrained(this.modelName);
            } else {
                // Generic initialization
                this.pipeline = await pipeline('text-generation', this.modelName, {
                    device: this.device,
                });
            }

            this.initialized = true;
        } catch (error) {
            throw new Error(`HuggingFaceProvider initialization failed: ${error.message}`);
        }
    }

    /**
     * Generates text using the initialized model.
     * @param {string} prompt - The input prompt.
     * @param {object} options - Generation options.
     * @returns {Promise<string>} The generated text.
     */
    async generateText(prompt, options = {}) {
        await this._initializeModel();

        if (!this.pipeline) {
            throw new Error('Model pipeline not available after initialization.');
        }

        const temperature = options.temperature ?? this.temperature;
        const maxTokens = options.maxTokens ?? this.maxTokens;

        try {
            const response = await this.pipeline(prompt, {
                max_new_tokens: maxTokens,
                temperature: temperature,
                do_sample: temperature > 0,
                pad_token_id: 50256, // Standard padding token ID for many models
                ...options
            });

            // Response format varies by model, extract the generated text
            if (Array.isArray(response) && response.length > 0) {
                // Handle the most common output format
                return response[0].generated_text || response[0].text || response[0];
            } else if (typeof response === 'string') {
                return response;
            } else if (response?.generated_text) {
                return response.generated_text;
            } else {
                // Fallback: return the entire response as string if we can't determine format
                return JSON.stringify(response);
            }
        } catch (error) {
            throw new Error(`HuggingFaceProvider generateText failed: ${error.message}`);
        }
    }

    /**
     * Generates embeddings using the model.
     * @param {string} text - The text to embed.
     * @returns {Promise<number[]>} The embedding vector.
     */
    async generateEmbedding(text) {
        await this._initializeModel();

        try {
            // Use feature extraction pipeline for embeddings
            const {pipeline} = await import('@xenova/transformers');
            const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                device: this.device,
            });

            const output = await extractor(text, {pooling: 'mean', normalize: true});

            // Convert tensor to array
            return Array.from(output.data || output);
        } catch (error) {
            throw new Error(`HuggingFaceProvider generateEmbedding failed: ${error.message}`);
        }
    }

    /**
     * Alias for generateText to comply with the standard `process` method.
     * @param {string} prompt - The input prompt.
     * @param {object} [options={}] - Generation options.
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
        const observationsText = observations.join('\n');
        const prompt = `Based on these observations:\n${observationsText}\n\nGenerate a hypothesis about what might be happening:`;
        return this.generateText(prompt, options);
    }

    /**
     * Gets the model name of this provider
     * @returns {string} The model name
     */
    getModelName() {
        return this.modelName;
    }
}