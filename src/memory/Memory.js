import {Concept} from './Concept.js';
import {MemoryIndex} from './MemoryIndex.js';
import {MemoryConsolidation} from './MemoryConsolidation.js';
import {BaseComponent} from '../util/BaseComponent.js';
import {clamp} from '../util/common.js';

export class Memory extends BaseComponent {
    static SCORING_WEIGHTS = Object.freeze({activation: 0.5, useCount: 0.3, taskCount: 0.2});
    static NORMALIZATION_LIMITS = Object.freeze({useCount: 100, taskCount: 50});
    static CONSOLIDATION_THRESHOLDS = Object.freeze({
        activationThreshold: 0.1,
        minTasksThreshold: 5,
        decayThreshold: 0.01,
        minTasksForDecay: 2
    });

    constructor(config = {}) {
        const defaultConfig = Object.freeze({
            priorityThreshold: 0.5,
            priorityDecayRate: 0.01,
            consolidationInterval: 10
        });

        super({...defaultConfig, ...config}, 'Memory');
        this._config = {...this.config, ...config};  // Use BaseComponent's config property
        this._concepts = new Map();
        this._focusConcepts = new Set();
        this._index = new MemoryIndex();
        this._consolidation = new MemoryConsolidation();
        this._stats = {
            totalConcepts: 0,
            totalTasks: 0,
            focusConceptsCount: 0,
            createdAt: Date.now(),
            lastConsolidation: Date.now()
        };
        this._cyclesSinceConsolidation = 0;
    }

    get config() { return {...this._config}; }
    get concepts() { return new Map(this._concepts); }
    get focusConcepts() { return new Set(this._focusConcepts); }
    get stats() { return {...this._stats}; }
    
    getConfigValue(key, defaultVal) {
        return this._config[key] !== undefined ? this._config[key] : defaultVal;
    }

    addTask(task, currentTime = Date.now()) {
        if (!task?.term) return false;

        const term = task.term;
        let concept = this._concepts.get(term) || this._createConcept(term);

        const added = concept.addTask(task);
        if (added) {
            this._stats.totalTasks++;
            if (task.budget.priority >= this._config.priorityThreshold) {
                this._focusConcepts.add(concept);
                this._updateFocusConceptsCount();
            }
        }
        return added;
    }

    _createConcept(term) {
        const concept = new Concept(term, this._config);
        this._concepts.set(term, concept);
        this._index.addConcept(concept);
        this._stats.totalConcepts++;
        return concept;
    }

    getConcept(term) {
        return !term ? null : this._concepts.get(term) || this._findConceptByEquality(term);
    }

    _findConceptByEquality(term) {
        for (const [key, value] of this._concepts) {
            if (key.equals(term)) return value;
        }
        return null;
    }

    getAllConcepts() {
        return Array.from(this._concepts.values());
    }

    getConceptsByCriteria(criteria = {}) {
        return this.getAllConcepts().filter(c => {
            if (criteria.minActivation !== undefined && c.activation < criteria.minActivation) return false;
            if (criteria.minTasks !== undefined && c.totalTasks < criteria.minTasks) return false;
            if (criteria.taskType && c.getTasksByType(criteria.taskType).length === 0) return false;
            if (criteria.onlyFocus === true && !this._focusConcepts.has(c)) return false;
            return true;
        });
    }

    getMostActiveConcepts(limit = 10, scoringType = 'standard') {
        if (scoringType === 'composite') {
            return this._getMostActiveConceptsByCompositeScoring(limit);
        } else {
            const {activation: a, useCount: u, taskCount: t} = Memory.SCORING_WEIGHTS;
            const {useCount: useLimit, taskCount: taskLimit} = Memory.NORMALIZATION_LIMITS;

            return this.getAllConcepts()
                .map(concept => this._calculateConceptScore(concept, a, u, t, useLimit, taskLimit))
                .sort((a, b) => b.score - a.score)
                .slice(0, limit)
                .map(({concept}) => concept);
        }
    }

    _calculateConceptScore(concept, activationWeight, useCountWeight, taskCountWeight, useLimit, taskLimit) {
        const normalizedUseCount = clamp(concept.useCount / useLimit, 0, 1);
        const normalizedTaskCount = clamp(concept.totalTasks / taskLimit, 0, 1);
        const score = concept.activation * activationWeight +
            normalizedUseCount * useCountWeight +
            normalizedTaskCount * taskCountWeight;

        return {concept, score};
    }

    /**
     * Get most active concepts using composite scoring algorithm
     * @param {number} limit - Number of concepts to return
     * @param {Object} options - Scoring options
     * @returns {Array<Concept>} - Concepts sorted by composite score
     */
    _getMostActiveConceptsByCompositeScoring(limit = 10, options = {}) {
        const {
            activationWeight = 0.3,
            useCountWeight = 0.2,
            taskCountWeight = 0.2,
            qualityWeight = 0.15,
            complexityWeight = 0.15,
            diversityWeight = 0.1,
            cognitiveDiversity = null,
            termFactory = null
        } = options;

        const concepts = this.getAllConcepts();
        const scoredConcepts = concepts.map(concept => {
            // Calculate normalized scores for each factor
            const normalizedUseCount = clamp(concept.useCount / 100, 0, 1); // Based on standard use limit
            const normalizedTaskCount = clamp(concept.totalTasks / 50, 0, 1); // Based on standard task limit
            const activationScore = concept.activation;
            const qualityScore = concept.quality || 0;
            
            // Calculate complexity score with more sophisticated algorithm when termFactory is provided
            const complexityScore = this._calculateConceptComplexityScore(concept, termFactory);
            
            // Calculate diversity score if cognitive diversity is provided
            const diversityScore = cognitiveDiversity 
                ? this._calculateConceptDiversityScore(concept, cognitiveDiversity) 
                : 0;

            // Calculate recency score (how recently the concept was accessed)
            const recencyScore = this._calculateRecencyScore(concept.lastAccessed);

            // Calculate composite score with additional factors
            const compositeScore = 
                (activationScore * activationWeight) +
                (normalizedUseCount * useCountWeight) +
                (normalizedTaskCount * taskCountWeight) +
                (qualityScore * qualityWeight) +
                (complexityScore * complexityWeight) +
                (diversityScore * diversityWeight) +
                (recencyScore * 0.05); // Small weight for recency

            return {
                concept,
                score: compositeScore,
                breakdown: {
                    activation: activationScore * activationWeight,
                    useCount: normalizedUseCount * useCountWeight,
                    taskCount: normalizedTaskCount * taskCountWeight,
                    quality: qualityScore * qualityWeight,
                    complexity: complexityScore * complexityWeight,
                    diversity: diversityScore * diversityWeight,
                    recency: recencyScore * 0.05
                }
            };
        });

        // Sort by composite score (descending)
        scoredConcepts.sort((a, b) => b.score - a.score);

        return scoredConcepts.slice(0, limit).map(sc => sc.concept);
    }

    /**
     * Calculate complexity score for a concept based on its term
     */
    _calculateConceptComplexityScore(concept, termFactory = null) {
        // If we have access to TermFactory, use its complexity calculation
        if (termFactory && concept.term) {
            return Math.min(1, termFactory.getComplexity(concept.term) / 10); // Normalize to 0-1 range
        }
        
        // Otherwise, calculate based on the term structure
        if (concept.term && concept.term.components) {
            // Base complexity on number of components
            const baseComplexity = Math.min(1, concept.term.components.length * 0.3);
            
            // Add additional complexity for nested structures
            let nestedComplexity = 0;
            if (concept.term.components && Array.isArray(concept.term.components)) {
                for (const comp of concept.term.components) {
                    if (comp.components && comp.components.length > 0) {
                        nestedComplexity += 0.2; // Additional complexity for nested components
                    }
                }
            }
            
            return Math.min(1, baseComplexity + nestedComplexity);
        }
        return 0.1; // Base complexity for simple terms
    }

    /**
     * Calculate diversity score for a concept using cognitive diversity metrics
     */
    _calculateConceptDiversityScore(concept, cognitiveDiversity) {
        // This would use the cognitive diversity module to calculate how diverse
        // this concept is relative to the overall system
        if (cognitiveDiversity) {
            // Calculate how much this concept contributes to the overall diversity
            const systemDiversity = cognitiveDiversity.getMetrics();
            return systemDiversity.diversityScore || 0;
        }
        return 0;
    }

    /**
     * Get concepts by composite scoring with configurable weights
     */
    getConceptsByCompositeScoring(criteria = {}) {
        const {
            limit = 10,
            minScore = 0,
            scoringOptions = {},
            sortBy = 'composite' // 'composite', 'activation', 'complexity', 'diversity'
        } = criteria;

        const concepts = this.getAllConcepts();
        const scoredConcepts = concepts.map(concept => {
            const score = this._calculateDetailedConceptScore(concept, scoringOptions);
            return { concept, score };
        }).filter(item => item.score >= minScore);

        // Sort based on specified criteria
        scoredConcepts.sort((a, b) => {
            if (sortBy === 'activation') return b.concept.activation - a.concept.activation;
            if (sortBy === 'complexity') return b.score.complexityScore - a.score.complexityScore;
            if (sortBy === 'diversity') return b.score.diversityScore - a.score.diversityScore;
            // Default: sort by composite score
            return b.score.compositeScore - a.score.compositeScore;
        });

        return scoredConcepts.slice(0, limit).map(item => item.concept);
    }

    /**
     * Calculate detailed concept score with multiple factors
     */
    _calculateDetailedConceptScore(concept, options = {}) {
        const {
            activationWeight = 0.3,
            useCountWeight = 0.2,
            taskCountWeight = 0.2,
            qualityWeight = 0.15,
            complexityWeight = 0.15,
            diversityWeight = 0.1,
            termFactory = null
        } = options;

        // Calculate normalized activation score
        const activationScore = concept.activation;

        // Calculate normalized use count score
        const normalizedUseCount = clamp(concept.useCount / 100, 0, 1);

        // Calculate normalized task count score
        const normalizedTaskCount = clamp(concept.totalTasks / 50, 0, 1);

        // Calculate quality score
        const qualityScore = concept.quality || 0;

        // Calculate complexity score using the term factory if available
        let complexityScore = 0.1;
        if (termFactory) {
            complexityScore = termFactory.getComplexity(concept.term) / 10; // Normalize to 0-1 range
        } else {
            // Fallback to simple calculation
            complexityScore = this._calculateConceptComplexityScore(concept);
        }

        // Calculate composite score
        const compositeScore = 
            (activationScore * activationWeight) +
            (normalizedUseCount * useCountWeight) +
            (normalizedTaskCount * taskCountWeight) +
            (qualityScore * qualityWeight) +
            (complexityScore * complexityWeight);

        return {
            compositeScore,
            activationScore,
            useCountScore: normalizedUseCount,
            taskCountScore: normalizedTaskCount,
            qualityScore,
            complexityScore,
            diversityScore: 0 // Placeholder - would need cognitive diversity context
        };
    }

    removeConcept(term) {
        const concept = this._concepts.get(term);
        if (!concept) return false;

        this._focusConcepts.delete(concept) && this._updateFocusConceptsCount();
        this._concepts.delete(term);
        this._index.removeConcept(concept);
        this._stats.totalConcepts--;
        this._stats.totalTasks -= concept.totalTasks;

        return true;
    }

    consolidate(currentTime = Date.now()) {
        if (this._cyclesSinceConsolidation++ < this._config.consolidationInterval) return;

        this._cyclesSinceConsolidation = 0;
        this._stats.lastConsolidation = currentTime;

        const results = this._consolidation.consolidate(this, currentTime);
        this._updateFocusConceptsCount();
        return results;
    }

    boostConceptActivation(term, boostAmount = 0.1) {
        const concept = this._concepts.get(term);
        if (concept) {
            concept.boostActivation(boostAmount);
            !this._focusConcepts.has(concept) && this._focusConcepts.add(concept) && this._updateFocusConceptsCount();
        }
    }

    updateConceptQuality(term, qualityChange) {
        this._concepts.get(term)?.updateQuality(qualityChange);
    }

    getDetailedStats() {
        const conceptStats = this.getAllConcepts().map(c => c.getStats());
        const hasConcepts = conceptStats.length > 0;

        return {
            ...this._stats,
            conceptStats,
            memoryUsage: {
                concepts: this._concepts.size,
                focusConcepts: this._focusConcepts.size,
                totalTasks: this._stats.totalTasks
            },
            indexStats: this._index.getStats(),
            oldestConcept: hasConcepts ? Math.min(...conceptStats.map(s => s.createdAt)) : null,
            newestConcept: hasConcepts ? Math.max(...conceptStats.map(s => s.createdAt)) : null,
            averageActivation: hasConcepts ? conceptStats.reduce((sum, s) => sum + s.activation, 0) / conceptStats.length : 0,
            averageQuality: hasConcepts ? conceptStats.reduce((sum, s) => sum + s.quality, 0) / conceptStats.length : 0
        };
    }

    getHealthMetrics() {
        return this._consolidation.calculateHealthMetrics(this);
    }

    _updateFocusConceptsCount() {
        this._stats.focusConceptsCount = this._focusConcepts.size;
    }

    clear() {
        this._concepts.clear();
        this._focusConcepts.clear();
        this._index.clear();
        this._stats = {
            totalConcepts: 0,
            totalTasks: 0,
            focusConceptsCount: 0,
            createdAt: Date.now(),
            lastConsolidation: Date.now()
        };
        this._cyclesSinceConsolidation = 0;
    }

    hasConcept(term) {
        return this._concepts.has(term);
    }

    getTotalTaskCount() {
        return this._stats.totalTasks;
    }

    getConceptsWithBeliefs(pattern) {
        return this.getAllConcepts().filter(concept =>
            concept.getTasksByType('BELIEF').some(task => task.term.equals(pattern))
        );
    }
}