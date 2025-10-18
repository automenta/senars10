export class MemoryIndex {
    constructor() {
        this._indexes = {
            inheritance: new Map(), // Map<predicate, Set<subject>>
            implication: new Map(), // Map<premise, Set<conclusion>>
            similarity: new Map(),  // Map<term, Set<related>>
            compound: new Map(),    // Map<operator, Set<terms>>
            term: new Map()         // Map<termHash, concept>
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

    addConcept(concept) {
        const {term} = concept;
        const termId = term.id;

        this._totalConcepts++;
        this._addToIndex('term', termId, concept);

        if (!term.isAtomic) {
            this._indexCompoundTerm(term, concept);
        }
    }

    removeConcept(concept) {
        const {term} = concept;
        const termId = term.id;

        if (this._indexes.term.has(termId)) {
            this._removeFromIndex('term', termId, concept);
            this._totalConcepts--;
        }

        if (!term.isAtomic) {
            this._removeCompoundTermIndex(term, concept);
        }
    }

    _indexCompoundTerm(term, concept) {
        this._addToIndex('compound', term.operator, term);

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

        term.components?.forEach(comp => {
            if (comp.isCompound) this._indexCompoundTerm(comp, concept);
        });
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
            )
        };
    }

    clear() {
        Object.values(this._indexes).forEach(index => index.clear());
        this._totalConcepts = 0;
    }
}
