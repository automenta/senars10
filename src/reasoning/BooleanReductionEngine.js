import {Term} from '../term/Term.js';
import {SYSTEM_ATOMS, isNull, isTrue, isFalse} from './SystemAtoms.js';

export class BooleanReductionEngine {
    constructor() {
        this.reductionRules = {
            '&': this._reduceAnd.bind(this),
            '|': this._reduceOr.bind(this), 
            '--': this._reduceNegation.bind(this),
            '==>': this._reduceImplication.bind(this),
            '<=>': this._reduceEquivalence.bind(this)
        };
    }

    reduce(term) {
        if (!term || !term.isCompound) return term;

        // Apply specific reduction rule if available
        const rule = this.reductionRules[term.operator];
        if (rule) {
            try {
                const result = rule(term.components);
                if (result) return result;
            } catch (error) {
                console.error(`Error during reduction of term ${term}: ${error.message}`);
                return SYSTEM_ATOMS.Null;
            }
        }

        // Recursively reduce components
        const reducedComponents = term.components.map(comp => this.reduce(comp));
        
        // Create new term if components changed, otherwise return original
        return reducedComponents.some((comp, idx) => comp !== term.components[idx]) 
            ? this._safeCreateTerm(term, reducedComponents)
            : term;
    }

    _safeCreateTerm(originalTerm, components) {
        try {
            return new Term(originalTerm.type, originalTerm.name, components, originalTerm.operator);
        } catch (error) {
            console.error(`Error creating reduced term: ${error.message}`);
            return SYSTEM_ATOMS.Null;
        }
    }

    _reduceAnd(components) {
        if (!components || components.length === 0) return SYSTEM_ATOMS.True;
        
        // Handle poison pill and early termination
        for (const comp of components) if (isNull(comp)) return SYSTEM_ATOMS.Null;
        for (const comp of components) if (isFalse(comp)) return SYSTEM_ATOMS.False;

        // Filter and return simplified result
        const nonTrueComponents = components.filter(comp => !isTrue(comp));
        const count = nonTrueComponents.length;
        
        return count === 0 ? SYSTEM_ATOMS.True : 
               count === 1 ? nonTrueComponents[0] :
               new Term('compound', 'AND', nonTrueComponents, '&');
    }

    _reduceOr(components) {
        if (!components || components.length === 0) return SYSTEM_ATOMS.False;
        
        // Handle poison pill and early termination
        for (const comp of components) if (isNull(comp)) return SYSTEM_ATOMS.Null;
        for (const comp of components) if (isTrue(comp)) return SYSTEM_ATOMS.True;

        // Filter and return simplified result
        const nonFalseComponents = components.filter(comp => !isFalse(comp));
        const count = nonFalseComponents.length;
        
        return count === 0 ? SYSTEM_ATOMS.False :
               count === 1 ? nonFalseComponents[0] :
               new Term('compound', 'OR', nonFalseComponents, '|');
    }

    _reduceNegation(components) {
        if (!components || components.length === 0) return SYSTEM_ATOMS.Null;

        const operand = components[0];
        
        // Double negation elimination
        if (operand.isCompound && operand.operator === '--' && operand.components.length === 1) {
            return operand.components[0];
        }

        // Direct system atom reductions
        if (isTrue(operand)) return SYSTEM_ATOMS.False;
        if (isFalse(operand)) return SYSTEM_ATOMS.True;
        if (isNull(operand)) return SYSTEM_ATOMS.Null;

        // Reduce operand and check again
        const reducedOperand = this.reduce(operand);
        if (isTrue(reducedOperand)) return SYSTEM_ATOMS.False;
        if (isFalse(reducedOperand)) return SYSTEM_ATOMS.True;
        if (isNull(reducedOperand)) return SYSTEM_ATOMS.Null;

        return new Term('compound', 'NEGATION', [reducedOperand], '--');
    }

    _reduceImplication(components) {
        if (!components || components.length !== 2) return SYSTEM_ATOMS.Null;

        const [antecedent, consequent] = components;

        // Direct reductions for known values
        if (isNull(antecedent) || isNull(consequent)) return SYSTEM_ATOMS.Null;
        if (isFalse(antecedent) || isTrue(consequent)) return SYSTEM_ATOMS.True;
        if (isTrue(antecedent) && isFalse(consequent)) return SYSTEM_ATOMS.False;

        // Recursively reduce components
        const reducedAntecedent = this.reduce(antecedent);
        const reducedConsequent = this.reduce(consequent);

        // Return simplified term if any reduction occurred
        return (reducedAntecedent !== antecedent || reducedConsequent !== consequent)
            ? new Term('compound', 'IMPLICATION', [reducedAntecedent, reducedConsequent], '==>')
            : new Term('compound', 'IMPLICATION', [antecedent, consequent], '==>');
    }

    _reduceEquivalence(components) {
        if (!components || components.length !== 2) return SYSTEM_ATOMS.Null;

        const [left, right] = components;

        // Direct reductions for known values
        if (isNull(left) || isNull(right)) return SYSTEM_ATOMS.Null;
        if ((isTrue(left) && isTrue(right)) || (isFalse(left) && isFalse(right))) return SYSTEM_ATOMS.True;
        if ((isTrue(left) && isFalse(right)) || (isFalse(left) && isTrue(right))) return SYSTEM_ATOMS.False;

        // Recursively reduce components
        const reducedLeft = this.reduce(left);
        const reducedRight = this.reduce(right);

        // Return simplified term if any reduction occurred
        return (reducedLeft !== left || reducedRight !== right)
            ? new Term('compound', 'EQUIVALENCE', [reducedLeft, reducedRight], '<=>')
            : new Term('compound', 'EQUIVALENCE', [left, right], '<=>');
    }

    cascadeReduce(term) {
        if (!term) return SYSTEM_ATOMS.Null;
        
        const reducedTerm = term.isCompound 
            ? new Term(term.type, term.name, term.components.map(comp => this.cascadeReduce(comp)), term.operator)
            : term;

        return this.reduce(reducedTerm);
    }
}