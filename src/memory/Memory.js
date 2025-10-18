import {Concept} from './Concept.js';
import {MemoryIndex} from './MemoryIndex.js';
import {MemoryConsolidation} from './MemoryConsolidation.js';
import {ConfigurableComponent} from '../util/ConfigurableComponent.js';
import {clamp} from '../util/common.js';

export class Memory extends ConfigurableComponent {
    constructor(config = {}) {
        const defaultConfig = {
            priorityThreshold: 0.5,
            priorityDecayRate: 0.01,
            consolidationInterval: 10
        };
        
        super(defaultConfig);
        this.configure(config);

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

    static SCORING_WEIGHTS = {activation: 0.5, useCount: 0.3, taskCount: 0.2};

    static NORMALIZATION_LIMITS = {useCount: 100, taskCount: 50};

    static CONSOLIDATION_THRESHOLDS = {activationThreshold: 0.1, minTasksThreshold: 5, decayThreshold: 0.01, minTasksForDecay: 2};

    get config() {
        return {...this._config};
    }

    get concepts() {
        return new Map(this._concepts);
    }

    get focusConcepts() {
        return new Set(this._focusConcepts);
    }

    get stats() {
        return {...this._stats};
    }

    addTask(task, currentTime = Date.now()) {
        if (!task?.term) return false;

        const term = task.term;
        let concept = this._concepts.get(term) || this._createConcept(term);

        const added = concept.addTask(task);
        if (added) {
            this._stats.totalTasks++;
            if (task.budget.priority >= this.getConfigValue('priorityThreshold')) {
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

    getMostActiveConcepts(limit = 10) {
        const {activation, useCount, taskCount} = Memory.SCORING_WEIGHTS;
        const {useCount: useLimit, taskCount: taskLimit} = Memory.NORMALIZATION_LIMITS;

        return this.getAllConcepts()
            .map(concept => this._calculateConceptScore(concept))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(({concept}) => concept);
    }

    _calculateConceptScore(concept) {
        const {
            activation: activationWeight,
            useCount: useCountWeight,
            taskCount: taskCountWeight
        } = Memory.SCORING_WEIGHTS;
        const {useCount: useLimit, taskCount: taskLimit} = Memory.NORMALIZATION_LIMITS;

        const normalizedUseCount = clamp(concept.useCount / useLimit, 0, 1);
        const normalizedTaskCount = clamp(concept.totalTasks / taskLimit, 0, 1);
        const score = concept.activation * activationWeight +
            normalizedUseCount * useCountWeight +
            normalizedTaskCount * taskCountWeight;

        return {concept, score};
    }

    removeConcept(term) {
        if (!term) return false;

        const concept = this._concepts.get(term);
        if (!concept) return false;

        if (this._focusConcepts.has(concept)) {
            this._focusConcepts.delete(concept);
            this._updateFocusConceptsCount();
        }

        this._concepts.delete(term);
        this._index.removeConcept(concept);
        this._stats.totalConcepts--;
        this._stats.totalTasks -= concept.totalTasks;

        return true;
    }

    consolidate(currentTime = Date.now()) {
        if (this._cyclesSinceConsolidation++ < this.getConfigValue('consolidationInterval')) return;

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
            if (!this._focusConcepts.has(concept)) {
                this._focusConcepts.add(concept);
                this._updateFocusConceptsCount();
            }
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