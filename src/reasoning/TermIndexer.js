/**
 * Term Indexing System for Faster Pattern Matching
 * Implements multiple indexing strategies for efficient term retrieval
 */
export class TermIndexer {
    constructor(options = {}) {
        this.indexes = {
            byHash: new Map(),
            byOperator: new Map(),
            byName: new Map(),
            byComplexity: new Map(),
            byComponentCount: new Map(),
            byAtomicComponent: new Map()
        };

        this.options = {
            maxIndexedTerms: options.maxIndexedTerms || 10000,
            enableComponentIndexing: options.enableComponentIndexing !== false,
            enableComplexityIndexing: options.enableComplexityIndexing !== false
        };

        this.stats = {
            totalIndexed: 0,
            totalQueries: 0,
            cacheHits: 0
        };
    }

    indexTerm(term, metadata = null) {
        if (!term || !term.hash) return false;

        try {
            if (this.stats.totalIndexed >= this.options.maxIndexedTerms) this._evictOldest();

            const timestamp = Date.now();
            const entry = {term, metadata, timestamp};

            // Index by various strategies
            this._indexByAllStrategies(term, entry, metadata);

            this.stats.totalIndexed++;
            return true;
        } catch (error) {
            console.error(`Error indexing term: ${error.message}`);
            return false;
        }
    }

    _indexByAllStrategies(term, entry, metadata) {
        // Index by hash
        this._addToIndex(this.indexes.byHash, term.hash, entry);

        // Index by operator if compound
        if (term.isCompound && term.operator) {
            this._addToIndex(this.indexes.byOperator, term.operator, entry);
        }

        // Index by name
        this._addToIndex(this.indexes.byName, term.name || 'unknown', entry);

        // Index by complexity if enabled
        if (this.options.enableComplexityIndexing) {
            this._addToIndex(this.indexes.byComplexity, term.complexity || 1, entry);
        }

        // Index by component count if compound
        if (term.isCompound) {
            this._addToIndex(this.indexes.byComponentCount, term.components.length, entry);
        }

        // Index by atomic components if enabled
        if (this.options.enableComponentIndexing && term.isCompound) {
            this._indexByComponents(term, metadata);
        }
    }

    _addToIndex(index, key, entry) {
        if (!index.has(key)) index.set(key, []);
        index.get(key).push(entry);
    }

    _indexByComponents(term, metadata) {
        for (const component of term.components) {
            if (component.isAtomic) {
                const entry = {
                    term,
                    metadata,
                    timestamp: Date.now(),
                    componentPath: term.id + '_' + component.id
                };
                this._addToIndex(this.indexes.byAtomicComponent, component.name, entry);
            } else if (component.isCompound) {
                this._indexByComponents(component, metadata);
            }
        }
    }

    _findTermsByIndex(indexKey, key) {
        this.stats.totalQueries++;
        const result = this.indexes[indexKey].get(key) || [];
        if (result.length > 0) this.stats.cacheHits++;

        return result.map(item => item.term);
    }

    findByHash(hash) {
        return this._findTermsByIndex('byHash', hash);
    }

    findByOperator(operator) {
        return this._findTermsByIndex('byOperator', operator);
    }

    findByName(name) {
        return this._findTermsByIndex('byName', name);
    }

    findByComplexity(min, max = min) {
        this.stats.totalQueries++;
        const results = [];
        for (let complexity = min; complexity <= max; complexity++) {
            const items = this.indexes.byComplexity.get(complexity);
            if (items) {
                for (const item of items) {
                    results.push(item.term);
                }
            }
        }
        if (results.length > 0) this.stats.cacheHits++;
        return results;
    }

    findByComponentCount(count) {
        return this._findTermsByIndex('byComponentCount', count);
    }

    findByAtomicComponent(componentName) {
        return this._findTermsByIndex('byAtomicComponent', componentName);
    }

    findMatching(pattern) {
        if (!pattern) {
            this.stats.totalQueries++;
            return [];
        }

        this.stats.totalQueries++;

        try {
            const candidates = new Set();

            if (pattern.isCompound && pattern.operator) {
                this.findByOperator(pattern.operator).forEach(term => candidates.add(term));
            }

            if (pattern.isCompound && pattern.components && pattern.components.length > 0) {
                for (const comp of pattern.components) {
                    if (comp.isAtomic) {
                        this.findByAtomicComponent(comp.name).forEach(term => candidates.add(term));
                    }
                }
            }

            if (pattern.isAtomic) {
                this.findByName(pattern.name).forEach(term => candidates.add(term));
            }

            return Array.from(candidates);
        } catch (error) {
            console.error(`Error during pattern matching: ${error.message}`);
            return [];
        }
    }

    removeTerm(term) {
        if (!term || !term.hash) return false;

        // Remove from various indexes
        this._removeFromIndex(this.indexes.byHash, term.hash, term);

        if (term.isCompound && term.operator) {
            this._removeFromIndex(this.indexes.byOperator, term.operator, term);
        }

        const name = term.name || 'unknown';
        this._removeFromIndex(this.indexes.byName, name, term);

        if (this.options.enableComplexityIndexing) {
            const complexity = term.complexity || 1;
            this._removeFromIndex(this.indexes.byComplexity, complexity, term);
        }

        if (term.isCompound) {
            const compCount = term.components.length;
            this._removeFromIndex(this.indexes.byComponentCount, compCount, term);
        }

        if (this.options.enableComponentIndexing && term.isCompound) {
            this._removeFromComponentIndexes(term);
        }

        this.stats.totalIndexed = Math.max(0, this.stats.totalIndexed - 1);
        return true;
    }

    _removeFromIndex(index, key, termToRemove) {
        const items = index.get(key);
        if (items) {
            const filteredItems = items.filter(item => item.term !== termToRemove);
            if (filteredItems.length !== items.length) {
                if (filteredItems.length === 0) {
                    index.delete(key);
                } else {
                    index.set(key, filteredItems);
                }
                return true;
            }
        }
        return false;
    }

    _removeFromComponentIndexes(term) {
        for (const component of term.components) {
            if (component.isAtomic) {
                this._removeFromIndex(this.indexes.byAtomicComponent, component.name, term);
            } else if (component.isCompound) {
                this._removeFromComponentIndexes(component);
            }
        }
    }

    _evictOldest() {
        let oldestItem = null;
        let oldestIndexKey = null;
        let oldestKey = null;

        for (const [indexKey, index] of Object.entries(this.indexes)) {
            for (const [key, items] of index.entries()) {
                for (const item of items) {
                    if (!oldestItem || item.timestamp < oldestItem.timestamp) {
                        oldestItem = item;
                        oldestIndexKey = indexKey;
                        oldestKey = key;
                    }
                }
            }
        }

        if (oldestItem) {
            this._removeFromIndex(this.indexes[oldestIndexKey], oldestKey, oldestItem.term);
        }
    }

    getStats() {
        const indexSizes = {};
        for (const [name, index] of Object.entries(this.indexes)) {
            indexSizes[name] = index.size;
        }

        const hitRate = this.stats.totalQueries > 0 ?
            this.stats.cacheHits / this.stats.totalQueries : 0;

        return {
            ...this.stats,
            hitRate,
            indexSizes,
            utilization: this.stats.totalIndexed / this.options.maxIndexedTerms
        };
    }

    clear() {
        for (const index of Object.values(this.indexes)) {
            index.clear();
        }
        this.stats = {
            totalIndexed: 0,
            totalQueries: 0,
            cacheHits: 0
        };
    }
}