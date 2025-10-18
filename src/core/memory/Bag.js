export class Bag {
    constructor(maxSize) {
        this._items = new Map();
        this._maxSize = maxSize;
    }

    get size() {
        return this._items.size;
    }

    get maxSize() {
        return this._maxSize;
    }

    add(item, priority) {
        if (this._items.has(item)) return false;

        if (this.size >= this.maxSize) {
            this._removeLowestPriorityItem();
        }

        this._items.set(item, priority);
        return true;
    }

    remove(item) {
        return this._items.delete(item);
    }

    contains(item) {
        return this._items.has(item);
    }

    peek() {
        if (this.size === 0) return null;

        let highestPriorityItem = null;
        let highestPriority = -Infinity;

        for (const [item, priority] of this._items.entries()) {
            if (priority > highestPriority) {
                highestPriority = priority;
                highestPriorityItem = item;
            }
        }

        return highestPriorityItem;
    }

    getItemsInPriorityOrder() {
        return [...this._items.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([item]) => item);
    }

    getAveragePriority() {
        if (this.size === 0) return 0;

        const priorities = [...this._items.values()];
        const sum = priorities.reduce((acc, priority) => acc + priority, 0);
        return sum / this.size;
    }

    applyDecay(decayRate) {
        const newItems = new Map();
        for (const [item, priority] of this._items.entries()) {
            const newPriority = priority * (1 - decayRate);
            if (typeof item.withPriority === 'function') {
                newItems.set(item.withPriority(newPriority), newPriority);
            } else {
                // If item doesn't support priority update, keep original
                newItems.set(item, newPriority);
            }
        }
        this._items = newItems;
    }

    updatePriority(item, newPriority) {
        if (!this._items.has(item)) return false;

        this._items.set(item, newPriority);
        return true;
    }

    _removeLowestPriorityItem() {
        if (this.size > 0) {
            let lowestPriorityItem = null;
            let lowestPriority = Infinity;
    
            for (const [item, priority] of this._items.entries()) {
                if (priority < lowestPriority) {
                    lowestPriority = priority;
                    lowestPriorityItem = item;
                }
            }
    
            if (lowestPriorityItem !== null) {
                this.remove(lowestPriorityItem);
            }
        }
    }
}