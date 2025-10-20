/**
 * @file src/tools/EmbeddingTool.js
 * @description Tool for generating embeddings with safety features
 */

import { BaseTool } from './BaseTool.js';

/**
 * Tool for generating embeddings from text content
 * Note: This is a simplified implementation; in a real system, you'd use actual embedding models
 */
export class EmbeddingTool extends BaseTool {
    constructor(config = {}) {
        super(config);
        this.name = 'EmbeddingTool';
        
        // Configure safety settings
        this.maxTextLength = config.maxTextLength || 10000; // 10k chars max
        this.maxBatchSize = config.maxBatchSize || 10; // Max items per batch
        this.timeout = config.timeout || 30000; // 30 seconds default
        this.defaultModel = config.defaultModel || 'default-embedding-model';
        
        // For demonstration purposes, we'll simulate embedding generation
        // In a real system, you'd connect to actual embedding services
        this.availableModels = config.availableModels || [
            'default-embedding-model',
            'sentence-transformers/all-MiniLM-L6-v2',
            'openai/text-embedding-ada-002'
        ];
    }

    /**
     * Execute embedding generation tasks
     * @param {object} params - Tool parameters
     * @param {object} context - Execution context
     * @returns {Promise<any>} - Embedding result
     */
    async execute(params, context) {
        const { operation, text, texts, model = this.defaultModel, options = {} } = params;

        if (!operation) {
            throw new Error('Operation is required');
        }

        switch (operation.toLowerCase()) {
            case 'generate':
            case 'embed':
                if (!text && !texts) throw new Error('Either text or texts array is required for embed operation');
                if (text && texts) throw new Error('Provide either text or texts array, not both');
                
                if (text) {
                    return await this._generateEmbedding(text, model, options);
                } else {
                    return await this._generateBatchEmbeddings(texts, model, options);
                }
            case 'compare':
                if (!text || !params.compareWith) throw new Error('text and compareWith are required for compare operation');
                return await this._compareEmbeddings(text, params.compareWith, model, options);
            case 'similarity':
                if (!text || !params.against) throw new Error('text and against are required for similarity operation');
                return await this._calculateSimilarity(text, params.against, model, options);
            default:
                throw new Error(`Unsupported operation: ${operation}. Supported operations: generate, compare, similarity`);
        }
    }

    /**
     * Generate a single embedding
     * @private
     */
    async _generateEmbedding(text, model, options = {}) {
        // Validate the text
        this._validateText(text);
        
        // In a real implementation, you would call an actual embedding API
        // For this example, we'll simulate the embedding process
        const embedding = this._simulateEmbedding(text, model);
        
        return {
            success: true,
            operation: 'embed',
            model,
            textLength: text.length,
            embeddingDimension: embedding.length,
            embedding: embedding,
            metadata: {
                model,
                inputLength: text.length,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Generate embeddings for a batch of texts
     * @private
     */
    async _generateBatchEmbeddings(texts, model, options = {}) {
        if (!Array.isArray(texts)) {
            throw new Error('texts must be an array');
        }
        
        if (texts.length > this.maxBatchSize) {
            throw new Error(`Batch size exceeds maximum limit: ${this.maxBatchSize}`);
        }
        
        for (const text of texts) {
            this._validateText(text);
        }
        
        // Generate embeddings for each text
        const embeddings = texts.map(text => ({
            text: text,
            embedding: this._simulateEmbedding(text, model),
            textLength: text.length
        }));
        
        return {
            success: true,
            operation: 'embed-batch',
            model,
            batchSize: texts.length,
            embeddings: embeddings,
            metadata: {
                model,
                totalInputLength: texts.reduce((sum, text) => sum + text.length, 0),
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Compare two texts using embeddings
     * @private
     */
    async _compareEmbeddings(text1, text2, model, options = {}) {
        this._validateText(text1);
        this._validateText(text2);
        
        const embedding1 = this._simulateEmbedding(text1, model);
        const embedding2 = this._simulateEmbedding(text2, model);
        
        // Calculate cosine similarity
        const similarity = this._cosineSimilarity(embedding1, embedding2);
        
        return {
            success: true,
            operation: 'compare',
            model,
            similarity,
            text1Length: text1.length,
            text2Length: text2.length,
            embeddings: [embedding1, embedding2],
            metadata: {
                model,
                inputLength: text1.length + text2.length,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Calculate similarity between two texts
     * @private
     */
    async _calculateSimilarity(text, against, model, options = {}) {
        this._validateText(text);
        this._validateText(against);
        
        const textEmbedding = this._simulateEmbedding(text, model);
        const againstEmbedding = this._simulateEmbedding(against, model);
        
        // Calculate cosine similarity
        const similarity = this._cosineSimilarity(textEmbedding, againstEmbedding);
        
        return {
            success: true,
            operation: 'similarity',
            model,
            similarity,
            textLength: text.length,
            againstLength: against.length,
            metadata: {
                model,
                inputLength: text.length + against.length,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Get tool description
     */
    getDescription() {
        return 'Tool for generating text embeddings, comparing texts, and calculating semantic similarity. Includes safety limits on text length and batch size.';
    }

    /**
     * Get parameter schema
     */
    getParameterSchema() {
        return {
            type: 'object',
            properties: {
                operation: {
                    type: 'string',
                    enum: ['generate', 'embed', 'compare', 'similarity'],
                    description: 'The embedding operation to perform'
                },
                text: {
                    type: 'string',
                    description: 'Single text input'
                },
                texts: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Multiple text inputs for batch operations'
                },
                model: {
                    type: 'string',
                    default: this.defaultModel,
                    description: 'Embedding model to use'
                },
                compareWith: {
                    type: 'string',
                    description: 'Text to compare with (for compare operation)'
                },
                against: {
                    type: 'string',
                    description: 'Text to compare against (for similarity operation)'
                },
                options: {
                    type: 'object',
                    description: 'Additional options for the operation'
                }
            },
            required: ['operation']
        };
    }

    /**
     * Validate parameters
     */
    validate(params) {
        const errors = [];

        if (!params.operation) {
            errors.push('Operation is required');
        } else if (!['generate', 'embed', 'compare', 'similarity'].includes(params.operation.toLowerCase())) {
            errors.push('Invalid operation. Must be one of: generate, embed, compare, similarity');
        }

        if (params.operation === 'generate' || params.operation === 'embed') {
            if (!params.text && !params.texts) {
                errors.push('Either text or texts array is required');
            }
            if (params.text && params.texts) {
                errors.push('Provide either text or texts array, not both');
            }
            if (params.texts && !Array.isArray(params.texts)) {
                errors.push('texts must be an array');
            }
        }

        if (params.operation === 'compare' && (!params.text || !params.compareWith)) {
            errors.push('text and compareWith are required for compare operation');
        }

        if (params.operation === 'similarity' && (!params.text || !params.against)) {
            errors.push('text and against are required for similarity operation');
        }

        // Validate text lengths if provided
        if (params.text) {
            try {
                this._validateText(params.text);
            } catch (error) {
                errors.push(error.message);
            }
        }

        if (params.texts) {
            if (params.texts.length > this.maxBatchSize) {
                errors.push(`Batch size exceeds maximum limit: ${this.maxBatchSize}`);
            }
            for (let i = 0; i < params.texts.length; i++) {
                try {
                    this._validateText(params.texts[i]);
                } catch (error) {
                    errors.push(`Text at index ${i}: ${error.message}`);
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get tool capabilities
     */
    getCapabilities() {
        return ['text-embedding', 'semantic-similarity', 'text-comparison'];
    }

    /**
     * Get tool category
     */
    getCategory() {
        return 'embedding';
    }

    /**
     * Validate text for safety and size limits
     * @private
     */
    _validateText(text) {
        if (typeof text !== 'string') {
            throw new Error('Text must be a string');
        }

        if (text.length > this.maxTextLength) {
            throw new Error(`Text exceeds maximum length limit: ${this.maxTextLength} characters`);
        }

        // Additional safety checks could be added here
        return true;
    }

    /**
     * Simulate embedding generation (in a real implementation, this would call an API)
     * @private
     */
    _simulateEmbedding(text, model) {
        // This is a very simplified simulation of embedding generation
        // In a real implementation, you would call actual embedding models
        
        // Create a deterministic "embedding" based on the text content
        const embedding = new Array(128).fill(0); // Standard embedding size (simplified)
        
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            const index = i % 128;
            embedding[index] = (embedding[index] + charCode * (i + 1)) % 2 - 1; // Normalize to [-1, 1]
        }
        
        // Apply a simple hashing approach to make embeddings consistent for the same text
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        // Apply the hash to modify the embedding slightly
        for (let i = 0; i < embedding.length; i++) {
            embedding[i] = Math.tanh(embedding[i] + (hash >> i) % 100 / 1000);
        }
        
        return embedding;
    }

    /**
     * Calculate cosine similarity between two vectors
     * @private
     */
    _cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) {
            throw new Error('Vectors must have the same length');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] ** 2;
            normB += vecB[i] ** 2;
        }

        if (normA === 0 || normB === 0) {
            return 0; // If one of the vectors is zero, similarity is 0
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}