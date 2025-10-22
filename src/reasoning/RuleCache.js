/**
 * Memoization utility with capacity limits for AIKR compliance
 * Optimized for performance with efficient LRU implementation
 */
export class Memoizer {
    constructor(maxSize = 1000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.accessOrder = [];  // Track access order for LRU
    }

    memoize(fn) {
        const self = this;
        
        return function memoized(...args) {
            const key = self._createKey(args);
            
            if (self.cache.has(key)) {
                self._updateAccessOrder(key);
                return self.cache.get(key);
            }
            
            if (self.cache.size >= self.maxSize) {
                const lruKey = self.accessOrder.shift();
                self.cache.delete(lruKey);
            }
            
            let result;
            try {
                result = fn.apply(this, args);
            } catch (error) {
                console.error(`Error during memoized function execution: ${error.message}`);
                return null;
            }
            
            self.cache.set(key, result);
            self.accessOrder.push(key);

            return result;
        };
    }

    _createKey(args) {
        try {
            return JSON.stringify(args);
        } catch (e) {
            return args.map(arg => typeof arg === 'object' ? String(arg) : String(arg)).join('|');
        }
    }

    _updateAccessOrder(key) {
        const index = this.accessOrder.indexOf(key);
        if (index !== -1) this.accessOrder.splice(index, 1);
        this.accessOrder.push(key);
    }

    clear() {
        this.cache.clear();
        this.accessOrder = [];
    }

    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            utilization: this.cache.size / this.maxSize
        };
    }
}