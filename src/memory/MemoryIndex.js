export class MemoryIndex {
    constructor() {
        this._inheritanceIndex = new Map(); // Map<predicate, Set<subject>>
        this._implicationIndex = new Map(); // Map<premise, Set<conclusion>>
        this._similarityIndex = new Map(); // Map<term1, Set<term2>>
        this._compoundIndex = new Map(); // Map<operator, Set<terms>>
        this._termIndex = new Map(); // Map<termHash, concept>
        this._totalConcepts = 0; // Track total number of concept objects added
    }

    addConcept(concept) {
        const term = concept.term;
        const termId = term.id;

        // Update total concept counter
        this._totalConcepts++;

        // Add to main term index - store as array to handle multiple concepts per term
        if (!this._termIndex.has(termId)) {
            this._termIndex.set(termId, []);
        }
        const conceptsArray = this._termIndex.get(termId);
        conceptsArray.push(concept);

        // Index by term type
        if (term.isAtomic) {
            this._indexAtomicTerm(term, concept);
        } else {
            this._indexCompoundTerm(term, concept);
        }
    }

    /**
     * Remove concept from indexes
     */
    removeConcept(concept) {
        const term = concept.term;
        const termId = term.id;

        // Remove from main term index - handle array of concepts
        if (this._termIndex.has(termId)) {
            const concepts = this._termIndex.get(termId);
            if (Array.isArray(concepts)) {
                const index = concepts.indexOf(concept);
                if (index !== -1) {
                    concepts.splice(index, 1);
                    this._totalConcepts--;

                    // If array is empty, remove the entry
                    if (concepts.length === 0) {
                        this._termIndex.delete(termId);
                    }
                }
            } else {
                // Backwards compatibility with old direct storage
                this._termIndex.delete(termId);
                this._totalConcepts--;
            }
        }

        // Remove from specialized indexes
        if (term.isAtomic) {
            this._removeAtomicTermIndex(term);
        } else {
            this._removeCompoundTermIndex(term, concept);
        }
    }

    /**
     * Index atomic terms
     * @private
     */
    _indexAtomicTerm(term, concept) {
        // Atomic terms are primarily indexed by their string representation
        // Could be enhanced with semantic indexing in the future
    }

    /**
     * Index compound terms by their structure
     * @private
     */
    _indexCompoundTerm(term, concept) {
        const operator = term.operator;

        // Initialize operator index if needed
        if (!this._compoundIndex.has(operator)) {
            this._compoundIndex.set(operator, new Set());
        }
        this._compoundIndex.get(operator).add(term);

        // Index by specific operator types
        switch (operator) {
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

        // Recursively index any compound components
        if (term.components) {
            for (const component of term.components) {
                if (component.isCompound) {
                    this._indexCompoundTerm(component, concept);
                }
            }
        }
    }

    /**
     * Index inheritance relationships (A --> B)
     * @private
     */
    _indexInheritance(term, concept) {
        if (term.components.length >= 2) {
            const predicate = term.components[1];

            if (!this._inheritanceIndex.has(predicate)) {
                this._inheritanceIndex.set(predicate, new Set());
            }
            this._inheritanceIndex.get(predicate).add(concept);
        }
    }

    /**
     * Index implication relationships (A ==> B)
     * @private
     */
    _indexImplication(term, concept) {
        if (term.components.length >= 2) {
            const premise = term.components[0];

            if (!this._implicationIndex.has(premise)) {
                this._implicationIndex.set(premise, new Set());
            }
            this._implicationIndex.get(premise).add(concept);
        }
    }

    /**
     * Index similarity relationships (A <-> B)
     * @private
     */
    _indexSimilarity(term, concept) {
        if (term.components.length >= 2) {
            const term1 = term.components[0];
            const term2 = term.components[1];

            if (!this._similarityIndex.has(term1)) {
                this._similarityIndex.set(term1, new Set());
            }
            if (!this._similarityIndex.has(term2)) {
                this._similarityIndex.set(term2, new Set());
            }

            this._similarityIndex.get(term1).add(concept);
            this._similarityIndex.get(term2).add(concept);
        }
    }

    /**
     * Remove atomic term from indexes
     * @private
     */
    _removeAtomicTermIndex(term) {
        // Atomic terms don't need special cleanup
    }

    /**
     * Remove compound term from indexes
     * @private
     */
    _removeCompoundTermIndex(term, concept) {
        const operator = term.operator;

        // Remove from operator index
        if (this._compoundIndex.has(operator)) {
            this._compoundIndex.get(operator).delete(term);
            if (this._compoundIndex.get(operator).size === 0) {
                this._compoundIndex.delete(operator);
            }
        }

        // Remove from specific indexes
        switch (operator) {
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

    /**
     * Remove inheritance index entries
     * @private
     */
    _removeInheritanceIndex(term, concept) {
        if (term.components.length >= 2) {
            const predicate = term.components[1];

            if (this._inheritanceIndex.has(predicate)) {
                this._inheritanceIndex.get(predicate).delete(concept);
                if (this._inheritanceIndex.get(predicate).size === 0) {
                    this._inheritanceIndex.delete(predicate);
                }
            }
        }
    }

    /**
     * Remove implication index entries
     * @private
     */
    _removeImplicationIndex(term, concept) {
        if (term.components.length >= 2) {
            const premise = term.components[0];

            if (this._implicationIndex.has(premise)) {
                this._implicationIndex.get(premise).delete(concept);
                if (this._implicationIndex.get(premise).size === 0) {
                    this._implicationIndex.delete(premise);
                }
            }
        }
    }

    /**
     * Remove similarity index entries
     * @private
     */
    _removeSimilarityIndex(term, concept) {
        if (term.components.length >= 2) {
            const term1 = term.components[0];
            const term2 = term.components[1];

            if (this._similarityIndex.has(term1)) {
                this._similarityIndex.get(term1).delete(concept);
                if (this._similarityIndex.get(term1).size === 0) {
                    this._similarityIndex.delete(term1);
                }
            }

            if (this._similarityIndex.has(term2)) {
                this._similarityIndex.get(term2).delete(concept);
                if (this._similarityIndex.get(term2).size === 0) {
                    this._similarityIndex.delete(term2);
                }
            }
        }
    }

    /**
     * Find concepts with inheritance relationships
     */
    findInheritanceConcepts(predicate) {
        const concepts = this._inheritanceIndex.get(predicate) || new Set();
        return Array.from(concepts);
    }

    /**
     * Find concepts with implication relationships
     */
    findImplicationConcepts(premise) {
        const concepts = this._implicationIndex.get(premise) || new Set();
        return Array.from(concepts);
    }

    /**
     * Find concepts with similarity relationships
     */
    findSimilarityConcepts(term) {
        const concepts = this._similarityIndex.get(term) || new Set();
        return Array.from(concepts);
    }

    /**
     * Find concepts by operator type
     */
    findConceptsByOperator(operator) {
        const terms = this._compoundIndex.get(operator) || new Set();
        return Array.from(terms)
            .map(term => this._termIndex.get(term.id))
            .filter(concept => concept !== undefined);
    }

    /**
     * Get concept by term hash
     */
    getConcept(termHash) {
        const concepts = this._termIndex.get(termHash);
        return Array.isArray(concepts) && concepts.length > 0 ? concepts[concepts.length - 1] : concepts;
    }

    /**
     * Get all indexed concepts
     */
    getAllConcepts() {
        return Array.from(this._termIndex.values());
    }

    /**
     * Get index statistics
     */
    getStats() {
        return {
            totalConcepts: this._totalConcepts,
            inheritanceEntries: this._inheritanceIndex.size,
            implicationEntries: this._implicationIndex.size,
            similarityEntries: this._similarityIndex.size,
            operatorEntries: this._compoundIndex.size,
            compoundTermsByOperator: Object.fromEntries(
                Array.from(this._compoundIndex.entries()).map(([op, terms]) => [op, terms.size])
            )
        };
    }

    /**
     * Clear all indexes
     */
    clear() {
        this._inheritanceIndex.clear();
        this._implicationIndex.clear();
        this._similarityIndex.clear();
        this._compoundIndex.clear();
        this._termIndex.clear();
        this._totalConcepts = 0;
    }
}