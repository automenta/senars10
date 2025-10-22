import {Term} from '../term/Term.js';
import {SYSTEM_ATOMS, isNull, isTrue, isFalse} from './SystemAtoms.js';

export class BooleanReductionEngine {
    constructor() {
        this.reductionRules = this._initializeReductionRules();
    }

    _initializeReductionRules() {
        return {
            '&': (args) => this._reduceAnd(args),
            '|': (args) => this._reduceOr(args),
            '--': (args) => this._reduceNegation(args),
            '==>': (args) => this._reduceImplication(args),
            '<=>': (args) => this._reduceEquivalence(args)
        };
    }

    reduce(term) {
        if (!term) return SYSTEM_ATOMS.Null;
        if (!term.isCompound) return term;

        if (this.reductionRules[term.operator]) {
            try {
                const reducedResult = this.reductionRules[term.operator](term.components);
                if (reducedResult) return reducedResult;
            } catch (error) {
                console.error(`Error during reduction of term ${term}: ${error.message}`);
                return SYSTEM_ATOMS.Null;
            }
        }

        const reducedComponents = term.components.map(comp => this.reduce(comp));
        
        if (reducedComponents.some((comp, idx) => comp !== term.components[idx])) {
            try {
                return new Term(term.type, term.name, reducedComponents, term.operator);
            } catch (error) {
                console.error(`Error creating reduced term: ${error.message}`);
                return SYSTEM_ATOMS.Null;
            }
        }

        return term;
    }

    _reduceAnd(components) {
        if (!components || components.length === 0) return SYSTEM_ATOMS.True;

        for (const comp of components) if (isNull(comp)) return SYSTEM_ATOMS.Null;
        for (const comp of components) if (isFalse(comp)) return SYSTEM_ATOMS.False;

        const nonTrueComponents = components.filter(comp => !isTrue(comp));
        const len = nonTrueComponents.length;

        if (len === 0) return SYSTEM_ATOMS.True;
        if (len === 1) return nonTrueComponents[0];
        return new Term('compound', 'AND', nonTrueComponents, '&');
    }

    _reduceOr(components) {
        if (!components || components.length === 0) return SYSTEM_ATOMS.False;

        for (const comp of components) if (isNull(comp)) return SYSTEM_ATOMS.Null;
        for (const comp of components) if (isTrue(comp)) return SYSTEM_ATOMS.True;

        const nonFalseComponents = components.filter(comp => !isFalse(comp));
        const len = nonFalseComponents.length;

        if (len === 0) return SYSTEM_ATOMS.False;
        if (len === 1) return nonFalseComponents[0];
        return new Term('compound', 'OR', nonFalseComponents, '|');
    }

    _reduceNegation(components) {
        if (!components || components.length === 0) return SYSTEM_ATOMS.Null;

        const operand = components[0];

        if (operand.isCompound && operand.operator === '--' && operand.components.length === 1) {
            return operand.components[0];
        }

        if (isTrue(operand)) return SYSTEM_ATOMS.False;
        if (isFalse(operand)) return SYSTEM_ATOMS.True;
        if (isNull(operand)) return SYSTEM_ATOMS.Null;

        const reducedOperand = this.reduce(operand);
        
        if (isTrue(reducedOperand)) return SYSTEM_ATOMS.False;
        if (isFalse(reducedOperand)) return SYSTEM_ATOMS.True;
        if (isNull(reducedOperand)) return SYSTEM_ATOMS.Null;

        return new Term('compound', 'NEGATION', [reducedOperand], '--');
    }

    _reduceImplication(components) {
        if (!components || components.length !== 2) return SYSTEM_ATOMS.Null;

        const [antecedent, consequent] = components;

        if (isNull(antecedent) || isNull(consequent)) return SYSTEM_ATOMS.Null;
        if (isFalse(antecedent)) return SYSTEM_ATOMS.True;
        if (isTrue(consequent)) return SYSTEM_ATOMS.True;
        if (isTrue(antecedent) && isFalse(consequent)) return SYSTEM_ATOMS.False;

        const reducedAntecedent = this.reduce(antecedent);
        const reducedConsequent = this.reduce(consequent);

        if (reducedAntecedent !== antecedent || reducedConsequent !== consequent) {
            return new Term('compound', 'IMPLICATION', [reducedAntecedent, reducedConsequent], '==>');
        }

        return new Term('compound', 'IMPLICATION', [antecedent, consequent], '==>');
    }

    _reduceEquivalence(components) {
        if (!components || components.length !== 2) return SYSTEM_ATOMS.Null;

        const [left, right] = components;

        if (isNull(left) || isNull(right)) return SYSTEM_ATOMS.Null;
        if ((isTrue(left) && isTrue(right)) || (isFalse(left) && isFalse(right))) return SYSTEM_ATOMS.True;
        if ((isTrue(left) && isFalse(right)) || (isFalse(left) && isTrue(right))) return SYSTEM_ATOMS.False;

        const reducedLeft = this.reduce(left);
        const reducedRight = this.reduce(right);

        if (reducedLeft !== left || reducedRight !== right) {
            return new Term('compound', 'EQUIVALENCE', [reducedLeft, reducedRight], '<=>');
        }

        return new Term('compound', 'EQUIVALENCE', [left, right], '<=>');
    }

    cascadeReduce(term) {
        if (!term) return SYSTEM_ATOMS.Null;

        const reducedTerm = term.isCompound ? 
            new Term(term.type, term.name, term.components.map(comp => this.cascadeReduce(comp)), term.operator) :
            term;

        return this.reduce(reducedTerm);
    }
}