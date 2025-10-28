class ForgetPolicy {
    selectForRemoval(items, itemData, insertionOrder, accessTimes) { }
    
    orderItems(items, itemData, insertionOrder, accessTimes) { }
}

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
            .sort((a, b) => b[1] - a[1])
            .filter(([item]) => items.has(item))
            .map(([item]) => item);
    }
}

class FIFOForgetPolicy extends ForgetPolicy {
    selectForRemoval(items, itemData, insertionOrder) {
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

class RandomForgetPolicy extends ForgetPolicy {
    selectForRemoval(items) {
        const itemArray = [...items.keys()];
        if (itemArray.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * itemArray.length);
        return itemArray[randomIndex];
    }
    
    orderItems(items) {
        const itemArray = [...items.keys()];
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
        this._insertionOrder = [];
        this._accessTimes = new Map();
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
        
        this._insertionOrder.push(item);
        this._accessTimes.set(item, Date.now());
        
        return true;
    }

    remove(item) {
        const result = this._items.delete(item);
        if (result) {
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

    serialize() {
        return {
            maxSize: this._maxSize,
            forgetPolicyName: this._forgetPolicyName,
            items: Array.from(this._items.entries()).map(([item, priority]) => ({
                item: item.serialize ? item.serialize() : null,
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

    async deserialize(data) {
        try {
            if (!data) {
                throw new Error('Invalid bag data for deserialization');
            }

            this._maxSize = data.maxSize || this._maxSize;
            this._forgetPolicyName = data.forgetPolicyName || DEFAULT_POLICY;
            this.setForgetPolicy(this._forgetPolicyName);

            this.clear();

            if (data.items) {
                for (const { item: itemData, priority } of data.items) {
                    if (itemData) {
                        const placeholderItem = {
                            budget: { priority: priority },
                            serialize: function() { return itemData; },
                            toString: function() { return JSON.stringify(itemData); }
                        };
                        this.add(placeholderItem);
                    }
                }
            }

            if (data.insertionOrder) {
                this._insertionOrder = data.insertionOrder.map((itemData, index) => {
                    return {
                        serialize: function() { return itemData.item; },
                        toString: function() { return JSON.stringify(itemData.item); }
                    };
                });
            }

            if (data.accessTimes) {
                for (const [itemKey, time] of Object.entries(data.accessTimes)) {
                }
            }

            return true;
        } catch (error) {
            console.error('Error during bag deserialization:', error);
            return false;
        }
    }
}