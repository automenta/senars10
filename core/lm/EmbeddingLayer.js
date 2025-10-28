/**
 * EmbeddingLayer - A module for semantic reasoning and language model interaction
 * Provides vector embeddings for terms and concepts to enable semantic similarity calculations
 */
export class EmbeddingLayer {
    constructor(config = {}) {
        this.config = {
            enabled: true,
            model: config.model || 'text-embedding-ada-002',
            maxBatchSize: config.maxBatchSize || 10,
            cacheSize: config.cacheSize || 1000,
            ...config
        };
        
        this.embeddingCache = new Map();
        this.enabled = this.config.enabled;
    }

    /**
     * Get embeddings for a term or concept
     * @param {string|Term} input - The input to get embeddings for
     * @returns {Promise<Array<number>>} - The embedding vector
     */
    async getEmbedding(input) {
        if (!this.enabled) {
            throw new Error('EmbeddingLayer is not enabled');
        }

        const inputStr = typeof input === 'string' ? input : input.toString();
        
        // Check cache first
        if (this.embeddingCache.has(inputStr)) {
            return this.embeddingCache.get(inputStr);
        }

        // Generate embedding (this would typically call an actual embedding API)
        const embedding = await this._generateEmbedding(inputStr);
        
        // Cache the result (with size limit)
        if (this.embeddingCache.size >= this.config.cacheSize) {
            const firstKey = this.embeddingCache.keys().next().value;
            this.embeddingCache.delete(firstKey);
        }
        this.embeddingCache.set(inputStr, embedding);

        return embedding;
    }

    /**
     * Calculate similarity between two embeddings
     * @param {Array<number>} embedding1 - First embedding vector
     * @param {Array<number>} embedding2 - Second embedding vector
     * @returns {number} - Similarity score (0 to 1)
     */
    calculateSimilarity(embedding1, embedding2) {
        if (!Array.isArray(embedding1) || !Array.isArray(embedding2) || 
            embedding1.length !== embedding2.length) {
            return 0;
        }

        // Calculate cosine similarity
        let dotProduct = 0;
        let magnitude1 = 0;
        let magnitude2 = 0;

        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            magnitude1 += embedding1[i] * embedding1[i];
            magnitude2 += embedding2[i] * embedding2[i];
        }

        magnitude1 = Math.sqrt(magnitude1);
        magnitude2 = Math.sqrt(magnitude2);

        if (magnitude1 === 0 || magnitude2 === 0) {
            return 0;
        }

        return dotProduct / (magnitude1 * magnitude2);
    }

    /**
     * Find terms/concepts similar to the given input
     * @param {string|Term} input - Input to find similarities for
     * @param {Array} candidates - Array of candidate terms/concepts
     * @param {number} threshold - Minimum similarity threshold
     * @returns {Promise<Array>} - Array of similar items with similarity scores
     */
    async findSimilar(input, candidates, threshold = 0.7) {
        if (!this.enabled) {
            return [];
        }

        const inputEmbedding = await this.getEmbedding(input);
        const results = [];

        for (const candidate of candidates) {
            const candidateEmbedding = await this.getEmbedding(candidate);
            const similarity = this.calculateSimilarity(inputEmbedding, candidateEmbedding);
            
            if (similarity >= threshold) {
                results.push({
                    item: candidate,
                    similarity
                });
            }
        }

        // Sort by similarity descending
        return results.sort((a, b) => b.similarity - a.similarity);
    }

    /**
     * Internal method to generate embedding
     * In a real implementation, this would call an actual embedding service
     * @private
     */
    async _generateEmbedding(text) {
        // This is a placeholder implementation
        // In a real system, this would call an actual embedding API
        // For now, we'll create a simple deterministic hash-based "embedding"
        const hash = this._simpleHash(text);
        const embedding = new Array(1536).fill(0); // Typical size for OpenAI embeddings
        
        // Create a simple deterministic vector based on the hash
        for (let i = 0; i < embedding.length; i++) {
            embedding[i] = Math.sin(hash + i) * 0.5 + 0.5;
        }
        
        return embedding;
    }

    /**
     * Simple hash function for deterministic embedding generation
     * @private
     */
    _simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Enable the embedding layer
     */
    enable() {
        this.enabled = true;
    }

    /**
     * Disable the embedding layer
     */
    disable() {
        this.enabled = false;
    }

    /**
     * Clear the embedding cache
     */
    clearCache() {
        this.embeddingCache.clear();
    }

    /**
     * Get statistics about the layer
     */
    getStats() {
        return {
            enabled: this.enabled,
            cacheSize: this.embeddingCache.size,
            config: this.config
        };
    }
}