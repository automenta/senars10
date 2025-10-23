import {Term} from '../term/Term.js';
import {isFalse, isNull, isTrue, SYSTEM_ATOMS} from './SystemAtoms.js';

/**
 * Enhanced BooleanReductionEngine for SeNARS v10 - Phase 5
 * Implements boolean reduction with unified operators that serve both structural and functional purposes
 * based on type-directed disambiguation
 */
export class BooleanReductionEngine {
    constructor() {
        // Rules for functional evaluation (when all arguments are boolean values)
        this.functionalRules = {
            '&': this._reduceAndFunctional.bind(this),
            '|': this._reduceOrFunctional.bind(this),
            '--': this._reduceNegationFunctional.bind(this),
            '==>': this._reduceImplicationFunctional.bind(this),
            '<=>': this._reduceEquivalenceFunctional.bind(this)
        };
        
        // Rules for structural reduction (traditional NAL logic)
        this.structuralRules = {
            '&': this._reduceAndStructural.bind(this),
            '|': this._reduceOrStructural.bind(this),
            '--': this._reduceNegationStructural.bind(this),
            '==>': this._reduceImplicationStructural.bind(this),
            '<=>': this._reduceEquivalenceStructural.bind(this)
        };
    }

    /**
     * Main reduction function that handles both boolean evaluation and structural composition
     */
    reduce(term) {
        if (!term || !term.isCompound) return term;

        // Identify if this is a functional evaluation (all arguments are boolean values)
        if (this._isFunctionalEvaluation(term)) {
            return this._applyFunctionalRule(term.operator, term.components);
        } else {
            // Perform structural composition reduction (traditional NAL logic)
            return this._applyStructuralRule(term.operator, term.components);
        }
    }

    /**
     * Determines if this term should undergo functional evaluation (boolean logic)
     */
    _isFunctionalEvaluation(term) {
        if (!term.isCompound) return false;
        // For operators &, |, ==>, <=>, check if ALL components are boolean values
        if (['&', '|', '==>', '<=>'].includes(term.operator)) {
            return term.components && term.components.every(comp => this._isBooleanValue(comp));
        }
        // For negation, check if operand is boolean
        if (term.operator === '--') {
            return term.components && term.components.length > 0 && this._isBooleanValue(term.components[0]);
        }
        return false;
    }

    // Helper method to determine if term is a boolean value using constant properties
    _isBooleanValue(term) {
        // Check if the term is a system atom (True, False, Null) or has boolean semantic type
        return isTrue(term) || isFalse(term) || isNull(term) || term.isBoolean;
    }

    _applyFunctionalRule(operator, components) {
        const rule = this.functionalRules[operator];
        if (rule) {
            try {
                return rule(components);
            } catch (error) {
                console.error(`Error during functional reduction: ${error.message}`);
                return SYSTEM_ATOMS.Null;
            }
        }
        // If no functional rule, return original components as a compound term
        return new Term('compound', operator.toUpperCase(), components, operator);
    }

    _applyStructuralRule(operator, components) {
        const rule = this.structuralRules[operator];
        if (rule) {
            try {
                return rule(components);
            } catch (error) {
                console.error(`Error during structural reduction: ${error.message}`);
                // For structural operations, return the original form on error
                return new Term('compound', operator.toUpperCase(), components, operator);
            }
        }
        // If no structural rule, return original components as a compound term
        return new Term('compound', operator.toUpperCase(), components, operator);
    }

    // Functional evaluation rules
    _reduceAndFunctional(components) {
        if (!components || components.length === 0) return SYSTEM_ATOMS.True;

        // Short-circuiting: if any component is False, result is False
        if (components.some(comp => isFalse(comp))) return SYSTEM_ATOMS.False;
        // If any component is Null, result is Null (poison)
        if (components.some(comp => isNull(comp))) return SYSTEM_ATOMS.Null;
        // If all components are True, result is True
        if (components.every(comp => isTrue(comp))) return SYSTEM_ATOMS.True;

        // This shouldn't happen if we're in functional mode with booleans, but just in case
        return new Term('compound', 'AND', components, '&');
    }

    _reduceOrFunctional(components) {
        if (!components || components.length === 0) return SYSTEM_ATOMS.False;

        // Short-circuiting: if any component is True, result is True
        if (components.some(comp => isTrue(comp))) return SYSTEM_ATOMS.True;
        // If any component is Null, result is Null (poison)
        if (components.some(comp => isNull(comp))) return SYSTEM_ATOMS.Null;
        // If all components are False, result is False
        if (components.every(comp => isFalse(comp))) return SYSTEM_ATOMS.False;

        // This shouldn't happen if we're in functional mode with booleans, but just in case
        return new Term('compound', 'OR', components, '|');
    }

    _reduceNegationFunctional(components) {
        if (!components || components.length === 0) return SYSTEM_ATOMS.Null;

        const operand = components[0];
        if (isTrue(operand)) return SYSTEM_ATOMS.False;
        if (isFalse(operand)) return SYSTEM_ATOMS.True;
        if (isNull(operand)) return SYSTEM_ATOMS.Null;
        
        // Shouldn't reach here if we're in functional mode
        return SYSTEM_ATOMS.Null;
    }

    _reduceImplicationFunctional(components) {
        if (!components || components.length !== 2) return SYSTEM_ATOMS.Null;

        const [antecedent, consequent] = components;
        // Boolean implication: ~A v B (not A OR B)
        if (isFalse(antecedent) || isTrue(consequent)) return SYSTEM_ATOMS.True;
        if (isTrue(antecedent) && isFalse(consequent)) return SYSTEM_ATOMS.False;
        if (isNull(antecedent) || isNull(consequent)) return SYSTEM_ATOMS.Null;
        
        return SYSTEM_ATOMS.Null; // Unknown case
    }

    _reduceEquivalenceFunctional(components) {
        if (!components || components.length !== 2) return SYSTEM_ATOMS.Null;

        const [left, right] = components;
        if ((isTrue(left) && isTrue(right)) || (isFalse(left) && isFalse(right))) return SYSTEM_ATOMS.True;
        if ((isTrue(left) && isFalse(right)) || (isFalse(left) && isTrue(right))) return SYSTEM_ATOMS.False;
        if (isNull(left) || isNull(right)) return SYSTEM_ATOMS.Null;
        
        return SYSTEM_ATOMS.Null; // Unknown case
    }

    // Structural reduction rules (NAL logic)
    _reduceAndStructural(components) {
        if (!components || components.length === 0) return SYSTEM_ATOMS.True;

        // In structural context, handle boolean values within NAL concepts
        // Remove True components (they don't affect conjunction)
        const nonTrueComponents = components.filter(comp => !isTrue(comp));
        
        // If any component is False, the whole conjunction is False
        if (components.some(comp => isFalse(comp))) return SYSTEM_ATOMS.False;
        
        // If any component is Null, result is Null
        if (components.some(comp => isNull(comp))) return SYSTEM_ATOMS.Null;
        
        // Return simplified or original form
        if (nonTrueComponents.length === 0) return SYSTEM_ATOMS.True;  // All were True
        if (nonTrueComponents.length === 1) return nonTrueComponents[0];  // Single component
        return new Term('compound', 'AND', nonTrueComponents, '&');
    }

    _reduceOrStructural(components) {
        if (!components || components.length === 0) return SYSTEM_ATOMS.False;

        // In structural context, handle boolean values within NAL concepts
        // Remove False components (they don't affect disjunction)
        const nonFalseComponents = components.filter(comp => !isFalse(comp));
        
        // If any component is True, the whole disjunction is True
        if (components.some(comp => isTrue(comp))) return SYSTEM_ATOMS.True;
        
        // If any component is Null, result is Null
        if (components.some(comp => isNull(comp))) return SYSTEM_ATOMS.Null;
        
        // Return simplified or original form
        if (nonFalseComponents.length === 0) return SYSTEM_ATOMS.False;  // All were False
        if (nonFalseComponents.length === 1) return nonFalseComponents[0];  // Single component
        return new Term('compound', 'OR', nonFalseComponents, '|');
    }

    _reduceNegationStructural(components) {
        if (!components || components.length === 0) return SYSTEM_ATOMS.Null;

        const operand = components[0];
        
        // Handle boolean values in negation
        if (isTrue(operand)) return SYSTEM_ATOMS.False;
        if (isFalse(operand)) return SYSTEM_ATOMS.True;
        if (isNull(operand)) return SYSTEM_ATOMS.Null;
        
        // Check for double negation elimination in structural context
        if (operand.isCompound && operand.operator === '--' && operand.components && operand.components.length > 0) {
            // Double negation: --(--(X)) reduces to X
            return operand.components[0];
        }
        
        // For non-boolean terms, return the negation structure
        return new Term('compound', 'NEGATION', [operand], '--');
    }

    _reduceImplicationStructural(components) {
        if (!components || components.length !== 2) {
            // If not proper implication, return a compound term
            return components && components.length > 0 
                ? new Term('compound', 'IMPLICATION', components, '==>') 
                : SYSTEM_ATOMS.Null;
        }

        const [antecedent, consequent] = components;
        
        // Handle boolean values in implication (NAL logic)
        if (isFalse(antecedent) || isTrue(consequent)) return SYSTEM_ATOMS.True;  // False -> X is True, X -> True is True
        if (isTrue(antecedent) && isFalse(consequent)) return SYSTEM_ATOMS.False;  // True -> False is False
        if (isNull(antecedent) || isNull(consequent)) return SYSTEM_ATOMS.Null;  // Null in either position gives Null
        
        // For NAL concepts, return the implication structure
        return new Term('compound', 'IMPLICATION', [antecedent, consequent], '==>');
    }

    _reduceEquivalenceStructural(components) {
        if (!components || components.length !== 2) {
            // If not proper equivalence, return first component or compound term
            return components && components.length > 0 
                ? (components.length === 1 ? components[0] : new Term('compound', 'EQUIVALENCE', components, '<=>')) 
                : SYSTEM_ATOMS.Null;
        }

        const [left, right] = components;
        
        // Handle boolean values in equivalence (NAL logic)
        if ((isTrue(left) && isTrue(right)) || (isFalse(left) && isFalse(right))) return SYSTEM_ATOMS.True;
        if ((isTrue(left) && isFalse(right)) || (isFalse(left) && isTrue(right))) return SYSTEM_ATOMS.False;
        if (isNull(left) || isNull(right)) return SYSTEM_ATOMS.Null;  // Null in either position gives Null
        
        // For NAL concepts, return the equivalence structure
        return new Term('compound', 'EQUIVALENCE', [left, right], '<=>');
    }

    /**
     * Cascading reduction that processes entire term trees
     */
    cascadeReduce(term) {
        if (!term) return SYSTEM_ATOMS.Null;

        // First, recursively reduce all components
        if (term.isCompound && term.components) {
            const reducedComponents = term.components.map(comp => this.cascadeReduce(comp));
            // Create a new term with the reduced components
            const processedTerm = reducedComponents.some((comp, idx) => comp !== term.components[idx])
                ? new Term(term.type, term.name, reducedComponents, term.operator)
                : term;
            
            // Then apply the reduction to the processed term
            return this.reduce(processedTerm);
        }
        
        // For atomic terms, just return after possible processing
        return this.reduce(term);
    }
}