import {Term} from '../term/Term.js';

/**
 * Term Indexing System for Faster Pattern Matching
 * Implements multiple indexing strategies for efficient term retrieval
 */
export class TermIndexer {
    constructor(options = {}) {
        // Indexes for different types of queries
        this.indexes = {
            // By term hash for exact matches
            byHash: new Map(),
            
            // By operator for operator-specific queries
            byOperator: new Map(),
            
            // By term name for atomic term queries
            byName: new Map(),
            
            // By complexity for complexity-based queries
            byComplexity: new Map(),
            
            // By component count for structural queries
            byComponentCount: new Map(),
            
            // By atomic components for sub-term queries
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

    /**
     * Index a term
     */
    indexTerm(term, metadata = null) {
        if (!term || !term.hash) {
            return false;
        }

        // Check capacity limit
        if (this.stats.totalIndexed >= this.options.maxIndexedTerms) {
            this._evictOldest();
        }

        // Index by hash
        if (!this.indexes.byHash.has(term.hash)) {
            this.indexes.byHash.set(term.hash, []);
        }
        this.indexes.byHash.get(term.hash).push({ term, metadata, timestamp: Date.now() });

        // Index by operator if compound
        if (term.isCompound && term.operator) {
            if (!this.indexes.byOperator.has(term.operator)) {
                this.indexes.byOperator.set(term.operator, []);
            }
            this.indexes.byOperator.get(term.operator).push({ term, metadata, timestamp: Date.now() });
        }

        // Index by name (for atomic terms) or by root name (for compound terms)
        const name = term.name || 'unknown';
        if (!this.indexes.byName.has(name)) {
            this.indexes.byName.set(name, []);
        }
        this.indexes.byName.get(name).push({ term, metadata, timestamp: Date.now() });

        // Index by complexity if enabled
        if (this.options.enableComplexityIndexing) {
            const complexity = term.complexity || 1;
            if (!this.indexes.byComplexity.has(complexity)) {
                this.indexes.byComplexity.set(complexity, []);
            }
            this.indexes.byComplexity.get(complexity).push({ term, metadata, timestamp: Date.now() });
        }

        // Index by component count if compound
        if (term.isCompound) {
            const compCount = term.components.length;
            if (!this.indexes.byComponentCount.has(compCount)) {
                this.indexes.byComponentCount.set(compCount, []);
            }
            this.indexes.byComponentCount.get(compCount).push({ term, metadata, timestamp: Date.now() });
        }

        // Index by atomic components if enabled
        if (this.options.enableComponentIndexing && term.isCompound) {
            this._indexByComponents(term, metadata);
        }

        this.stats.totalIndexed++;
        return true;
    }

    /**
     * Index term by its atomic components
     */
    _indexByComponents(term, metadata) {
        for (const component of term.components) {
            if (component.isAtomic) {
                const componentName = component.name;
                if (!this.indexes.byAtomicComponent.has(componentName)) {
                    this.indexes.byAtomicComponent.set(componentName, []);
                }
                this.indexes.byAtomicComponent.get(componentName).push({ 
                    term, 
                    metadata, 
                    timestamp: Date.now(),
                    componentPath: this._getComponentPath(term, component)
                });
            } else if (component.isCompound) {
                // Recursively index nested components
                this._indexByComponents(component, metadata);
            }
        }
    }

    /**
     * Get the path to a component in a term (for more precise indexing)
     */
    _getComponentPath(term, targetComponent) {
        // This would return a path like [0, 1] for the component at term.components[0].components[1]
        // For now, we'll just return a simple identifier
        return term.id + '_' + targetComponent.id;
    }

    /**
     * Find terms by exact hash match
     */
    findByHash(hash) {
        this.stats.totalQueries++;
        const result = this.indexes.byHash.get(hash) || [];
        if (result.length > 0) this.stats.cacheHits++;
        return result.map(item => item.term);
    }

    /**
     * Find terms by operator
     */
    findByOperator(operator) {
        this.stats.totalQueries++;
        const result = this.indexes.byOperator.get(operator) || [];
        if (result.length > 0) this.stats.cacheHits++;
        return result.map(item => item.term);
    }

    /**
     * Find terms by name
     */
    findByName(name) {
        this.stats.totalQueries++;
        const result = this.indexes.byName.get(name) || [];
        if (result.length > 0) this.stats.cacheHits++;
        return result.map(item => item.term);
    }

    /**
     * Find terms by complexity range
     */
    findByComplexity(min, max = min) {
        this.stats.totalQueries++;
        const results = [];
        for (let complexity = min; complexity <= max; complexity++) {
            const items = this.indexes.byComplexity.get(complexity);
            if (items) {
                results.push(...items.map(item => item.term));
            }
        }
        if (results.length > 0) this.stats.cacheHits++;
        return results;
    }

    /**
     * Find terms by number of components
     */
    findByComponentCount(count) {
        this.stats.totalQueries++;
        const result = this.indexes.byComponentCount.get(count) || [];
        if (result.length > 0) this.stats.cacheHits++;
        return result.map(item => item.term);
    }

    /**
     * Find terms containing a specific atomic component
     */
    findByAtomicComponent(componentName) {
        this.stats.totalQueries++;
        const result = this.indexes.byAtomicComponent.get(componentName) || [];
        if (result.length > 0) this.stats.cacheHits++;
        return result.map(item => item.term);
    }

    /**
     * Find terms matching a pattern (simple pattern matching)
     */
    findMatching(pattern) {
        this.stats.totalQueries++;
        
        // For simple pattern matching, we can combine different index queries
        const candidates = new Set();

        // If pattern has an operator, get terms with same operator
        if (pattern.isCompound && pattern.operator) {
            this.findByOperator(pattern.operator).forEach(term => candidates.add(term));
        }
        
        // If pattern has specific components, refine search
        if (pattern.isCompound && pattern.components && pattern.components.length > 0) {
            for (const comp of pattern.components) {
                if (comp.isAtomic) {
                    this.findByAtomicComponent(comp.name).forEach(term => candidates.add(term));
                }
            }
        }
        
        // If pattern is atomic, get by name
        if (pattern.isAtomic) {
            this.findByName(pattern.name).forEach(term => candidates.add(term));
        }

        return Array.from(candidates);
    }

    /**
     * Remove a term from indexes
     */
    removeTerm(term) {
        if (!term || !term.hash) return false;

        let removed = false;

        // Remove from hash index
        this._removeFromIndex(this.indexes.byHash, term.hash, term);
        
        // Remove from operator index
        if (term.isCompound && term.operator) {
            this._removeFromIndex(this.indexes.byOperator, term.operator, term);
        }
        
        // Remove from name index
        const name = term.name || 'unknown';
        this._removeFromIndex(this.indexes.byName, name, term);
        
        // Remove from complexity index
        if (this.options.enableComplexityIndexing) {
            const complexity = term.complexity || 1;
            this._removeFromIndex(this.indexes.byComplexity, complexity, term);
        }
        
        // Remove from component count index
        if (term.isCompound) {
            const compCount = term.components.length;
            this._removeFromIndex(this.indexes.byComponentCount, compCount, term);
        }
        
        // Remove from component index
        if (this.options.enableComponentIndexing && term.isCompound) {
            this._removeFromComponentIndexes(term);
        }

        this.stats.totalIndexed = Math.max(0, this.stats.totalIndexed - 1);
        return removed;
    }

    /**
     * Remove term from a specific index
     */
    _removeFromIndex(index, key, termToRemove) {
        const items = index.get(key);
        if (items) {
            const originalLength = items.length;
            const filteredItems = items.filter(item => item.term !== termToRemove);
            if (filteredItems.length < originalLength) {
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

    /**
     * Remove term from component indexes
     */
    _removeFromComponentIndexes(term) {
        // This is a simplified implementation - in a real system, 
        // we'd need to track which components a term contains
        for (const component of term.components) {
            if (component.isAtomic) {
                this._removeFromIndex(this.indexes.byAtomicComponent, component.name, term);
            } else if (component.isCompound) {
                this._removeFromComponentIndexes(component);
            }
        }
    }

    /**
     * Evict the oldest terms when capacity is exceeded
     */
    _evictOldest() {
        // Find the oldest term across all indexes
        let oldestItem = null;
        let oldestIndex = null;
        let oldestKey = null;
        
        // Check each index for the oldest item
        for (const [indexName, index] of Object.entries(this.indexes)) {
            for (const [key, items] of index.entries()) {
                for (const item of items) {
                    if (!oldestItem || item.timestamp < oldestItem.timestamp) {
                        oldestItem = item;
                        oldestIndex = indexName;
                        oldestKey = key;
                    }
                }
            }
        }

        if (oldestItem) {
            // Remove the oldest item from its index
            this._removeFromIndex(this.indexes[oldestIndex], oldestKey, oldestItem.term);
        }
    }

    /**
     * Get index statistics
     */
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

    /**
     * Clear all indexes
     */
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