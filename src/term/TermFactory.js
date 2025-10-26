import {Term, TermType} from './Term.js';
import {CognitiveDiversity} from './CognitiveDiversity.js';

export {Term};

const COMMUTATIVE_OPERATORS = new Set(['&', '|', '+', '*', '<->', '=']);
const ASSOCIATIVE_OPERATORS = new Set(['&', '|']);

export class TermFactory {
    constructor() {
        this._cache = new Map();
        this._complexityCache = new Map(); // Cache for computational complexity metrics
        this._cognitiveDiversity = new CognitiveDiversity(this);
        this._cacheHits = 0;
        this._cacheMisses = 0;
        this._maxCacheSize = 5000; // Limit cache size to prevent memory issues
        this._accessTime = new Map(); // Track access times for LRU eviction
    }

    create(data) {
        if (!data) throw new Error('TermFactory.create: data is required');

        if (typeof data === 'string') return this._getOrCreateAtomic(data);

        if (data.name && !data.components && data.operator === undefined) {
            return this._getOrCreateAtomic(data.name);
        }

        const {operator, components} = this._normalizeTermData(data);

        // Advanced canonicalization with proper commutativity and normalization
        const normalizedComponents = this._canonicalizeComponents(operator, components);
        const name = this._buildCanonicalName(operator, normalizedComponents);

        // Check if term is already cached
        let term = this._cache.get(name);
        const currentTime = Date.now();

        if (term) {
            this._cacheHits++;
            // Update access time for LRU
            this._accessTime.set(name, currentTime);
        } else {
            this._cacheMisses++;
            term = this._createAndCache(operator, normalizedComponents, name);

            // Update access time for the new term
            this._accessTime.set(name, currentTime);

            // Evict entries using LRU if cache is too large
            this._evictLRUEntries();
        }

        // Calculate and cache complexity metrics
        this._calculateComplexityMetrics(term, normalizedComponents);

        // Register for cognitive diversity calculations
        this._cognitiveDiversity.registerTerm(term);

        return term;
    }

    _getOrCreateAtomic(name) {
        let term = this._cache.get(name);
        const currentTime = Date.now();

        if (!term) {
            term = this._createAndCache(null, [], name);
            // Atomic terms have complexity of 1
            this._complexityCache.set(name, 1);

            // Update access time for the new term
            this._accessTime.set(name, currentTime);

            // Evict entries using LRU if cache is too large
            this._evictLRUEntries();
        } else {
            // Update access time for existing term
            this._accessTime.set(name, currentTime);
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

    /**
     * Advanced normalization with proper handling of commutativity and associativity
     */
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
                if (operator === '=') {
                    // Special handling for '=' - sort but don't remove redundancy
                    normalizedComponents = normalizedComponents.sort((a, b) => this._compareTermsAlphabetically(a, b));
                } else {
                    normalizedComponents = this._normalizeCommutative(normalizedComponents);
                }
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

    /**
     * Enhanced normalization that handles commutativity with better ordering logic
     */
    _normalizeCommutative(comps) {
        return this._removeRedundancy(comps.sort((a, b) => this._compareTermsAlphabetically(a, b)));
    }

    /**
     * Advanced term comparison that considers multiple factors for consistent ordering
     */
    _compareTerms(termA, termB) {
        // 1. Compare by structural complexity first (depth of the term tree)
        const complexityA = this._getStructuralComplexity(termA);
        const complexityB = this._getStructuralComplexity(termB);
        if (complexityA !== complexityB) return complexityA - complexityB;

        // 2. Compare by total complexity (calculated by our complexity system)
        const totalCompA = this.getComplexity(termA);
        const totalCompB = this.getComplexity(termB);
        if (totalCompA !== totalCompB) return totalCompA - totalCompB;

        // 3. Compare by type: compound terms before atomic terms
        const aIsCompound = !!termA.operator;
        const bIsCompound = !!termB.operator;
        if (aIsCompound !== bIsCompound) return aIsCompound ? -1 : 1;

        // 4. Compare by operator if both are compound and have the same operator
        if (aIsCompound && bIsCompound && termA.operator !== termB.operator) {
            return termA.operator.localeCompare(termB.operator);
        }

        // 5. Compare by name
        return termA.name.localeCompare(termB.name);
    }

    /**
     * Compare terms alphabetically by name for standard commutative operators
     */
    _compareTermsAlphabetically(termA, termB) {
        return termA.name.localeCompare(termB.name);
    }

    /**
     * Calculate structural complexity (depth of the term tree)
     */
    _getStructuralComplexity(term) {
        if (!term || !term.components || term.components.length === 0) {
            return 1; // Atomic terms have depth 1
        }

        let maxDepth = 1;
        for (const comp of term.components) {
            if (comp && comp.components && comp.components.length > 0) {
                maxDepth = Math.max(maxDepth, 1 + this._getStructuralComplexity(comp));
            }
        }

        return maxDepth;
    }

    /**
     * Canonicalize components with advanced logic for ordering and normalization
     */
    _canonicalizeComponents(operator, components) {
        if (!operator) return components; // Atomic terms don't need canonicalization

        // Special handling for operators with specific canonicalization rules
        const canonicalizer = this._getCanonicalizer(operator);
        return canonicalizer ? canonicalizer.call(this, components) : [...components];
    }

    /**\n     * Get canonicalizer function for the given operator\n     */
    _getCanonicalizer(operator) {
        const canonicalizers = {
            '<->': this._canonicalizeEquivalence,
            '<=>': this._canonicalizeEquivalence,
            '-->': this._canonicalizeImplication,
            '=': this._canonicalizeEquivalence  // Also commutative like equivalence operators
        };

        // Handle commutative operators with a default approach
        if (COMMUTATIVE_OPERATORS.has(operator)) {
            // Special case for '=' operator: don't remove redundancy
            // because (5=5) and (5=3) both need 2 components
            if (operator === '=') {
                return (components) => {
                    let canonicalComponents = [...components];
                    // Don't remove redundancy for equality - keep both operands
                    // But still sort for consistent ordering
                    canonicalComponents = canonicalComponents.sort((a, b) => this._compareTermsAlphabetically(a, b));
                    return canonicalComponents;
                };
            } else {
                return (components) => {
                    let canonicalComponents = [...components];
                    canonicalComponents = this._removeRedundancy(canonicalComponents);
                    canonicalComponents = this._normalizeCommutative(canonicalComponents);
                    return canonicalComponents;
                };
            }
        }

        return canonicalizers[operator] || null;
    }

    /**
     * Canonicalize equivalence operators ensuring consistent ordering
     */
    _canonicalizeEquivalence(components) {
        // For equivalence operators, we expect exactly 2 components
        // For property-based testing, if we have fewer than 2, just return as-is
        if (components.length < 2) {
            return components; // Return as-is if not enough components for equivalence
        }

        // Only handle the first 2 components, which is the standard form
        const validComponents = components.length > 2 ?
            components.slice(0, 2) : components;

        // Sort components by structural complexity, putting more complex terms first
        // If equal complexity, sort alphabetically by name
        return validComponents.sort((a, b) => {
            const complexityA = this._getStructuralComplexity(a);
            const complexityB = this._getStructuralComplexity(b);

            if (complexityA !== complexityB) {
                return complexityB - complexityA; // More complex first
            }

            return a.name.localeCompare(b.name);
        });
    }

    /**
     * Canonicalize implication operators
     */
    _canonicalizeImplication(components) {
        // For implication (A --> B), we expect exactly 2 components
        // For property-based testing, if we have fewer than 2, just return as-is
        if (components.length < 2) {
            return components; // Return as-is if not enough components for implication
        }

        // Only handle the first 2 components, which is the standard form
        const validComponents = components.length > 2 ?
            components.slice(0, 2) : components;

        // Don't reorder components for implication as order matters (subject --> predicate)
        return validComponents;
    }

    _removeRedundancy(comps) {
        if (!Array.isArray(comps)) throw new Error('TermFactory._removeRedundancy: components must be an array');
        const seen = new Set();
        return comps.filter(c => {
            if (!c || typeof c.name !== 'string') {
                throw new Error('TermFactory._removeRedundancy: component must have a name property');
            }

            // Create a unique identifier based on the term's structural properties
            const uniqueId = this._getTermUniqueId(c);

            return seen.has(uniqueId) ? false : !!(seen.add(uniqueId));
        });
    }

    /**
     * Generate a unique identifier for a term based on its structure
     */
    _getTermUniqueId(term) {
        if (!term.operator) {
            // For atomic terms, use the name directly
            return term.name;
        }

        // For compound terms, create a structural hash
        const componentsHash = term.components.map(c => this._getTermUniqueId(c)).sort().join('|');
        return `${term.operator}_${componentsHash}`;
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
            '=': `(=, ${names[0]}, ${names[1]})`,
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
     * Evict entries from cache using LRU (Least Recently Used) strategy
     * @private
     */
    _evictLRUEntries() {
        if (this._cache.size <= this._maxCacheSize) {
            return; // No eviction needed
        }

        // Find the oldest accessed term to evict
        let oldestKey = null;
        let oldestTime = Infinity;

        for (const [key, accessTime] of this._accessTime.entries()) {
            if (accessTime < oldestTime) {
                oldestTime = accessTime;
                oldestKey = key;
            }
        }

        // Remove the oldest entry if found
        if (oldestKey) {
            this._cache.delete(oldestKey);
            this._accessTime.delete(oldestKey);
            this._complexityCache.delete(oldestKey); // Also remove from complexity cache
            this._cognitiveDiversity.unregisterTerm(oldestKey); // Unregister from cognitive diversity
        }

        // Continue evicting until cache is within size limit
        if (this._cache.size > this._maxCacheSize) {
            this._evictLRUEntries(); // Recursively evict if still over the limit
        }
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
        this._accessTime.clear();
        this._cognitiveDiversity.clear();
    }

    /**
     * Get statistics about the factory
     */
    getStats() {
        const cacheHitRate = this._cacheMisses + this._cacheHits > 0
            ? this._cacheHits / (this._cacheMisses + this._cacheHits)
            : 0;

        return {
            cacheSize: this._cache.size,
            complexityCacheSize: this._complexityCache.size,
            cognitiveDiversityStats: this._cognitiveDiversity.getMetrics(),
            cacheHits: this._cacheHits,
            cacheMisses: this._cacheMisses,
            cacheHitRate: cacheHitRate,
            efficiency: cacheHitRate,
            maxCacheSize: this._maxCacheSize
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
        const diversityMetrics = this._cognitiveDiversity.evaluateDiversity(term);

        // Adjust based on diversity factor to promote variety in term types
        const diversityScore = complexity * (1 + diversityFactor) * diversityMetrics.normalizationFactor;

        return {
            term,
            diversityScore,
            complexity,
            cognitiveDiversity: diversityMetrics
        };
    }

    /**
     * Get most complex terms in cache (for cognitive diversity analysis)
     */
    getMostComplexTerms(limit = 10) {
        const entries = Array.from(this._complexityCache.entries());
        return entries
            .sort((a, b) => b[1] - a[1])  // Sort by complexity descending
            .slice(0, limit)
            .map(([name, complexity]) => ({name, complexity}));
    }

    /**
     * Get least complex terms in cache (for simplicity analysis)
     */
    getSimplestTerms(limit = 10) {
        const entries = Array.from(this._complexityCache.entries());
        return entries
            .sort((a, b) => a[1] - b[1])  // Sort by complexity ascending
            .slice(0, limit)
            .map(([name, complexity]) => ({name, complexity}));
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

    /**
     * Get cognitive diversity metrics for the current terms
     */
    getCognitiveDiversityMetrics() {
        return this._cognitiveDiversity.getMetrics();
    }

    /**
     * Add computational complexity metrics for cognitive diversity calculations
     */
    calculateCognitiveDiversity() {
        return this._cognitiveDiversity.calculateDiversity();
    }

    /**
     * Create or get the special True atom
     */
    createTrue() {
        return this._getOrCreateAtomic('True');
    }

    /**
     * Create or get the special False atom
     */
    createFalse() {
        return this._getOrCreateAtomic('False');
    }

    /**
     * Create or get the special Null atom
     */
    createNull() {
        return this._getOrCreateAtomic('Null');
    }

    /**
     * Check if a term is a special system atom (True, False, Null)
     * @param {Term} term - The term to check
     * @returns {boolean} - True if the term is a system atom
     */
    isSystemAtom(term) {
        return term && term.isAtomic &&
            (term.name === 'True' || term.name === 'False' || term.name === 'Null');
    }
}
