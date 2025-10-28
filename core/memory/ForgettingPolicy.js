/**
 * ForgettingPolicy.js
 * Implements configurable forgetting policies with activation propagation
 */

export class ForgettingPolicy {
    constructor(options = {}) {
        this.policyType = options.policyType || 'simple';
        this.threshold = options.threshold || 0.1;
        this.rate = options.rate || 0.05;
        this.activationDecay = options.activationDecay || 0.95;
        this.usefulnessDecay = options.usefulnessDecay || 0.98;
        this.maxAge = options.maxAge || 1000000; // Maximum age before forgetting (in ms)
        this.minPriority = options.minPriority || 0.05;
        this.propagationStrength = options.propagationStrength || 0.1;
    }

    /**
     * Determine if a concept should be forgotten based on the policy
     */
    shouldForget(concept, currentTime = Date.now()) {
        switch (this.policyType) {
            case 'simple':
                return this._simplePolicy(concept);
            case 'timeBased':
                return this._timeBasedPolicy(concept, currentTime);
            case 'priorityBased':
                return this._priorityBasedPolicy(concept);
            case 'adaptive':
                return this._adaptivePolicy(concept);
            default:
                return this._simplePolicy(concept);
        }
    }

    /**
     * Apply activation propagation to related concepts
     */
    applyActivationPropagation(concept, memory, propagationMap) {
        // Propagate activation to related concepts based on term similarity
        const relatedConcepts = propagationMap ?
            this._getRelatedConceptsFromMap(concept, propagationMap) :
            this._findRelatedConcepts(concept, memory);

        for (const relatedConcept of relatedConcepts) {
            // Calculate activation boost based on relationship strength and current activation
            const relationshipStrength = this._calculateRelationshipStrength(concept, relatedConcept);
            const activationBoost = concept.activation * this.propagationStrength * relationshipStrength;

            // Apply the activation boost to the related concept
            relatedConcept.boostActivation(activationBoost);

            // Also propagate the activation to the concept's tasks
            this._propagateActivationToTasks(relatedConcept, activationBoost);
        }
    }

    /**
     * Get related concepts from a provided propagation map
     */
    _getRelatedConceptsFromMap(concept, propagationMap) {
        if (!propagationMap || !concept.term) return [];

        const termKey = concept.term.id || concept.term.name;
        return propagationMap.get(termKey) || [];
    }

    /**
     * Calculate the strength of relationship between two concepts
     * @param {Concept} concept1 - First concept
     * @param {Concept} concept2 - Second concept
     * @returns {number} - Relationship strength between 0 and 1
     */
    _calculateRelationshipStrength(concept1, concept2) {
        if (!concept1.term || !concept2.term) return 0;

        // Calculate structural similarity
        const structuralSimilarity = this._calculateStructuralSimilarity(concept1.term, concept2.term);

        // Calculate semantic similarity (terms that share components or are in similar contexts)
        const semanticSimilarity = this._calculateSemanticSimilarity(concept1.term, concept2.term);

        // Combined relationship strength - average of both similarities
        return (structuralSimilarity + semanticSimilarity) / 2;
    }

    /**
     * Calculate structural similarity between two terms
     * @param {Term} term1 - First term
     * @param {Term} term2 - Second term
     * @returns {number} - Structural similarity between 0 and 1
     */
    _calculateStructuralSimilarity(term1, term2) {
        // For atomic terms with same name, return maximum similarity
        if (!term1.operator && !term2.operator && term1.name === term2.name) {
            return 1.0;
        }

        // For compound terms, calculate similarity based on shared components
        if (term1.components && term2.components) {
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

    /**
     * Calculate semantic similarity between two terms
     * @param {Term} term1 - First term
     * @param {Term} term2 - Second term
     * @returns {number} - Semantic similarity between 0 and 1
     */
    _calculateSemanticSimilarity(term1, term2) {
        // Check if terms are in similar contexts (e.g. both appear in similar types of inferences)
        // This is a simplified approach - in a full implementation, this would be more sophisticated
        if (!term1.components || !term2.components) {
            return 0.1; // Low similarity for terms without components to compare
        }

        // Higher similarity if both terms have same operator
        if (term1.operator && term2.operator && term1.operator === term2.operator) {
            return 0.7;
        }

        // Medium similarity for different operators but shared components
        const sharedComponents = term1.components.filter(comp1 =>
            term2.components.some(comp2 => comp1.name === comp2.name)
        );

        if (sharedComponents.length > 0) {
            return 0.5;
        }

        return 0.1; // Low similarity by default
    }

    /**
     * Propagate activation to tasks within a concept
     */
    _propagateActivationToTasks(concept, activationBoost) {
        // Apply activation boost to all tasks in the concept
        concept.getAllTasks().forEach(task => {
            // Boost task priority based on the activation boost
            const newPriority = Math.min(1.0, task.budget.priority + activationBoost * 0.1);
            // Update task with the new budget instead of modifying frozen budget
            concept.updateTaskBudget(task, {...task.budget, priority: newPriority});
        });
    }

    /**
     * Simple forgetting policy based on activation and priority
     */
    _simplePolicy(concept) {
        return concept.activation < this.threshold ||
            (concept.tasks.length > 0 && concept.tasks[0].budget.priority < this.minPriority);
    }

    /**
     * Time-based forgetting policy
     */
    _timeBasedPolicy(concept, currentTime) {
        const age = currentTime - (concept.createdAt || currentTime);
        const lowActivation = concept.activation < this.threshold;
        const oldAge = age > this.maxAge;

        return lowActivation && oldAge;
    }

    /**
     * Priority-based forgetting policy
     */
    _priorityBasedPolicy(concept) {
        // Calculate effective priority based on all tasks in the concept
        const avgPriority = this._calculateAveragePriority(concept);
        return avgPriority < this.minPriority && concept.activation < this.threshold;
    }

    /**
     * Adaptive forgetting policy that adjusts based on memory pressure
     */
    _adaptivePolicy(concept) {
        // This would implement more sophisticated logic that adapts based on
        // system state, memory pressure, and other factors
        const baseForget = this._simplePolicy(concept);

        // Adjust threshold based on memory utilization or other factors
        // (This is a simplified version - full implementation would be more complex)
        return baseForget;
    }

    /**
     * Calculate average priority of all tasks in a concept
     */
    _calculateAveragePriority(concept) {
        if (!concept.tasks || concept.tasks.length === 0) return 0;

        const totalPriority = concept.tasks.reduce((sum, task) => sum + task.budget.priority, 0);
        return totalPriority / concept.tasks.length;
    }

    /**
     * Find related concepts based on term similarity
     */
    _findRelatedConcepts(concept, memory) {
        // Find concepts with similar or related terms
        // This could use various metrics like term overlap, subsumption, etc.
        if (!concept.term) return [];

        const allConcepts = memory.getAllConcepts();
        const related = [];

        for (const otherConcept of allConcepts) {
            if (otherConcept === concept) continue;

            // Check for term relationships (simplified version)
            if (this._areTermsRelated(concept.term, otherConcept.term)) {
                related.push(otherConcept);
            }
        }

        return related;
    }

    /**
     * Check if two terms are related (simplified implementation)
     */
    _areTermsRelated(term1, term2) {
        // This is a simplified check - a full implementation would have more sophisticated logic
        if (!term1 || !term2) return false;

        // If terms share components or are structurally similar
        if (term1.components && term2.components) {
            // Check for component overlap
            const names1 = new Set(term1.components.map(c => c.name));
            const names2 = new Set(term2.components.map(c => c.name));

            // If they share at least one component
            for (const name of names1) {
                if (names2.has(name)) return true;
            }
        }

        return false;
    }

    /**
     * Update policy parameters dynamically
     */
    updatePolicy(newOptions) {
        Object.assign(this, newOptions);
    }

    /**
     * Get policy configuration
     */
    getConfig() {
        return {
            policyType: this.policyType,
            threshold: this.threshold,
            rate: this.rate,
            activationDecay: this.activationDecay,
            maxAge: this.maxAge,
            minPriority: this.minPriority,
            propagationStrength: this.propagationStrength
        };
    }
}