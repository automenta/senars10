import {Term} from '../../term/Term.js';
import {TermFactory} from '../../term/TermFactory.js';
import {VariableBindingUtils} from '../VariableBindingUtils.js';

/**
 * HigherOrderReasoningEngine: Implements advanced higher-order reasoning for MeTTa-style patterns
 * Supports reasoning about patterns and is extensible for new pattern types
 */
export class HigherOrderReasoningEngine {
    constructor() {
        this.termFactory = new TermFactory();
        // Register check functions and their corresponding processors - makes it extensible
        this._patternHandlers = [
            { check: this._isPatternMatchingTerm.bind(this), process: this._processPatternMatching.bind(this) },
            { check: this._isStatementAsObjectTerm.bind(this), process: this._processStatementAsObject.bind(this) },
            { check: this._isNestedImplicationTerm.bind(this), process: this._processNestedImplication.bind(this) }
        ];
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

        // Try each pattern handler in sequence until one succeeds
        for (const handler of this._patternHandlers) {
            if (handler.check(term)) {
                return handler.process(term, context);
            }
        }

        return { result: term, success: false, message: 'No higher-order pattern matched' };
    }

    /**
     * Register a new pattern handler for extensibility
     */
    registerPatternHandler(checkFunction, processFunction) {
        this._patternHandlers.push({ check: checkFunction, process: processFunction });
    }

    /**
     * Check if a term is a candidate for higher-order reasoning
     */
    _isHigherOrderCandidate(term) {
        if (!term?.isCompound || !term.components) return false;

        // Check if any component is itself a compound statement
        return term.components.some(component => this._isLogicalStatement(component)) || 
               this._isPatternMatchingOperator(term.operator);
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
        return term.components.some(component => this._isLogicalStatement(component));
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
        const [pattern1, pattern2] = term.components;
        
        if (!this._isLogicalStatement(pattern1) || !this._isLogicalStatement(pattern2)) {
            return { result: term, success: false, message: 'Both arguments must be logical statements' };
        }

        // Try to find variable bindings between the two patterns
        const bindings = VariableBindingUtils.matchAndBindVariables(pattern1, pattern2, new Map());
        
        if (bindings) {
            const similarity = this._calculatePatternSimilarity(pattern1, pattern2, bindings);
            return { 
                result: this._createSimilarityResult(similarity), 
                success: true, 
                message: `Patterns matched with similarity: ${similarity}`,
                bindings 
            };
        } else {
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
        const processedComponents = term.components.map(component => 
            this._isLogicalStatement(component) 
                ? this._processLogicalStatementAsObject(component, context)
                : component
        );

        const hasChanges = processedComponents.some((comp, idx) => comp !== term.components[idx]);
        
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
            return this._processHigherOrderImplication(antecedent, consequent, context);
        } else if (this._isLogicalStatement(consequent)) {
            return this._processImplicationToStatement(antecedent, consequent, context);
        }

        return { result: term, success: false, message: 'Neither component is a logical statement' };
    }

    /**
     * Process higher-order implications like (A ==> B) ==> C
     */
    _processHigherOrderImplication(antecedentStatement, consequent, context) {
        const matchingFacts = this._findMatchingFacts(antecedentStatement, context);

        if (matchingFacts.length > 0) {
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
        const antecedentMatches = this._findMatchingFacts(antecedent, context);

        if (antecedentMatches.length > 0) {
            return { 
                result: consequentStatement, 
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
                    matches.push(...concept.beliefs.filter(belief => 
                        VariableBindingUtils.matchAndBindVariables(term, belief.term, new Map())
                    ));
                }
            }
        }
        
        return matches;
    }

    /**
     * Calculate similarity between two patterns
     */
    _calculatePatternSimilarity(pattern1, pattern2, bindings) {
        if (bindings.size === 0) return 0;

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
        if (term.name?.startsWith('?')) return 1;
        if (!term.isCompound || !term.components) return 0;

        return term.components.reduce((count, comp) => count + this._countVariables(comp), 0);
    }

    /**
     * Create a result term representing a similarity value
     */
    _createSimilarityResult(similarity) {
        return this.termFactory.create(`similarity(${similarity.toFixed(2)})`);
    }
}