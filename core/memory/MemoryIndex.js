export class MemoryIndex {
    constructor() {
        this._indexes = {
            // Legacy indexes
            inheritance: new Map(), // Map<predicate, Set<subject>>
            implication: new Map(), // Map<premise, Set<conclusion>>
            similarity: new Map(),  // Map<term, Set<related>>
            compound: new Map(),    // Map<operator, Set<terms>>
            term: new Map(),        // Map<termHash, concept>

            // Enhanced indexes for different term types
            atomic: new Map(),      // Map<termName, Set<concepts>> - indexing atomic terms
            compoundByOp: new Map(), // Map<operator, Set<concepts>> - indexing compound terms by operator
            component: new Map(),   // Map<componentTerm, Set<compoundTerms>> - indexing by components
            complexity: new Map(),  // Map<complexityLevel, Set<concepts>> - indexing by complexity
            category: new Map(),    // Map<category, Set<concepts>> - indexing by term category
            temporal: new Map(),    // Map<timeRange, Set<concepts>> - temporal indexing
            activation: new Map()   // Map<activationRange, Set<concepts>> - activation-based indexing
        };

        // Configuration for different indexing strategies
        this._config = {
            complexityLevels: [1, 3, 5, 10, 20], // Different complexity thresholds
            activationBuckets: [0.1, 0.3, 0.5, 0.7, 0.9], // Activation level ranges
            maxTemporalRange: 3600000 // 1 hour in milliseconds
        };

        this._totalConcepts = 0;
    }

    _addToIndex(index, key, value) {
        if (!this._indexes[index].has(key)) {
            this._indexes[index].set(key, new Set());
        }
        this._indexes[index].get(key).add(value);
    }

    _removeFromIndex(index, key, value) {
        if (this._indexes[index].has(key)) {
            const set = this._indexes[index].get(key);
            set.delete(value);
            if (set.size === 0) {
                this._indexes[index].delete(key);
            }
        }
    }

    /**
     * Add to multiple indexes at once
     */
    _addToMultipleIndexes(indexEntries) {
        for (const {index, key, value} of indexEntries) {
            this._addToIndex(index, key, value);
        }
    }

    /**
     * Remove from multiple indexes at once
     */
    _removeFromMultipleIndexes(indexEntries) {
        for (const {index, key, value} of indexEntries) {
            this._removeFromIndex(index, key, value);
        }
    }

    addConcept(concept) {
        const {term} = concept;
        const termId = term.id;

        this._totalConcepts++;
        this._addToIndex('term', termId, concept);

        // Add to type-specific indexes
        if (term.isAtomic) {
            this._addToIndex('atomic', term.name, concept);
        } else {
            this._indexCompoundTerm(term, concept);
            this._addToIndex('compoundByOp', term.operator, concept);
        }

        // Add to complexity-based index
        this._indexByComplexity(term, concept);

        // Add to category-based index
        this._indexByCategory(term, concept);

        // Add to activation-based index
        this._indexByActivation(concept);

        // Add to temporal index
        this._indexByTemporal(concept);
    }

    removeConcept(concept) {
        const {term} = concept;
        const termId = term.id;

        if (this._indexes.term.has(termId)) {
            this._removeFromIndex('term', termId, concept);
            this._totalConcepts--;
        }

        // Remove from type-specific indexes
        if (term.isAtomic) {
            this._removeFromIndex('atomic', term.name, concept);
        } else {
            this._removeCompoundTermIndex(term, concept);
            this._removeFromIndex('compoundByOp', term.operator, concept);
        }

        // Remove from complexity-based index
        this._removeFromComplexityIndex(term, concept);

        // Remove from category-based index
        this._removeFromCategoryIndex(term, concept);

        // Remove from activation-based index
        this._removeFromActivationIndex(concept);

        // Remove from temporal index
        this._removeFromTemporalIndex(concept);
    }

    _indexCompoundTerm(term, concept) {
        this._addToIndex('compound', term.operator, term);

        // Index by all components (for faster subterm matching)
        if (term.components) {
            for (const comp of term.components) {
                this._addToIndex('component', comp, concept);

                // Also index nested components
                if (comp.isCompound) {
                    this._indexCompoundTerm(comp, concept);
                }
            }
        }

        switch (term.operator) {
            case '-->':
                this._indexInheritance(term, concept);
                break;
            case '==>':
                this._indexImplication(term, concept);
                break;
            case '<->':
                this._indexSimilarity(term, concept);
                break;
        }
    }

    /**
     * Index concept by complexity level
     */
    _indexByComplexity(term, concept) {
        // Get complexity of the term (if available)
        const complexity = this._getTermComplexity(term);
        const complexityLevel = this._getComplexityLevel(complexity);

        this._addToIndex('complexity', complexityLevel, concept);
    }

    /**
     * Remove from complexity index
     */
    _removeFromComplexityIndex(term, concept) {
        const complexity = this._getTermComplexity(term);
        const complexityLevel = this._getComplexityLevel(complexity);

        this._removeFromIndex('complexity', complexityLevel, concept);
    }

    /**
     * Index concept by category
     */
    _indexByCategory(term, concept) {
        const category = this._getTermCategory(term);
        this._addToIndex('category', category, concept);
    }

    /**
     * Remove from category index
     */
    _removeFromCategoryIndex(term, concept) {
        const category = this._getTermCategory(term);
        this._removeFromIndex('category', category, concept);
    }

    /**
     * Index concept by activation level
     */
    _indexByActivation(concept) {
        const activationBucket = this._getActivationBucket(concept.activation);
        this._addToIndex('activation', activationBucket, concept);
    }

    /**
     * Remove from activation index
     */
    _removeFromActivationIndex(concept) {
        const activationBucket = this._getActivationBucket(concept.activation);
        this._removeFromIndex('activation', activationBucket, concept);
    }

    /**
     * Index concept temporally
     */
    _indexByTemporal(concept) {
        // For now, we'll just index by creation time (concept should have a timestamp)
        const timestamp = concept.createdAt || Date.now();
        const temporalBucket = this._getTemporalBucket(timestamp);
        this._addToIndex('temporal', temporalBucket, concept);
    }

    /**
     * Remove from temporal index
     */
    _removeFromTemporalIndex(concept) {
        const timestamp = concept.createdAt || Date.now();
        const temporalBucket = this._getTemporalBucket(timestamp);
        this._removeFromIndex('temporal', temporalBucket, concept);
    }

    /**
     * Get the complexity of a term (simplified)
     */
    _getTermComplexity(term) {
        // Base complexity on number of components and nesting
        if (!term || !term.components) return 1;

        let complexity = 1; // Base complexity

        if (Array.isArray(term.components)) {
            complexity += term.components.length * 0.5; // Add complexity for each component

            // Add complexity for nested structures
            for (const comp of term.components) {
                if (comp.components && comp.components.length > 0) {
                    complexity += this._getTermComplexity(comp);
                }
            }
        }

        return complexity;
    }

    /**
     * Get the complexity level bucket for a given complexity value
     */
    _getComplexityLevel(complexity) {
        for (let i = 0; i < this._config.complexityLevels.length; i++) {
            if (complexity <= this._config.complexityLevels[i]) {
                return `level_${this._config.complexityLevels[i]}`;
            }
        }
        return `level_${this._config.complexityLevels[this._config.complexityLevels.length - 1]}_plus`;
    }

    /**
     * Get the category of a term based on its structure
     */
    _getTermCategory(term) {
        if (!term) return 'unknown';

        if (term.isAtomic) return 'atomic';

        // Categorize based on operator
        switch (term.operator) {
            case '-->':
                return 'inheritance';
            case '==>':
                return 'implication';
            case '<->':
                return 'similarity';
            case '&':
                return 'conjunction';
            case '|':
                return 'disjunction';
            case '^':
                return 'operation';
            case '--':
                return 'negation';
            default:
                return 'compound';
        }
    }

    /**
     * Get the activation bucket for a given activation value
     */
    _getActivationBucket(activation) {
        if (activation === undefined) activation = 0;

        for (let i = 0; i < this._config.activationBuckets.length; i++) {
            if (activation <= this._config.activationBuckets[i]) {
                return `act_${this._config.activationBuckets[i]}`;
            }
        }
        return `act_${this._config.activationBuckets[this._config.activationBuckets.length - 1]}_plus`;
    }

    /**
     * Get the temporal bucket for a given timestamp
     */
    _getTemporalBucket(timestamp) {
        // Group by hour (for now)
        const hourBucket = Math.floor(timestamp / this._config.maxTemporalRange);
        return `hour_${hourBucket}`;
    }

    _indexInheritance(term, concept) {
        if (term.components.length >= 2) {
            this._addToIndex('inheritance', term.components[1], concept);
        }
    }

    _indexImplication(term, concept) {
        if (term.components.length >= 2) {
            this._addToIndex('implication', term.components[0], concept);
        }
    }

    _indexSimilarity(term, concept) {
        if (term.components.length >= 2) {
            this._addToIndex('similarity', term.components[0], concept);
            this._addToIndex('similarity', term.components[1], concept);
        }
    }

    _removeCompoundTermIndex(term, concept) {
        this._removeFromIndex('compound', term.operator, term);

        switch (term.operator) {
            case '-->':
                this._removeInheritanceIndex(term, concept);
                break;
            case '==>':
                this._removeImplicationIndex(term, concept);
                break;
            case '<->':
                this._removeSimilarityIndex(term, concept);
                break;
        }
    }

    _removeInheritanceIndex(term, concept) {
        if (term.components.length >= 2) {
            this._removeFromIndex('inheritance', term.components[1], concept);
        }
    }

    _removeImplicationIndex(term, concept) {
        if (term.components.length >= 2) {
            this._removeFromIndex('implication', term.components[0], concept);
        }
    }

    _removeSimilarityIndex(term, concept) {
        if (term.components.length >= 2) {
            this._removeFromIndex('similarity', term.components[0], concept);
            this._removeFromIndex('similarity', term.components[1], concept);
        }
    }

    findInheritanceConcepts = (predicate) => Array.from(this._indexes.inheritance.get(predicate) || []);
    findImplicationConcepts = (premise) => Array.from(this._indexes.implication.get(premise) || []);
    findSimilarityConcepts = (term) => Array.from(this._indexes.similarity.get(term) || []);

    findConceptsByOperator(operator) {
        const terms = this._indexes.compound.get(operator) || new Set();
        return Array.from(terms)
            .flatMap(term => Array.from(this._indexes.term.get(term.id) || []))
            .filter(Boolean);
    }

    /**
     * Find concepts by complexity level
     */
    findConceptsByComplexity(level) {
        const concepts = this._indexes.complexity.get(level) || new Set();
        return Array.from(concepts);
    }

    /**
     * Find concepts by category
     */
    findConceptsByCategory(category) {
        const concepts = this._indexes.category.get(category) || new Set();
        return Array.from(concepts);
    }

    /**
     * Find concepts by activation level
     */
    findConceptsByActivation(activationBucket) {
        const concepts = this._indexes.activation.get(activationBucket) || new Set();
        return Array.from(concepts);
    }

    /**
     * Find concepts by component (subterm matching)
     */
    findConceptsByComponent(componentTerm) {
        const concepts = this._indexes.component.get(componentTerm) || new Set();
        return Array.from(concepts);
    }

    /**
     * Find concepts by temporal range
     */
    findConceptsByTemporal(temporalBucket) {
        const concepts = this._indexes.temporal.get(temporalBucket) || new Set();
        return Array.from(concepts);
    }

    /**
     * Find atomic concepts by name
     */
    findAtomicConcepts(name) {
        const concepts = this._indexes.atomic.get(name) || new Set();
        return Array.from(concepts);
    }

    /**
     * Find concepts by operator (enhanced)
     */
    findConceptsByOperatorEnhanced(operator) {
        // Get concepts from both the basic compound index and the enhanced compoundByOp index
        const basicConcepts = this.findConceptsByOperator(operator);
        const enhancedConcepts = Array.from(this._indexes.compoundByOp.get(operator) || []);

        // Combine and deduplicate
        const allConcepts = [...basicConcepts, ...enhancedConcepts];
        return Array.from(new Set(allConcepts));
    }

    /**
     * Search for related concepts using multiple indexing strategies
     */
    findRelatedConcepts(term, searchOptions = {}) {
        const {
            maxResults = 10,
            includeCategories = [],
            excludeCategories = [],
            minActivation = 0,
            useSemanticSimilarity = true,
            searchDepth = 2
        } = searchOptions;

        const results = new Map(); // Use Map to store concept and relevance score

        // Find by components (subterm matching) - this is the most precise
        if (term.components) {
            for (const comp of term.components) {
                const byComponent = this.findConceptsByComponent(comp);
                for (const concept of byComponent) {
                    // Filter by category if specified
                    const category = this._getTermCategory(concept.term);
                    if (excludeCategories.includes(category)) continue;
                    if (includeCategories.length > 0 && !includeCategories.includes(category)) continue;
                    if (concept.activation < minActivation) continue;

                    // Calculate relevance based on component match
                    const relevance = this._calculateRelevance(term, concept.term, 'component');
                    results.set(concept, {relevance, method: 'component'});
                }
            }
        }

        // Find by category
        const category = this._getTermCategory(term);
        if (!excludeCategories.includes(category) &&
            (includeCategories.length === 0 || includeCategories.includes(category))) {
            const byCategory = this.findConceptsByCategory(category);
            for (const concept of byCategory) {
                if (results.has(concept)) continue; // Skip if already found via components
                if (concept.activation < minActivation) continue;

                const relevance = this._calculateRelevance(term, concept.term, 'category');
                results.set(concept, {relevance, method: 'category'});
            }
        }

        // Semantic similarity search (if enabled)
        if (useSemanticSimilarity) {
            const semanticResults = this._findSemanticallySimilarConcepts(term, searchDepth);
            for (const [concept, relevance] of semanticResults.entries()) {
                if (results.has(concept)) continue; // Skip if already found
                if (concept.activation < minActivation) continue;

                results.set(concept, {relevance, method: 'semantic'});
            }
        }

        // Convert to array, sort by relevance, and return top results
        const sortedResults = Array.from(results.entries())
            .sort((a, b) => b[1].relevance - a[1].relevance)
            .slice(0, maxResults)
            .map(entry => entry[0]); // Return just the concepts, not the relevance scores

        return sortedResults;
    }

    /**
     * Find semantically similar concepts based on structural similarity
     */
    _findSemanticallySimilarConcepts(term, depth = 2) {
        const results = new Map();

        // Calculate similarity with all concepts of the same category
        const category = this._getTermCategory(term);
        const sameCategoryConcepts = this.findConceptsByCategory(category);

        for (const concept of sameCategoryConcepts) {
            if (concept.term === term) continue; // Skip self

            const similarityScore = this._calculateStructuralSimilarity(term, concept.term);
            if (similarityScore > 0.1) { // Only include if somewhat similar
                results.set(concept, similarityScore);
            }
        }

        return results;
    }

    /**
     * Calculate relevance score between two terms based on the search method
     */
    _calculateRelevance(term1, term2, method) {
        switch (method) {
            case 'component':
                // Higher relevance for more component overlap
                return this._calculateStructuralSimilarity(term1, term2);
            case 'category':
                // Medium relevance for category match
                return 0.5;
            case 'semantic':
                // Use structural similarity for semantic relevance
                return this._calculateStructuralSimilarity(term1, term2);
            default:
                return 0.1; // Low default relevance
        }
    }

    /**
     * Calculate structural similarity between two terms
     * This method is similar to the one in ForgettingPolicy but specific to this class
     */
    _calculateStructuralSimilarity(term1, term2) {
        // For atomic terms with same name, return maximum similarity
        if (!term1?.operator && !term2?.operator && term1?.name === term2?.name) {
            return 1.0;
        }

        // For compound terms, calculate similarity based on shared components
        if (term1?.components && term2?.components) {
            const components1 = new Set(term1.components.map(c => c.name));
            const components2 = new Set(term2.components.map(c => c.name));

            // Calculate Jaccard similarity coefficient
            const intersection = [...components1].filter(x => components2.has(x)).length;
            const union = new Set([...components1, ...components2]).size;

            return union > 0 ? intersection / union : 0;
        }

        // For terms with different structures, return low similarity
        return 0.1;
    }

    getConcept(termHash) {
        const concepts = Array.from(this._indexes.term.get(termHash) || []);
        return concepts.length > 0 ? concepts[concepts.length - 1] : undefined;
    }

    getAllConcepts = () => Array.from(this._indexes.term.values()).flat();

    getStats() {
        return {
            totalConcepts: this._totalConcepts,
            inheritanceEntries: this._indexes.inheritance.size,
            implicationEntries: this._indexes.implication.size,
            similarityEntries: this._indexes.similarity.size,
            operatorEntries: this._indexes.compound.size,
            compoundTermsByOperator: Object.fromEntries(
                Array.from(this._indexes.compound.entries()).map(([op, terms]) => [op, terms.size])
            ),
            atomicEntries: this._indexes.atomic.size,
            compoundByOpEntries: this._indexes.compoundByOp.size,
            componentEntries: this._indexes.component.size,
            complexityEntries: this._indexes.complexity.size,
            categoryEntries: this._indexes.category.size,
            temporalEntries: this._indexes.temporal.size,
            activationEntries: this._indexes.activation.size,
            indexDetails: {
                atomic: this._getMapSizes(this._indexes.atomic),
                compoundByOp: this._getMapSizes(this._indexes.compoundByOp),
                component: this._getMapSizes(this._indexes.component),
                complexity: this._getMapSizes(this._indexes.complexity),
                category: this._getMapSizes(this._indexes.category),
                temporal: this._getMapSizes(this._indexes.temporal),
                activation: this._getMapSizes(this._indexes.activation)
            }
        };
    }

    /**
     * Helper to get sizes of maps for stats
     */
    _getMapSizes(map) {
        const sizes = {};
        for (const [key, value] of map.entries()) {
            sizes[key.toString()] = value.size;
        }
        return sizes;
    }

    clear() {
        Object.values(this._indexes).forEach(index => index.clear());
        this._totalConcepts = 0;
    }

    /**
     * Rebuild indexes for a more efficient structure (e.g., after large changes)
     */
    rebuildIndex(concepts) {
        // Clear current indexes
        Object.values(this._indexes).forEach(index => index.clear());
        this._totalConcepts = 0;

        // Re-add all concepts
        for (const concept of concepts) {
            this.addConcept(concept);
        }
    }

    /**
     * Optimize index by removing unused entries and compacting structures
     */
    optimize() {
        // Remove empty sets to free up memory
        for (const index of Object.values(this._indexes)) {
            for (const [key, value] of index.entries()) {
                if (value.size === 0) {
                    index.delete(key);
                }
            }
        }
    }
}
