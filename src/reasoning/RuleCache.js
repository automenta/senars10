/**
 * Memoization utility with capacity limits for AIKR compliance
 */
export class Memoizer {
    constructor(maxSize = 1000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.accessOrder = [];  // Track access order for LRU
    }

    /**
     * Memoize a function call with capacity limits
     */
    memoize(fn) {
        const self = this;
        
        return function memoized(...args) {
            // Create a key from the arguments
            const key = self._createKey(args);
            
            // Check if result is already cached
            if (self.cache.has(key)) {
                // Update access order for LRU
                self._updateAccessOrder(key);
                return self.cache.get(key);
            }
            
            // If cache is at max capacity, remove least recently used item
            if (self.cache.size >= self.maxSize) {
                const lruKey = self.accessOrder.shift(); // Remove first (oldest) accessed
                self.cache.delete(lruKey);
            }
            
            // If not cached, call the function and cache the result
            let result;
            try {
                result = fn.apply(this, args);
            } catch (error) {
                console.error(`Error during memoized function execution: ${error.message}`);
                return null; // Return null on error instead of caching errors
            }
            
            self.cache.set(key, result);
            self.accessOrder.push(key); // Add to end (most recently used)

            return result;
        };
    }

    /**
     * Create a string key from arguments
     */
    _createKey(args) {
        // For simple types, use JSON serialization
        // For complex objects, this might need customization
        try {
            return JSON.stringify(args);
        } catch (e) {
            // If JSON serialization fails, create a simple string representation
            return args.map(arg => 
                typeof arg === 'object' ? String(arg) : String(arg)
            ).join('|');
        }
    }

    /**
     * Update the access order when a key is accessed
     */
    _updateAccessOrder(key) {
        const index = this.accessOrder.indexOf(key);
        if (index !== -1) {
            // Remove from current position
            this.accessOrder.splice(index, 1);
        }
        // Add to end (most recently used)
        this.accessOrder.push(key);
    }

    /**
     * Clear the memoization cache
     */
    clear() {
        this.cache.clear();
        this.accessOrder = [];
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            utilization: this.cache.size / this.maxSize
        };
    }
}