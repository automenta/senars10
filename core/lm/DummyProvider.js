/**
 * Dummy provider for testing LM functionality
 */
export class DummyProvider {
    constructor(options = {}) {
        this.id = options.id || 'dummy';
        this.latency = options.latency || 0; // Simulated latency in ms
        this.responseTemplate = options.responseTemplate || 'Response to: {prompt}';
    }

    async generateText(prompt, options = {}) {
        // Simulate some processing time
        if (this.latency > 0) {
            await new Promise(resolve => setTimeout(resolve, this.latency));
        }

        // Return a simple response based on the prompt
        return this.responseTemplate.replace('{prompt}', prompt);
    }

    async generateEmbedding(text) {
        // Simulate embedding generation (return a simple array for testing)
        if (this.latency > 0) {
            await new Promise(resolve => setTimeout(resolve, this.latency));
        }

        // Create a simple embedding based on text content
        const embedding = [];
        for (let i = 0; i < 16; i++) { // 16-dimensions for demo
            embedding.push(Math.sin(text.charCodeAt(i % text.length) + i));
        }
        return embedding;
    }

    async process(prompt, options = {}) {
        return this.generateText(prompt, options);
    }
}