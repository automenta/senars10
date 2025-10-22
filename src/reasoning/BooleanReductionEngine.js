import {Term} from '../term/Term.js';
import {SYSTEM_ATOMS, isNull, isTrue, isFalse} from './SystemAtoms.js';

/**
 * Boolean Reduction Engine
 * Implements cascading reductions for logical operators with Null as poison pill
 */
export class BooleanReductionEngine {
    constructor() {
        this.reductionRules = this._initializeReductionRules();
    }

    /**
     * Initialize the set of reduction rules
     */
    _initializeReductionRules() {
        return {
            // AND operator reductions
            '&': (args) => this._reduceAnd(args),
            
            // OR operator reductions  
            '|': (args) => this._reduceOr(args),
            
            // Negation reductions
            '--': (args) => this._reduceNegation(args),
            
            // Implication reductions
            '==/': (args) => this._reduceImplication(args),
            
            // Equivalence reductions
            '<=>': (args) => this._reduceEquivalence(args)
        };
    }

    /**
     * Main reduction method that applies cascading reductions
     */
    reduce(term) {
        if (!term || !term.isCompound) {
            return term;  // Atomic terms can't be reduced further
        }

        // Check if we have a reduction rule for this operator
        if (this.reductionRules[term.operator]) {
            try {
                // Apply the specific reduction rule for this operator
                const reducedResult = this.reductionRules[term.operator](term.components);
                
                // If the operation resulted in a valid term, return it
                if (reducedResult) {
                    return reducedResult;
                }
            } catch (error) {
                console.error(`Error during reduction of term ${term}: ${error.message}`);
                return SYSTEM_ATOMS.Null;  // Return Null on error as safety measure
            }
        }

        // If no specific rule applied or no reduction possible, 
        // recursively try to reduce components
        const reducedComponents = term.components.map(comp => this.reduce(comp));
        
        // If components changed, create a new term with reduced components
        if (reducedComponents.some((comp, idx) => comp !== term.components[idx])) {
            return new Term(term.type, term.name, reducedComponents, term.operator);
        }

        // Return original term if no reduction was possible
        return term;
    }

    /**
     * Reduce AND operations with special handling for True, False, and Null
     */
    _reduceAnd(components) {
        if (!components || components.length === 0) {
            return SYSTEM_ATOMS.True; // Empty conjunction is True
        }

        // Check for Null first - Null acts as poison pill
        for (const comp of components) {
            if (isNull(comp)) {
                return SYSTEM_ATOMS.Null; // Null short-circuits the entire AND
            }
        }

        // Check for False - if any component is False, the whole AND is False
        for (const comp of components) {
            if (isFalse(comp)) {
                return SYSTEM_ATOMS.False;
            }
        }

        // Filter out True values (they don't affect AND operation)
        const nonTrueComponents = components.filter(comp => !isTrue(comp));

        // If no non-True components remain, result is True
        if (nonTrueComponents.length === 0) {
            return SYSTEM_ATOMS.True;
        }

        // If we have exactly one non-True component, return it
        if (nonTrueComponents.length === 1) {
            return nonTrueComponents[0];
        }

        // Otherwise, return a simplified AND term with only non-True components
        return new Term('compound', 'AND', nonTrueComponents, '&');
    }

    /**
     * Reduce OR operations with special handling for True, False, and Null
     */
    _reduceOr(components) {
        if (!components || components.length === 0) {
            return SYSTEM_ATOMS.False; // Empty disjunction is False
        }

        // Check for Null first - Null acts as poison pill
        for (const comp of components) {
            if (isNull(comp)) {
                return SYSTEM_ATOMS.Null; // Null short-circuits the entire OR
            }
        }

        // Check for True - if any component is True, the whole OR is True
        for (const comp of components) {
            if (isTrue(comp)) {
                return SYSTEM_ATOMS.True;
            }
        }

        // Filter out False values (they don't affect OR operation)
        const nonFalseComponents = components.filter(comp => !isFalse(comp));

        // If no non-False components remain, result is False
        if (nonFalseComponents.length === 0) {
            return SYSTEM_ATOMS.False;
        }

        // If we have exactly one non-False component, return it
        if (nonFalseComponents.length === 1) {
            return nonFalseComponents[0];
        }

        // Otherwise, return a simplified OR term with only non-False components
        return new Term('compound', 'OR', nonFalseComponents, '|');
    }

    /**
     * Reduce negation operations
     */
    _reduceNegation(components) {
        if (!components || components.length === 0) {
            return SYSTEM_ATOMS.Null; // Invalid negation
        }

        const operand = components[0];

        // Handle double negation
        if (operand.isCompound && operand.operator === '--' && operand.components.length === 1) {
            // Double negation: --(--(x)) reduces to x
            return operand.components[0];
        }

        // Negation of constants
        if (isTrue(operand)) {
            return SYSTEM_ATOMS.False;
        }
        
        if (isFalse(operand)) {
            return SYSTEM_ATOMS.True;
        }
        
        if (isNull(operand)) {
            return SYSTEM_ATOMS.Null; // Negation of Null is Null
        }

        // For other terms, try to reduce the operand first
        const reducedOperand = this.reduce(operand);
        
        // If operand reduced to a constant, apply negation
        if (isTrue(reducedOperand)) {
            return SYSTEM_ATOMS.False;
        }
        
        if (isFalse(reducedOperand)) {
            return SYSTEM_ATOMS.True;
        }
        
        if (isNull(reducedOperand)) {
            return SYSTEM_ATOMS.Null;
        }

        // Otherwise, keep the negation
        return new Term('compound', 'NEGATION', [reducedOperand], '--');
    }

    /**
     * Reduce implication operations
     */
    _reduceImplication(components) {
        if (!components || components.length !== 2) {
            return SYSTEM_ATOMS.Null; // Invalid implication
        }

        const [antecedent, consequent] = components;

        // Check for Null in either component
        if (isNull(antecedent) || isNull(consequent)) {
            return SYSTEM_ATOMS.Null;
        }

        // Implication: A -> B is equivalent to (not A) or B
        // If antecedent is False, implication is True (False -> anything = True)
        if (isFalse(antecedent)) {
            return SYSTEM_ATOMS.True;
        }

        // If consequent is True, implication is True (anything -> True = True) 
        if (isTrue(consequent)) {
            return SYSTEM_ATOMS.True;
        }

        // If antecedent is True and consequent is False, result is False (True -> False = False)
        if (isTrue(antecedent) && isFalse(consequent)) {
            return SYSTEM_ATOMS.False;
        }

        // Try to reduce components and return a simplified implication if no direct reduction possible
        const reducedAntecedent = this.reduce(antecedent);
        const reducedConsequent = this.reduce(consequent);

        if (reducedAntecedent !== antecedent || reducedConsequent !== consequent) {
            return new Term('compound', 'IMPLICATION', [reducedAntecedent, reducedConsequent], '==>');
        }

        // Return original term if no reduction possible
        return new Term('compound', 'IMPLICATION', [antecedent, consequent], '==>');
    }

    /**
     * Reduce equivalence operations
     */
    _reduceEquivalence(components) {
        if (!components || components.length !== 2) {
            return SYSTEM_ATOMS.Null; // Invalid equivalence
        }

        const [left, right] = components;

        // Check for Null in either component
        if (isNull(left) || isNull(right)) {
            return SYSTEM_ATOMS.Null;
        }

        // If both sides are the same constant, result is True
        if ((isTrue(left) && isTrue(right)) || (isFalse(left) && isFalse(right))) {
            return SYSTEM_ATOMS.True;
        }

        // If sides are different constants, result is False
        if ((isTrue(left) && isFalse(right)) || (isFalse(left) && isTrue(right))) {
            return SYSTEM_ATOMS.False;
        }

        // Try to reduce components and return a simplified equivalence if no direct reduction possible
        const reducedLeft = this.reduce(left);
        const reducedRight = this.reduce(right);

        if (reducedLeft !== left || reducedRight !== right) {
            return new Term('compound', 'EQUIVALENCE', [reducedLeft, reducedRight], '<=>');
        }

        // Return original term if no reduction possible
        return new Term('compound', 'EQUIVALENCE', [left, right], '<=>');
    }

    /**
     * Perform complete cascading reduction on a term and its subterms
     */
    cascadeReduce(term) {
        if (!term) {
            return SYSTEM_ATOMS.Null;
        }

        // First, recursively reduce all subterms
        let reducedTerm;
        if (term.isCompound) {
            const reducedComponents = term.components.map(comp => this.cascadeReduce(comp));
            reducedTerm = new Term(term.type, term.name, reducedComponents, term.operator);
        } else {
            reducedTerm = term;
        }

        // Then, try to apply top-level reduction
        return this.reduce(reducedTerm);
    }

    /**
     * Get the reduction rules
     */
    getReductionRules() {
        return this.reductionRules;
    }
}