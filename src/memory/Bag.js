export class Bag {
    constructor(maxSize, forgetPolicy = 'priority') {
        this._items = new Map();
        this._maxSize = maxSize;
        this._forgetPolicy = forgetPolicy; // 'priority', 'random', 'fifo', 'lru'
        this._insertionOrder = []; // For FIFO policy
        this._accessTimes = new Map(); // For LRU policy
    }

    get size() {
        return this._items.size;
    }

    get maxSize() {
        return this._maxSize;
    }
    
    set maxSize(newSize) {
        if (newSize < this._maxSize) {
            // If reducing size, we need to remove items
            while (this.size > newSize) {
                this._removeLowestPriorityItem();
            }
        }
        this._maxSize = newSize;
    }
    
    get forgetPolicy() {
        return this._forgetPolicy;
    }

    add(item) {
        if (this._items.has(item)) return false;

        if (this.size >= this.maxSize) {
            this._removeLowestPriorityItem();
        }

        const priority = item.budget?.priority || 0;
        this._items.set(item, priority);
        
        // Update insertion order and access times for other policies
        this._insertionOrder.push(item);
        this._accessTimes.set(item, Date.now());
        
        return true;
    }

    remove(item) {
        const result = this._items.delete(item);
        if (result) {
            // Remove from insertion order and access times as well
            this._insertionOrder = this._insertionOrder.filter(i => i !== item);
            this._accessTimes.delete(item);
        }
        return result;
    }

    contains(item) {
        return this._items.has(item);
    }

    peek() {
        if (this.size === 0) return null;

        switch (this._forgetPolicy) {
            case 'priority':
                return this._peekByPriority();
            case 'lru':
                return this._peekByLRU();
            case 'fifo':
                return this._peekByFIFO();
            case 'random':
                return this._peekByRandom();
            default:
                return this._peekByPriority();
        }
    }
    
    _peekByPriority() {
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
    
    _peekByLRU() {
        // For LRU, we return the most recently accessed item (highest access time)
        let mostRecentItem = null;
        let mostRecentTime = -Infinity;

        for (const [item, accessTime] of this._accessTimes.entries()) {
            if (accessTime > mostRecentTime) {
                mostRecentTime = accessTime;
                mostRecentItem = item;
            }
        }

        return mostRecentItem;
    }
    
    _peekByFIFO() {
        // Return the first inserted item that's still in the bag
        for (const item of this._insertionOrder) {
            if (this._items.has(item)) {
                return item;
            }
        }
        return null;
    }
    
    _peekByRandom() {
        const items = [...this._items.keys()];
        if (items.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * items.length);
        return items[randomIndex];
    }

    getItemsInPriorityOrder() {
        switch (this._forgetPolicy) {
            case 'priority':
                return [...this._items.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([item]) => item);
            case 'lru':
                // Sort by access time (most recent first)
                return [...this._accessTimes.entries()]
                    .sort((a, b) => b[1] - a[1]) // b[1] and a[1] are access times
                    .filter(([item]) => this._items.has(item)) // Only items still in the bag
                    .map(([item]) => item);
            case 'fifo':
                // Return in insertion order (oldest first) but only items still in the bag
                return this._insertionOrder.filter(item => this._items.has(item));
            case 'random':
                // Shuffle the items
                const items = [...this._items.keys()];
                for (let i = items.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [items[i], items[j]] = [items[j], items[i]];
                }
                return items;
            default:
                return [...this._items.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([item]) => item);
        }
    }

    getAveragePriority() {
        if (this.size === 0) return 0;

        const priorities = [...this._items.values()];
        const sum = priorities.reduce((acc, priority) => acc + priority, 0);
        return sum / this.size;
    }

    getPriority(item) {
        return this._items.get(item);
    }

    applyDecay(decayRate) {
        for (const [item, priority] of this._items.entries()) {
            this._items.set(item, priority * (1 - decayRate));
        }
    }

    _removeLowestPriorityItem() {
        if (this.size > 0) {
            let itemToRemove = null;

            switch (this._forgetPolicy) {
                case 'priority':
                    itemToRemove = this._getLowestPriorityItem();
                    break;
                case 'random':
                    itemToRemove = this._getRandomItem();
                    break;
                case 'fifo':
                    itemToRemove = this._getFIFOItem();
                    break;
                case 'lru':
                    itemToRemove = this._getLRUItem();
                    break;
                default:
                    itemToRemove = this._getLowestPriorityItem();
                    break;
            }

            if (itemToRemove !== null) {
                this.remove(itemToRemove);
            }
        }
    }
    
    _getLowestPriorityItem() {
        let lowestPriorityItem = null;
        let lowestPriority = Infinity;

        for (const [item, priority] of this._items.entries()) {
            if (priority < lowestPriority) {
                lowestPriority = priority;
                lowestPriorityItem = item;
            }
        }
        
        return lowestPriorityItem;
    }
    
    _getRandomItem() {
        const items = [...this._items.keys()];
        if (items.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * items.length);
        return items[randomIndex];
    }
    
    _getFIFOItem() {
        // Find the first item in insertion order that's still in the bag
        for (const item of this._insertionOrder) {
            if (this._items.has(item)) {
                return item;
            }
        }
        return null;
    }
    
    _getLRUItem() {
        // For LRU forgetting, we want to remove the LEAST recently accessed item
        let leastRecentItem = null;
        let leastRecentTime = Infinity;

        for (const [item, accessTime] of this._accessTimes.entries()) {
            if (accessTime < leastRecentTime) {
                leastRecentTime = accessTime;
                leastRecentItem = item;
            }
        }

        return leastRecentItem;
    }

    clear() {
        this._items.clear();
    }
}