/**
 * @file src/memory/Bag.js
 * @description A priority-based, size-limited collection for AIKR-compliant memory management.
 */
export class Bag {
    constructor(capacity) {
        this.maxSize = capacity;
        this.items = new Map();
    }

    add(item, priority) {
        if (this.has(item)) {
            this.items.set(item, priority);
            return false; // Item already existed
        }
        if (this.items.size >= this.maxSize) {
            this._evict();
        }
        this.items.set(item, priority);
        return true; // Item was added
    }

    get(item) {
        return this.items.get(item);
    }

    has(item) {
        return this.items.has(item);
    }

    delete(item) {
        return this.items.delete(item);
    }

    remove(item) {
        return this.delete(item);
    }

    contains(item) {
        return this.has(item);
    }

    peek() {
        return this.getItemsInPriorityOrder()[0] || null;
    }

    getItemsInPriorityOrder() {
        return [...this.items.entries()].sort((a, b) => b[1] - a[1]).map(entry => entry[0]);
    }

    getPriority(item) {
        return this.items.get(item);
    }

    getAveragePriority() {
        if (this.items.size === 0) {
            return 0;
        }
        const totalPriority = [...this.items.values()].reduce((sum, priority) => sum + priority, 0);
        return totalPriority / this.items.size;
    }

    applyDecay(decayRate) {
        for (const [item, priority] of this.items.entries()) {
            this.items.set(item, priority * (1 - decayRate));
        }
    }

    clear() {
        this.items.clear();
    }

    get size() {
        return this.items.size;
    }

    _evict() {
        let lowestPriority = Infinity;
        let itemToEvict = null;

        for (const [item, priority] of this.items.entries()) {
            if (priority < lowestPriority) {
                lowestPriority = priority;
                itemToEvict = item;
            }
        }

        if (itemToEvict) {
            this.items.delete(itemToEvict);
        }
    }
}
