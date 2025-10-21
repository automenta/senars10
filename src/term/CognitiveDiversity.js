/**
 * CognitiveDiversity.js
 * Implements cognitive diversity calculations using computational complexity metrics
 */

export class CognitiveDiversity {
    constructor(termFactory) {
        this.termFactory = termFactory;
        this.diversityMetrics = {
            complexityDistribution: new Map(),
            diversityScore: 0,
            variety: 0,
            averageComplexity: 0
        };
    }

    /**
     * Calculate cognitive diversity for a set of terms
     */
    calculateDiversity(terms) {
        if (!Array.isArray(terms) || terms.length === 0) {
            return this.diversityMetrics;
        }

        // Calculate complexities for all terms
        const complexities = terms.map(term => this.termFactory.getComplexity(term));
        
        // Calculate distribution of complexities
        const distribution = this._calculateComplexityDistribution(complexities);
        
        // Calculate variety (how diverse the complexities are)
        const variety = this._calculateVariety(complexities);
        
        // Calculate average complexity
        const averageComplexity = complexities.reduce((sum, val) => sum + val, 0) / complexities.length;
        
        // Calculate overall diversity score based on variety and average complexity
        const diversityScore = variety * (1 + Math.log(averageComplexity + 1));
        
        this.diversityMetrics = {
            complexityDistribution: distribution,
            diversityScore,
            variety,
            averageComplexity,
            totalTerms: terms.length
        };

        return this.diversityMetrics;
    }

    /**
     * Calculate the distribution of term complexities
     */
    _calculateComplexityDistribution(complexities) {
        const distribution = new Map();
        
        for (const complexity of complexities) {
            distribution.set(complexity, (distribution.get(complexity) || 0) + 1);
        }
        
        return distribution;
    }

    /**
     * Calculate variety (entropy-based diversity of term complexities)
     */
    _calculateVariety(complexities) {
        if (complexities.length === 0) return 0;
        
        // Count occurrences of each complexity value
        const counts = new Map();
        for (const complexity of complexities) {
            counts.set(complexity, (counts.get(complexity) || 0) + 1);
        }
        
        // Calculate entropy (variety)
        let variety = 0;
        for (const count of counts.values()) {
            const probability = count / complexities.length;
            variety -= probability * Math.log2(probability);
        }
        
        return variety;
    }

    /**
     * Get cognitive diversity metrics
     */
    getMetrics() {
        return { ...this.diversityMetrics };
    }

    /**
     * Assess if the current term complexity distribution indicates high cognitive diversity
     */
    isHighDiversity(threshold = 1.5) {
        return this.diversityMetrics.diversityScore > threshold;
    }

    /**
     * Assess if the current term complexity distribution indicates low cognitive diversity
     */
    isLowDiversity(threshold = 0.5) {
        return this.diversityMetrics.diversityScore < threshold;
    }

    /**
     * Suggest a new term complexity that would increase cognitive diversity
     */
    suggestDiversityTerm() {
        const currentComplexities = Array.from(this.diversityMetrics.complexityDistribution.keys());
        
        if (currentComplexities.length === 0) {
            return { suggestedComplexity: 1, reason: 'No terms exist, suggest simple term' };
        }
        
        // Find the gap in complexity values to suggest a new one
        currentComplexities.sort((a, b) => a - b);
        
        // If we have low diversity, suggest something different from the average
        if (this.isLowDiversity()) {
            // Suggest either a very simple or very complex term
            const avg = this.diversityMetrics.averageComplexity;
            return {
                suggestedComplexity: avg < 3 ? 5 : 1, // If average is low, suggest complex; if high, suggest simple
                reason: 'Low diversity detected, suggesting contrasting complexity'
            };
        } else {
            // Suggest complexity that fills a gap or is different from existing ones
            for (let i = 1; i <= Math.max(...currentComplexities) + 2; i++) {
                if (!currentComplexities.includes(i)) {
                    return {
                        suggestedComplexity: i,
                        reason: `Gap found in complexity distribution at ${i}`
                    };
                }
            }
        }
        
        // If no gap found, suggest significantly different complexity
        return {
            suggestedComplexity: Math.max(...currentComplexities) + 2,
            reason: 'No gaps found, suggesting higher complexity'
        };
    }

    /**
     * Calculate complexity distance between two terms
     */
    complexityDistance(term1, term2) {
        const complexity1 = this.termFactory.getComplexity(term1);
        const complexity2 = this.termFactory.getComplexity(term2);
        return Math.abs(complexity1 - complexity2);
    }

    /**
     * Get terms that contribute most to cognitive diversity
     */
    getDiversityContributors(terms, topN = 5) {
        if (!Array.isArray(terms) || terms.length === 0) return [];
        
        // Calculate how much each term contributes to the overall diversity
        const contributions = terms.map(term => {
            const complexity = this.termFactory.getComplexity(term);
            // Contribution is based on how different this complexity is from the average
            const deviation = Math.abs(complexity - this.diversityMetrics.averageComplexity);
            return { term, complexity, contribution: deviation };
        });
        
        // Sort by contribution and return top N
        return contributions
            .sort((a, b) => b.contribution - a.contribution)
            .slice(0, topN);
    }
}