import {Term} from '../../term/Term.js';
import {TermFactory} from '../../term/TermFactory.js';
import {VariableBindingUtils} from '../VariableBindingUtils.js';

/**
 * HigherOrderReasoningEngine: Implements advanced higher-order reasoning for MeTTa-style patterns
 * Supports reasoning about patterns like (Similar, (Human ==> Mortal), (Socrates ==> Mortal))
 */
export class HigherOrderReasoningEngine {
    constructor() {
        this.termFactory = new TermFactory();
    }

    /**
     * Process a higher-order term that treats logical statements as first-class objects
     * @param {Term} term - The higher-order term to process
     * @param {Context} context - The reasoning context
     * @returns {Object} Result of processing the higher-order term
     */
    processHigherOrderTerm(term, context) {
        if (!this._isHigherOrderCandidate(term)) {
            return { result: term, success: false, message: 'Not a higher-order term candidate' };
        }

        // Handle different types of higher-order patterns
        if (this._isPatternMatchingTerm(term)) {
            return this._processPatternMatching(term, context);
        }

        if (this._isStatementAsObjectTerm(term)) {
            return this._processStatementAsObject(term, context);
        }

        if (this._isNestedImplicationTerm(term)) {
            return this._processNestedImplication(term, context);
        }

        return { result: term, success: false, message: 'No higher-order pattern matched' };
    }

    /**
     * Check if a term is a candidate for higher-order reasoning
     */
    _isHigherOrderCandidate(term) {
        if (!term?.isCompound || !term.components) return false;

        // Check if any component is itself a compound statement
        for (const component of term.components) {
            if (this._isLogicalStatement(component)) {
                return true;
            }
        }

        // Check for specific higher-order patterns
        if (this._isPatternMatchingOperator(term.operator)) {
            return true;
        }

        return false;
    }

    /**
     * Check if a term represents a logical statement (inheritance, implication, equivalence)
     */
    _isLogicalStatement(term) {
        if (!term?.isCompound) return false;
        return ['-->', '==>', '<=>', '||', '&&'].includes(term.operator);
    }

    /**
     * Check if the operator indicates pattern matching (like 'Similar')
     */
    _isPatternMatchingOperator(operator) {
        return ['Similar', 'similar', 'pattern', 'match'].includes(operator);
    }

    /**
     * Check if this is a pattern matching term
     */
    _isPatternMatchingTerm(term) {
        if (!term?.isCompound || !term.components || term.components.length < 2) return false;
        return this._isPatternMatchingOperator(term.operator);
    }

    /**
     * Check if this term treats a statement as an object
     */
    _isStatementAsObjectTerm(term) {
        if (!term?.isCompound || !term.components) return false;

        for (const component of term.components) {
            if (this._isLogicalStatement(component)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if this is a nested implication term like (A ==> B) ==> C
     */
    _isNestedImplicationTerm(term) {
        if (!term?.isCompound || !term.components) return false;

        if (term.operator === '==>' && term.components.length === 2) {
            return this._isLogicalStatement(term.components[0]) || 
                   this._isLogicalStatement(term.components[1]);
        }

        return false;
    }

    /**
     * Process pattern matching terms like (Similar, (Human ==> Mortal), (Socrates ==> Mortal))
     */
    _processPatternMatching(term, context) {
        if (!term.components || term.components.length < 2) {
            return { result: term, success: false, message: 'Insufficient arguments for pattern matching' };
        }

        const [pattern1, pattern2] = term.components;
        
        if (!this._isLogicalStatement(pattern1) || !this._isLogicalStatement(pattern2)) {
            return { result: term, success: false, message: 'Both arguments must be logical statements' };
        }

        // Try to find variable bindings between the two patterns
        const bindings = VariableBindingUtils.matchAndBindVariables(pattern1, pattern2, new Map());
        
        if (bindings) {
            // Calculate similarity based on how well the patterns match
            const similarity = this._calculatePatternSimilarity(pattern1, pattern2, bindings);
            
            // Return a truth value based on similarity
            return { 
                result: this._createSimilarityResult(similarity), 
                success: true, 
                message: `Patterns matched with similarity: ${similarity}`,
                bindings 
            };
        } else {
            // Return a low similarity result
            return { 
                result: this._createSimilarityResult(0), 
                success: true, 
                message: 'Patterns did not match' 
            };
        }
    }

    /**
     * Process terms where statements are treated as objects
     */
    _processStatementAsObject(term, context) {
        if (!term.components) {
            return { result: term, success: false, message: 'No components to process' };
        }

        const processedComponents = [];
        let hasChanges = false;

        for (const component of term.components) {
            if (this._isLogicalStatement(component)) {
                // Process the logical statement and try to evaluate it within context
                const processed = this._processLogicalStatementAsObject(component, context);
                processedComponents.push(processed);
                if (processed !== component) hasChanges = true;
            } else {
                processedComponents.push(component);
            }
        }

        if (hasChanges) {
            const newTerm = new Term('compound', 
                `(${term.operator}, ${processedComponents.map(c => c.name || c.toString()).join(', ')})`, 
                processedComponents, 
                term.operator);
            return { 
                result: newTerm, 
                success: true, 
                message: 'Processed logical statements as objects' 
            };
        }

        return { result: term, success: false, message: 'No logical statements to process as objects' };
    }

    /**
     * Process a logical statement when treated as an object
     */
    _processLogicalStatementAsObject(statement, context) {
        // In NARS/MeTTa, a statement treated as an object can be reasoned about
        // This is essentially creating a "meta-statement" about the statement itself
        return statement; // For now, return as is - more complex processing would be needed for full implementation
    }

    /**
     * Process nested implication terms like (A ==> B) ==> C
     */
    _processNestedImplication(term, context) {
        if (!term.components || term.components.length !== 2) {
            return { result: term, success: false, message: 'Nested implication needs exactly 2 components' };
        }

        const [antecedent, consequent] = term.components;

        if (this._isLogicalStatement(antecedent)) {
            // We have (statement ==> X), where the antecedent is itself a statement
            // This is higher-order reasoning about conditional relationships
            return this._processHigherOrderImplication(antecedent, consequent, context);
        } else if (this._isLogicalStatement(consequent)) {
            // We have (X ==> statement), where the consequent is itself a statement
            return this._processImplicationToStatement(antecedent, consequent, context);
        }

        return { result: term, success: false, message: 'Neither component is a logical statement' };
    }

    /**
     * Process higher-order implications like (A ==> B) ==> C
     */
    _processHigherOrderImplication(antecedentStatement, consequent, context) {
        // This represents reasoning about implications themselves
        // e.g., if "implication (Human --> Mortal)" implies something, how do we reason about that?

        // For now, we'll look for instances where the antecedent statement matches known facts
        const matchingFacts = this._findMatchingFacts(antecedentStatement, context);

        if (matchingFacts.length > 0) {
            // If the antecedent statement is true, then the consequent should follow
            const derivedTerm = new Term('compound', 
                `(higher-order-implication-result, ${consequent.name || consequent.toString()})`, 
                [consequent], 
                'higher-order-result');
                
            return { 
                result: derivedTerm, 
                success: true, 
                message: 'Higher-order implication resolved based on matching facts' 
            };
        } else {
            return { 
                result: term, 
                success: true, 
                message: 'Higher-order implication pending evidence for antecedent' 
            };
        }
    }

    /**
     * Process implications that lead to statements like A ==> (B ==> C)
     */
    _processImplicationToStatement(antecedent, consequentStatement, context) {
        // This represents a conditional that leads to another conditional
        // e.g., if A then (B implies C)

        // Look for evidence that antecedent is true
        const antecedentMatches = this._findMatchingFacts(antecedent, context);

        if (antecedentMatches.length > 0) {
            // If antecedent is true, then the consequent statement should hold
            const derivedTerm = consequentStatement;
            
            return { 
                result: derivedTerm, 
                success: true, 
                message: 'Conditional statement derived from true antecedent' 
            };
        } else {
            return { 
                result: term, 
                success: true, 
                message: 'Conditional statement awaits evidence for antecedent' 
            };
        }
    }

    /**
     * Find facts in context that match a given term pattern
     */
    _findMatchingFacts(term, context) {
        const matches = [];
        
        if (context?.memory?.concepts) {
            for (const concept of context.memory.concepts.values()) {
                if (concept.beliefs) {
                    for (const belief of concept.beliefs) {
                        if (VariableBindingUtils.matchAndBindVariables(term, belief.term, new Map())) {
                            matches.push(belief);
                        }
                    }
                }
            }
        }
        
        return matches;
    }

    /**
     * Calculate similarity between two patterns
     */
    _calculatePatternSimilarity(pattern1, pattern2, bindings) {
        // For now, use a simple metric: number of variable bindings / total possible bindings
        if (bindings.size === 0) return 0;

        // Count the number of unique variables in both patterns
        const varCount1 = this._countVariables(pattern1);
        const varCount2 = this._countVariables(pattern2);
        const maxVars = Math.max(varCount1, varCount2, 1);

        // Similarity is the ratio of successful bindings to potential bindings
        return Math.min(bindings.size / maxVars, 1.0);
    }

    /**
     * Count variables in a term
     */
    _countVariables(term) {
        let count = 0;

        if (term.name?.startsWith('?')) {
            count = 1;
        }

        if (term.isCompound && term.components) {
            for (const comp of term.components) {
                count += this._countVariables(comp);
            }
        }

        return count;
    }

    /**
     * Create a result term representing a similarity value
     */
    _createSimilarityResult(similarity) {
        // Create a term representing the similarity value
        // Use a simpler approach that doesn't require complex components
        return this.termFactory.create(`similarity(${similarity.toFixed(2)})`);
    }
}