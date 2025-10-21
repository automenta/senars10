import {Term, TermType} from './Term.js';

export {Term};

const COMMUTATIVE_OPERATORS = new Set(['&', '|', '+', '*', '<->']);
const ASSOCIATIVE_OPERATORS = new Set(['&', '|']);

export class TermFactory {
    constructor() {
        this._cache = new Map();
        this._complexityCache = new Map(); // Cache for computational complexity metrics
    }

    create(data) {
        if (!data) throw new Error('TermFactory.create: data is required');

        if (typeof data === 'string') return this._getOrCreateAtomic(data);

        if (data.name && !data.components && data.operator === undefined) {
            return this._getOrCreateAtomic(data.name);
        }

        const {operator, components} = this._normalizeTermData(data);
        const name = this._buildCanonicalName(operator, components);
        
        // Check if term is already cached
        let term = this._cache.get(name);
        if (!term) {
            term = this._createAndCache(operator, components, name);
        }
        
        // Calculate and cache complexity metrics
        this._calculateComplexityMetrics(term, components);
        
        return term;
    }

    _getOrCreateAtomic(name) {
        let term = this._cache.get(name);
        if (!term) {
            term = this._createAndCache(null, [], name);
            // Atomic terms have complexity of 1
            this._complexityCache.set(name, 1);
        }
        return term;
    }

    _createAndCache(operator, components, name) {
        const existing = this._cache.get(name);
        if (existing) return existing;

        const term = new Term(
            operator ? TermType.COMPOUND : TermType.ATOM,
            name,
            components,
            operator
        );
        this._cache.set(name, term);
        return term;
    }

    _normalizeTermData({operator, components}) {
        if (!Array.isArray(components)) {
            throw new Error('TermFactory._normalizeTermData: components must be an array');
        }

        let normalizedComponents = components.map(comp =>
            (typeof comp === 'string' || comp instanceof Term) ?
                (typeof comp === 'string' ? this.create(comp) : comp) :
                this.create(comp)
        );

        if (operator) {
            this._validateOperator(operator);

            if (ASSOCIATIVE_OPERATORS.has(operator)) {
                normalizedComponents = this._flatten(operator, normalizedComponents);
            }

            if (COMMUTATIVE_OPERATORS.has(operator)) {
                normalizedComponents = this._normalizeCommutative(normalizedComponents);
            }
            
            // Handle nested operators with same precedence
            normalizedComponents = this._handleNestedOperators(operator, normalizedComponents);
        }

        return {operator, components: normalizedComponents};
    }

    _validateOperator(op) {
        if (typeof op !== 'string') throw new Error('TermFactory._validateOperator: operator must be a string');
    }

    _flatten(op, comps) {
        if (!Array.isArray(comps)) throw new Error('TermFactory._flatten: components must be an array');
        return comps.flatMap(c => c?.operator === op ? c.components : [c]);
    }

    _normalizeCommutative(comps) {
        // For commutative operators, sort to maintain canonical form
        // Prioritize compound terms over atomic terms, then by name within same type
        return this._removeRedundancy(comps.sort((a, b) => {
            // If one is compound and other is atomic, compound comes first
            const aIsAtomic = !a.operator;
            const bIsAtomic = !b.operator;
            
            if (aIsAtomic && !bIsAtomic) return 1;  // atomic a comes after compound b
            if (!aIsAtomic && bIsAtomic) return -1; // compound a comes before atomic b
            
            // If both are same type, sort by name
            return a.name.localeCompare(b.name);
        }));
    }

    _compareTermsByComplexity(termA, termB) {
        // Compare by complexity first
        const complexityA = this.getComplexity(termA);
        const complexityB = this.getComplexity(termB);
        
        if (complexityA !== complexityB) {
            return complexityA - complexityB;
        }
        
        // If complexity is the same, compare by name
        return termA.name.localeCompare(termB.name);
    }

    _removeRedundancy(comps) {
        if (!Array.isArray(comps)) throw new Error('TermFactory._removeRedundancy: components must be an array');
        const seen = new Set();
        return comps.filter(c => {
            if (!c || typeof c.name !== 'string') {
                throw new Error('TermFactory._removeRedundancy: component must have a name property');
            }
            // Use the full term name for uniqueness check
            return seen.has(c.name) ? false : !!(seen.add(c.name));
        });
    }

    _buildCanonicalName(op, comps) {
        if (!op) return comps[0].toString();

        const names = comps.map(c => c.name);
        const patterns = {
            '--': `(--, ${names[0]})`,
            '&': `(&, ${names.join(', ')})`,
            '|': `(|, ${names.join(', ')})`,
            '&/': `(&/, ${names.slice(0, 2).join(', ')})`,
            '-->': `(-->, ${names[0]}, ${names[1]})`,
            '<->': `(<->, ${names[0]}, ${names[1]})`,
            '==>': `(==>, ${names[0]}, ${names[1]})`,
            '<=>': `(<=>, ${names[0]}, ${names[1]})`,
            '^': `(^, ${names[0]}, ${names[1]})`,
            '{{--': `({{--, ${names[0]}, ${names[1]})`,
            '--}}': `(--}}, ${names[0]}, ${names[1]})`,
            '{}': `{${names.join(', ')}}`,
            '[]': `[${names.join(', ')}]`,
            ',': `(${names.join(', ')})`
        };

        return patterns[op] || `(${op}, ${names.join(', ')})`;
    }

    /**
     * Enhanced canonicalization that handles nested operators properly
     */
    _handleNestedOperators(operator, components) {
        // For nested operators with same precedence, ensure they are properly normalized
        if (ASSOCIATIVE_OPERATORS.has(operator)) {
            // Already handled by _flatten
            return components;
        }
        
        // For commutative operators, order is handled in _normalizeCommutative
        // Don't re-sort here to avoid conflicts with canonical ordering
        if (COMMUTATIVE_OPERATORS.has(operator)) {
            return components;
        }
        
        // For non-commutative operators, preserve original order
        return components;
    }

    /**
     * Calculate and cache complexity metrics for a term
     */
    _calculateComplexityMetrics(term, components) {
        if (!term) return 0;
        
        let complexity = 1; // Base complexity for the term itself
        
        if (components && components.length > 0) {
            // Add complexity based on number of components
            complexity += components.length;
            
            // Add complexity based on nested terms
            for (const comp of components) {
                complexity += this.getComplexity(comp) || 0;
            }
        }
        
        this._complexityCache.set(term.name, complexity);
        return complexity;
    }

    /**
     * Get the computational complexity of a term
     */
    getComplexity(term) {
        if (typeof term === 'string') {
            return this._complexityCache.get(term) || 1;
        }
        if (term && term.name) {
            return this._complexityCache.get(term.name) || 1;
        }
        return 1;
    }

    /**
     * Get the size of the term cache
     */
    getCacheSize() {
        return this._cache.size;
    }

    /**
     * Clear the term cache
     */
    clearCache() {
        this._cache.clear();
        this._complexityCache.clear();
    }

    /**
     * Get statistics about the factory
     */
    getStats() {
        return {
            cacheSize: this._cache.size,
            complexityCacheSize: this._complexityCache.size,
            efficiency: this._calculateEfficiency()
        };
    }

    /**
     * Calculate caching efficiency
     */
    _calculateEfficiency() {
        // This is a simple efficiency calculation
        // In a real implementation, you'd track hits/misses
        return this._cache.size > 0 ? 1 : 0;
    }

    /**
     * Create a new term with cognitive diversity considerations
     */
    createWithDiversity(data, diversityFactor = 0.1) {
        const term = this.create(data);
        
        // Calculate cognitive diversity impact
        const complexity = this.getComplexity(term);
        // Adjust based on diversity factor to promote variety in term types
        const diversityScore = complexity * (1 + diversityFactor);
        
        return { term, diversityScore, complexity };
    }

    /**
     * Get most complex terms in cache (for cognitive diversity analysis)
     */
    getMostComplexTerms(limit = 10) {
        const entries = Array.from(this._complexityCache.entries());
        return entries
            .sort((a, b) => b[1] - a[1])  // Sort by complexity descending
            .slice(0, limit)
            .map(([name, complexity]) => ({ name, complexity }));
    }

    /**
     * Get least complex terms in cache (for simplicity analysis)
     */
    getSimplestTerms(limit = 10) {
        const entries = Array.from(this._complexityCache.entries());
        return entries
            .sort((a, b) => a[1] - b[1])  // Sort by complexity ascending
            .slice(0, limit)
            .map(([name, complexity]) => ({ name, complexity }));
    }

    /**
     * Calculate average complexity of terms in cache
     */
    getAverageComplexity() {
        if (this._complexityCache.size === 0) return 0;
        
        const totalComplexity = Array.from(this._complexityCache.values())
            .reduce((sum, complexity) => sum + complexity, 0);
        
        return totalComplexity / this._complexityCache.size;
    }
}
