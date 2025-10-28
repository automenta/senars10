/**
 * Abstract Layer interface for associative links in the SeNARS system.
 * Supports dynamic implementations and per-link data as specified in Phase 1.
 */
export class Layer {
    /**
     * Constructor for the Layer
     * @param {Object} config - Configuration options for the layer
     */
    constructor(config = {}) {
        if (this.constructor === Layer) {
            throw new TypeError('Cannot instantiate abstract class Layer directly');
        }

        this.config = config;
        this.capacity = config.capacity || 1000; // Default capacity for AIKR compliance
        this.size = 0;
    }

    /**
     * Add an associative link to the layer
     * @param {any} source - The source term or concept
     * @param {any} target - The target term or concept
     * @param {Object} data - Additional data associated with the link
     * @returns {boolean} - True if successfully added
     */
    add(source, target, data = {}) {
        throw new Error('Method "add" must be implemented by subclass');
    }

    /**
     * Retrieve links associated with a source
     * @param {any} source - The source term or concept
     * @returns {Array} - Array of associated links
     */
    get(source) {
        throw new Error('Method "get" must be implemented by subclass');
    }

    /**
     * Remove a link from the layer
     * @param {any} source - The source term or concept
     * @param {any} target - The target term or concept
     * @returns {boolean} - True if successfully removed
     */
    remove(source, target) {
        throw new Error('Method "remove" must be implemented by subclass');
    }

    /**
     * Check if a link exists between source and target
     * @param {any} source - The source term or concept
     * @param {any} target - The target term or concept
     * @returns {boolean} - True if link exists
     */
    has(source, target) {
        throw new Error('Method "has" must be implemented by subclass');
    }

    /**
     * Get all sources in the layer
     * @returns {Array} - Array of all sources
     */
    getSources() {
        throw new Error('Method "getSources" must be implemented by subclass');
    }

    /**
     * Update data for an existing link
     * @param {any} source - The source term or concept
     * @param {any} target - The target term or concept
     * @param {Object} data - Updated data for the link
     * @returns {boolean} - True if successfully updated
     */
    update(source, target, data) {
        throw new Error('Method "update" must be implemented by subclass');
    }

    /**
     * Clear all links from the layer
     */
    clear() {
        throw new Error('Method "clear" must be implemented by subclass');
    }

    /**
     * Get statistics about the layer
     * @returns {Object} - Statistics object
     */
    getStats() {
        throw new Error('Method "getStats" must be implemented by subclass');
    }

    /**
     * Cleanup method called when the layer is being destroyed
     */
    destroy() {
        // Default implementation - can be overridden by subclasses
    }
}