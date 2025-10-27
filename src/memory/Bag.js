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

const DEFAULT_POLICY = 'priority';
const POLICIES = Object.freeze({
    'priority': new PriorityForgetPolicy(),
    'lru': new LRUForgetPolicy(),
    'fifo': new FIFOForgetPolicy(),
    'random': new RandomForgetPolicy()
});

export class Bag {
    constructor(maxSize, forgetPolicy = DEFAULT_POLICY) {
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
        this._forgetPolicy = POLICIES[policy] || POLICIES[DEFAULT_POLICY];
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

    /**
     * Serialize the bag to an object
     * @returns {Object} Serializable bag representation
     */
    serialize() {
        return {
            maxSize: this._maxSize,
            forgetPolicyName: this._forgetPolicyName,
            items: Array.from(this._items.entries()).map(([item, priority]) => ({
                item: item.serialize ? item.serialize() : null, // Save item state if available
                priority: priority
            })),
            insertionOrder: this._insertionOrder.map((item, index) => ({
                item: item.serialize ? item.serialize() : null,
                index: index
            })),
            accessTimes: Object.fromEntries([...this._accessTimes.entries()].map(([item, time]) => [
                JSON.stringify(item.serialize ? item.serialize() : item.toString ? item.toString() : item),
                time
            ])),
            version: '1.0.0'
        };
    }

    /**
     * Deserialize and restore the bag from an object
     * @param {Object} data - Serialized bag data
     * @returns {boolean} True if restoration was successful
     */
    async deserialize(data) {
        try {
            if (!data) {
                throw new Error('Invalid bag data for deserialization');
            }

            this._maxSize = data.maxSize || this._maxSize;
            this._forgetPolicyName = data.forgetPolicyName || DEFAULT_POLICY;
            this.setForgetPolicy(this._forgetPolicyName);

            // Clear current state
            this.clear();

            // Restore items
            if (data.items) {
                for (const { item: itemData, priority } of data.items) {
                    // We'll create placeholder items since the actual task objects need to be recreated separately
                    // In a complete implementation, we'd have deserialization methods for Task objects
                    if (itemData) {
                        // Placeholder - in a complete implementation, we'd reconstruct actual Task objects
                        const placeholderItem = {
                            budget: { priority: priority },
                            serialize: function() { return itemData; },
                            toString: function() { return JSON.stringify(itemData); }
                        };
                        this.add(placeholderItem);
                        // For real reconstruction, we would need the actual Task deserialization
                        // This is a simplified approach for the persistence system
                    }
                }
            }

            // Restore insertion order and access times
            if (data.insertionOrder) {
                this._insertionOrder = data.insertionOrder.map((itemData, index) => {
                    // Placeholder - in a complete implementation, we'd reconstruct actual Task objects
                    return {
                        serialize: function() { return itemData.item; },
                        toString: function() { return JSON.stringify(itemData.item); }
                    };
                });
            }

            if (data.accessTimes) {
                for (const [itemKey, time] of Object.entries(data.accessTimes)) {
                    // For access times, we map back to actual items in the bag
                    // This is more complex and would require a full implementation
                }
            }

            return true;
        } catch (error) {
            console.error('Error during bag deserialization:', error);
            return false;
        }
    }
}