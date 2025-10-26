/**
 * Interface for forget policies in the Bag
 */
class ForgetPolicy {
    /** Select an item to remove based on the policy */
    selectForRemoval(items, itemData, insertionOrder, accessTimes) { }
    
    /** Order items based on the policy */
    orderItems(items, itemData, insertionOrder, accessTimes) { }
}

/** Priority-based forgetting policy */
class PriorityForgetPolicy extends ForgetPolicy {
    selectForRemoval(items, itemData) {
        let lowestPriorityItem = null;
        let lowestPriority = Infinity;

        for (const [item, priority] of itemData.entries()) {
            if (priority < lowestPriority) {
                lowestPriority = priority;
                lowestPriorityItem = item;
            }
        }
        return lowestPriorityItem;
    }
    
    orderItems(items, itemData) {
        return [...itemData.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([item]) => item);
    }
}

/** LRU (Least Recently Used) forgetting policy */
class LRUForgetPolicy extends ForgetPolicy {
    selectForRemoval(items, itemData, insertionOrder, accessTimes) {
        let leastRecentItem = null;
        let leastRecentTime = Infinity;

        for (const [item, accessTime] of accessTimes.entries()) {
            if (accessTime < leastRecentTime) {
                leastRecentTime = accessTime;
                leastRecentItem = item;
            }
        }
        return leastRecentItem;
    }
    
    orderItems(items, itemData, insertionOrder, accessTimes) {
        return [...accessTimes.entries()]
            .sort((a, b) => b[1] - a[1]) // b[1] and a[1] are access times
            .filter(([item]) => items.has(item)) // Only items still in the bag
            .map(([item]) => item);
    }
}

/** FIFO (First In, First Out) forgetting policy */
class FIFOForgetPolicy extends ForgetPolicy {
    selectForRemoval(items, itemData, insertionOrder) {
        // Find the first item in insertion order that's still in the bag
        for (const item of insertionOrder) {
            if (items.has(item)) {
                return item;
            }
        }
        return null;
    }
    
    orderItems(items, itemData, insertionOrder) {
        return insertionOrder.filter(item => items.has(item));
    }
}

/** Random forgetting policy */
class RandomForgetPolicy extends ForgetPolicy {
    selectForRemoval(items) {
        const itemArray = [...items.keys()];
        if (itemArray.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * itemArray.length);
        return itemArray[randomIndex];
    }
    
    orderItems(items) {
        const itemArray = [...items.keys()];
        // Fisher-Yates shuffle
        for (let i = itemArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [itemArray[i], itemArray[j]] = [itemArray[j], itemArray[i]];
        }
        return itemArray;
    }
}

export class Bag {
    constructor(maxSize, forgetPolicy = 'priority') {
        this._items = new Map();
        this._maxSize = maxSize;
        this._insertionOrder = []; // For FIFO policy
        this._accessTimes = new Map(); // For LRU policy
        this.setForgetPolicy(forgetPolicy);
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
                this._removeItemByPolicy();
            }
        }
        this._maxSize = newSize;
    }
    
    setForgetPolicy(policy) {
        const policies = {
            'priority': new PriorityForgetPolicy(),
            'lru': new LRUForgetPolicy(),
            'fifo': new FIFOForgetPolicy(),
            'random': new RandomForgetPolicy()
        };
        
        this._forgetPolicy = policies[policy] || policies['priority'];
        this._forgetPolicyName = policy;
    }
    
    get forgetPolicy() {
        return this._forgetPolicyName;
    }

    add(item) {
        if (this._items.has(item)) return false;

        if (this.size >= this.maxSize) {
            this._removeItemByPolicy();
        }

        const priority = item.budget?.priority || 0;
        this._items.set(item, priority);
        
        // Update insertion order and access times
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
        
        // For peek, we'll return the highest priority item according to the policy
        const orderedItems = this.getItemsInPriorityOrder();
        return orderedItems[0] || null;
    }

    getItemsInPriorityOrder() {
        return this._forgetPolicy.orderItems(this._items, this._items, this._insertionOrder, this._accessTimes);
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

    _removeItemByPolicy() {
        if (this.size > 0) {
            const itemToRemove = this._forgetPolicy.selectForRemoval(
                this._items, 
                this._items, 
                this._insertionOrder, 
                this._accessTimes
            );
            
            if (itemToRemove !== null) {
                this.remove(itemToRemove);
            }
        }
    }

    clear() {
        this._items.clear();
        this._insertionOrder = [];
        this._accessTimes.clear();
    }
}