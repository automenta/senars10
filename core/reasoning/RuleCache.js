/**
 * Memoization utility with capacity limits for AIKR compliance
 */
export class Memoizer {
    constructor(maxSize = 1000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.accessOrder = [];
    }

    memoize(fn) {
        const {cache, maxSize, accessOrder} = this;

        return function memoized(...args) {
            const key = this._createKey(args);

            if (cache.has(key)) {
                this._updateAccessOrder(key, accessOrder);
                return cache.get(key);
            }

            if (cache.size >= maxSize) {
                const lruKey = accessOrder.shift();
                cache.delete(lruKey);
            }

            let result;
            try {
                result = fn.apply(this, args);
            } catch (error) {
                console.error(`Error during memoized function execution: ${error.message}`);
                return null;
            }

            cache.set(key, result);
            accessOrder.push(key);

            return result;
        };
    }

    _createKey(args) {
        try {
            return JSON.stringify(args);
        } catch (e) {
            return args.map(arg => this._stringifyArg(arg)).join('|');
        }
    }

    _stringifyArg(arg) {
        return typeof arg === 'object' ? String(arg) : String(arg);
    }

    _updateAccessOrder(key, accessOrder) {
        const index = accessOrder.indexOf(key);
        if (index !== -1) accessOrder.splice(index, 1);
        accessOrder.push(key);
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